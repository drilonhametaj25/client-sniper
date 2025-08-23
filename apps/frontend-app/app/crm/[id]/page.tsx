/**
 * Pagina dettaglio lead CRM - Vista completa per gestione lead individuali
 * Permette agli utenti PRO di gestire completamente un singolo lead con:
 * - Timeline attività e commenti
 * - Upload e gestione allegati
 * - Modifica stato e note
 * - Analisi tecnica dettagliata
 * - Cronologia modifiche
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ToastProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { isProOrHigher } from '@/lib/utils/plan-helpers';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Globe,
  Phone,
  Mail,
  MapPin,
  Building,
  TrendingUp,
  FileText,
  Upload,
  Download,
  Trash2,
  MessageSquare,
  Activity,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  RotateCcw
} from 'lucide-react';

// Tipi TypeScript
interface CrmLead {
  id: string;
  lead_id: string;
  status: string;
  note: string | null;
  follow_up_date: string | null;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  lead_business_name: string;
  lead_website_url: string;
  lead_city: string;
  lead_category: string;
  lead_score: number;
  lead_analysis: any;
  lead_phone?: string;
  lead_email?: string;
  lead_address?: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  type: 'comment' | 'status_change' | 'follow_up' | 'attachment';
  metadata?: any;
}

const STATUS_CONFIG = {
  to_contact: { label: 'Da Contattare', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200', icon: Phone },
  in_negotiation: { label: 'In Negoziazione', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200', icon: TrendingUp },
  closed_positive: { label: 'Chiuso Positivo', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200', icon: CheckCircle },
  closed_negative: { label: 'Chiuso Negativo', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200', icon: XCircle },
  on_hold: { label: 'In Pausa', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200', icon: Pause },
  follow_up: { label: 'Follow-up', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200', icon: RotateCcw }
};

export default function CrmLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { success, error: showError } = useToast();
  const { actualTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();

  // Stati componente
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  
  // Form data per modifica
  const [formData, setFormData] = useState({
    status: '',
    note: '',
    follow_up_date: null as Date | null
  });

  // Verifica piano e carica dati
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isProOrHigher(user.plan || '')) {
      console.error('❌ Access denied - Plan not Pro or higher:', user.plan);
      showError('Accesso Limitato', 'Il CRM è disponibile solo per utenti con piano PRO o AGENCY');
      router.push('/upgrade');
      return;
    }

    if (user.status === 'inactive') {
      console.error('❌ Access denied - Plan inactive');
      showError('Piano Disattivato', 'Il tuo piano è temporaneamente disattivato. Riattivalo per accedere al CRM');
      router.push('/settings');
      return;
    }

    if (leadId) {
      loadLeadData();
      loadComments();
    }
  }, [leadId, authLoading, user]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        showError("Sessione non valida");
        return;
      }

      const response = await fetch(`/api/crm/${leadId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLead(data);
        setFormData({
          status: data.status,
          note: data.note || '',
          follow_up_date: data.follow_up_date ? new Date(data.follow_up_date) : null
        });
      } else {
        // Gestione errori migliorata
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          
          if (response.status === 403) {
            if (errorData.error === 'Piano PRO richiesto') {
              showError(errorData.message || 'Il CRM richiede un piano PRO');
              router.push('/upgrade');
              return;
            } else if (errorData.error === 'Piano disattivato') {
              showError(errorData.message || 'Il tuo piano è disattivato');
              router.push('/settings');
              return;
            }
          }
          
          showError(errorData.message || "Impossibile caricare i dati del lead");
        } catch (parseError) {
          showError("Impossibile caricare i dati del lead");
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento lead:', error);
      showError("Errore nel caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`/api/crm/${leadId}/comments`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento commenti:', error);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        showError("Sessione non valida");
        return;
      }

      const response = await fetch('/api/crm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          status: formData.status,
          note: formData.note,
          follow_up_date: formData.follow_up_date?.toISOString()
        })
      });

      if (response.ok) {
        success("Lead aggiornato con successo");
        setIsEditing(false);
        loadLeadData();
        loadComments();
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      showError("Impossibile salvare le modifiche");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`/api/crm/${leadId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          content: newComment,
          type: 'comment'
        })
      });

      if (response.ok) {
        setNewComment('');
        loadComments();
        success("Commento aggiunto");
      }
    } catch (error) {
      console.error('Errore aggiunta commento:', error);
      showError("Impossibile aggiungere il commento");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFile(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('lead_id', leadId);

      const response = await fetch(`/api/crm/${leadId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (response.ok) {
        loadLeadData();
        loadComments();
        success("File caricato con successo");
      }
    } catch (error) {
      console.error('Errore upload file:', error);
      showError("Impossibile caricare il file");
    } finally {
      setIsUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`/api/crm/${leadId}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        loadLeadData();
        success("Allegato eliminato");
      }
    } catch (error) {
      console.error('Errore eliminazione allegato:', error);
      showError("Impossibile eliminare l'allegato");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`/api/crm/${leadId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        loadComments();
        success("Commento eliminato");
      }
    } catch (error) {
      console.error('Errore eliminazione commento:', error);
      showError("Impossibile eliminare il commento");
    }
  };

  const handleQuickAction = async (action: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      let updateData: any = {};
      let commentContent = '';

      switch (action) {
        case 'mark_contacted':
          updateData = { status: 'in_negotiation' };
          commentContent = 'Lead contattato e in fase di negoziazione';
          break;
        case 'mark_closed_positive':
          updateData = { status: 'closed_positive' };
          commentContent = 'Lead chiuso positivamente - cliente acquisito';
          break;
        case 'mark_closed_negative':
          updateData = { status: 'closed_negative' };
          commentContent = 'Lead chiuso negativamente - cliente non interessato';
          break;
        case 'set_follow_up':
          const followUpDate = new Date();
          followUpDate.setDate(followUpDate.getDate() + 7);
          updateData = { 
            status: 'follow_up',
            follow_up_date: followUpDate.toISOString()
          };
          commentContent = 'Impostato follow-up per la prossima settimana';
          break;
        default:
          return;
      }

      // Aggiorna stato
      const response = await fetch(`/api/crm/${leadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Aggiungi commento automatico
        await fetch(`/api/crm/${leadId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            content: commentContent,
            type: 'status_change'
          })
        });

        loadLeadData();
        loadComments();
        success("Azione eseguita con successo");
      }
    } catch (error) {
      console.error('Errore azione rapida:', error);
      showError("Impossibile eseguire l'azione");
    }
  };

  const getStatusIcon = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    const Icon = config?.icon || Phone;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    return (
      <Badge variant="default" className={config?.color || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}>
        {getStatusIcon(status)}
        <span className="ml-1">{config?.label || status}</span>
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return 'text-red-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
        <Card className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Lead non trovato</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Il lead richiesto non è disponibile o non hai i permessi per visualizzarlo.</p>
          <Button onClick={() => router.push('/crm')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna al CRM
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={() => router.push('/crm')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna al CRM
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{lead.lead_business_name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{lead.lead_category} • {lead.lead_city}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(lead.status)}
          <Button
            variant={isEditing ? 'primary' : 'secondary'}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salva
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Modifica
              </>
            )}
          </Button>
          {isEditing && (
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Layout principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonna principale */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Informazioni lead */}
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Informazioni Lead</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-sm">
                <Globe className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <a 
                  href={lead.lead_website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {lead.lead_website_url}
                  <ExternalLink className="w-3 h-3 ml-1 inline" />
                </a>
              </div>
              {lead.lead_phone && (
                <div className="flex items-center text-sm">
                  <Phone className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                  <a href={`tel:${lead.lead_phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {lead.lead_phone}
                  </a>
                </div>
              )}
              {lead.lead_email && (
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                  <a href={`mailto:${lead.lead_email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {lead.lead_email}
                  </a>
                </div>
              )}
              <div className="flex items-center text-sm">
                <MapPin className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{lead.lead_address || lead.lead_city}</span>
              </div>
              <div className="flex items-center text-sm">
                <Building className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{lead.lead_category}</span>
              </div>
              <div className="flex items-center text-sm">
                <TrendingUp className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span className={`font-semibold ${getScoreColor(lead.lead_score)}`}>
                  Punteggio: {lead.lead_score}/100
                </span>
              </div>
            </div>
          </Card>

          {/* Modifica stato e note */}
          {isEditing && (
            <Card>
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Modifica Lead</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stato</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                  <textarea
                    placeholder="Inserisci le tue note..."
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Follow-up</label>
                  <input
                    type="date"
                    value={formData.follow_up_date ? formData.follow_up_date.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null;
                      setFormData({...formData, follow_up_date: date});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Timeline e commenti */}
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Timeline e Commenti</h2>
            
            {/* Aggiungi commento */}
            <div className="mb-6">
              <div className="flex space-x-3">
                <textarea
                  placeholder="Aggiungi un commento..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Lista commenti */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nessun commento ancora</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{comment.content}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => handleDeleteComment(comment.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Azioni rapide */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Azioni Rapide</h3>
            <div className="space-y-2">
              {lead.lead_phone && (
                <Button variant="secondary" className="w-full justify-start" onClick={() => handleQuickAction('mark_contacted')}>
                  <Phone className="w-4 h-4 mr-2" />
                  Chiama
                </Button>
              )}
              {lead.lead_email && (
                <Button variant="secondary" className="w-full justify-start" onClick={() => handleQuickAction('mark_closed_positive')}>
                  <Mail className="w-4 h-4 mr-2" />
                  Invia Email
                </Button>
              )}
              <Button variant="secondary" className="w-full justify-start" onClick={() => handleQuickAction('set_follow_up')}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Pianifica Appuntamento
              </Button>
            </div>
          </Card>

          {/* Allegati */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Allegati</h3>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploadingFile}
                />
                <Button variant="secondary" disabled={isUploadingFile}>
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingFile ? 'Caricando...' : 'Carica'}
                </Button>
              </label>
            </div>
            
            {lead.attachments && lead.attachments.length > 0 ? (
              <div className="space-y-2">
                {lead.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{attachment.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="secondary" size="sm">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDeleteAttachment(attachment.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun allegato</p>
            )}
          </Card>

          {/* Analisi tecnica */}
          {lead.lead_analysis && (
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Analisi Tecnica</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Punteggio complessivo:</span>
                  <span className={`font-semibold ${getScoreColor(lead.lead_score)}`}>
                    {lead.lead_score}/100
                  </span>
                </div>
                {lead.lead_analysis.seo_issues && (
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Problemi SEO:</span>
                    <ul className="mt-1 space-y-1">
                      {lead.lead_analysis.seo_issues.map((issue: string, index: number) => (
                        <li key={index} className="text-gray-600 dark:text-gray-400 text-xs">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {lead.lead_analysis.performance_issues && (
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Problemi Performance:</span>
                    <ul className="mt-1 space-y-1">
                      {lead.lead_analysis.performance_issues.map((issue: string, index: number) => (
                        <li key={index} className="text-gray-600 dark:text-gray-400 text-xs">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Statistiche */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Statistiche</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Creato:</span>
                <span className="text-gray-900 dark:text-gray-100">{formatDate(lead.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Ultimo aggiornamento:</span>
                <span className="text-gray-900 dark:text-gray-100">{formatDate(lead.updated_at)}</span>
              </div>
              {lead.follow_up_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Follow-up:</span>
                  <span className={new Date(lead.follow_up_date) < new Date() ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}>
                    {formatDate(lead.follow_up_date)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
