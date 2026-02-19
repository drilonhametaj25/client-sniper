/**
 * Pagina CRM Personale - Sistema di gestione lead per utenti PRO
 * Permette agli utenti PRO di gestire i lead sbloccati con note, stati, follow-up e allegati
 * Integrato con il sistema di analisi lead e gestione crediti
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ToastProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { isStarterOrHigher } from '@/lib/utils/plan-helpers';
import { TourTarget } from '@/components/onboarding/TourTarget';
import CRMKanban from '@/components/CRMKanban';
import CRMStatsHeader from '@/components/CRMStatsHeader';
import CRMLeadSidebar from '@/components/CRMLeadSidebar';
import {
  Search,
  Plus,
  Edit,
  Calendar as CalendarIcon,
  Paperclip,
  Phone,
  Mail,
  Globe,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  RotateCcw,
  Filter,
  Lock,
  LayoutList,
  LayoutGrid
} from 'lucide-react';

// Tipi per TypeScript
interface CrmEntry {
  id: string;
  lead_id: string;
  status: string;
  note: string | null;
  follow_up_date: string | null;
  lead_business_name: string;
  lead_website_url: string;
  lead_city: string;
  lead_category: string;
  lead_score: number;
  // Campi opzionali
  attachments?: any[];
  created_at?: string;
  updated_at?: string;
  lead_analysis?: any;
  // Proposte servizi
  proposals_count?: number;
  proposals_value?: number;
}

interface CrmStats {
  total_entries: number;
  to_contact: number;
  in_negotiation: number;
  closed_positive: number;
  closed_negative: number;
  on_hold: number;
  follow_up: number;
  overdue_follow_ups: number;
}

const STATUS_CONFIG = {
  to_contact: { label: 'Da Contattare', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200', icon: Phone },
  in_negotiation: { label: 'In Negoziazione', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200', icon: TrendingUp },
  closed_positive: { label: 'Chiuso Positivo', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200', icon: CheckCircle },
  closed_negative: { label: 'Chiuso Negativo', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200', icon: XCircle },
  on_hold: { label: 'In Pausa', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200', icon: Pause },
  follow_up: { label: 'Follow-up', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200', icon: RotateCcw }
};

export default function CrmPage() {
  const [entries, setEntries] = useState<CrmEntry[]>([]);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<CrmEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarEntry, setSidebarEntry] = useState<CrmEntry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    // Recupera preferenza da localStorage se disponibile
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('crm-view-mode') as 'list' | 'kanban') || 'kanban';
    }
    return 'kanban';
  });
  const [formData, setFormData] = useState({
    status: '',
    note: '',
    follow_up_date: null as Date | null
  });
  const { success, error } = useToast();
  const { actualTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Salva preferenza vista in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm-view-mode', viewMode);
    }
  }, [viewMode]);

  // Verifica piano e stato prima di procedere
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      error('Errore Autenticazione', 'Devi effettuare il login per accedere al CRM');
      return;
    }

    console.log('🔍 CRM Auth Debug:', {
      plan: user.plan,
      status: user.status,
      isStarterOrHigher: isStarterOrHigher(user.plan || ''),
      userId: user.id
    });

    if (!isStarterOrHigher(user.plan || '')) {
      error('Accesso Limitato', 'Il CRM è disponibile solo per utenti con piano Starter o Agency');
      return;
    }

    if (user.status === 'inactive') {
      error('Piano Disattivato', 'Il tuo piano è temporaneamente disattivato. Riattivalo per accedere al CRM');
      return;
    }

    loadCrmData();
  }, [authLoading, user]);

  // Carica dati CRM
  const loadCrmData = async () => {
    try {
      setLoading(true);
      
      // Ottieni la sessione per il token
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        error('Errore Autenticazione', 'Sessione non valida');
        return;
      }

      const response = await fetch('/api/crm', {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        setEntries(data.entries || data);
        
        // Se ci sono statistiche nella risposta, usale, altrimenti calcola dal client
        if (data.stats) {
          // Le statistiche dall'API sono un array, prendiamo il primo elemento
          const statsData = Array.isArray(data.stats) ? data.stats[0] : data.stats;
          setStats(statsData);
        } else {
          const stats = calculateStats(data.entries || data);
          setStats(stats);
        }
      } else {
        console.error('CRM API Error:', response.status, response.statusText);
        
        // Prova a leggere la risposta JSON per ottenere dettagli dell'errore
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          
          if (response.status === 403) {
            if (errorData.error === 'Piano PRO richiesto') {
              error('Piano Insufficiente', errorData.message || 'Il CRM richiede un piano PRO');
              return;
            } else if (errorData.error === 'Piano disattivato') {
              error('Piano Disattivato', errorData.message || 'Il tuo piano è disattivato');
              return;
            } else if (errorData.error === 'Piano cancellato') {
              error('Piano Cancellato', errorData.message || 'Il tuo piano è stato cancellato');
              return;
            }
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}`);
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}`);
        }
      }
    } catch (err) {
      console.error('Errore nel caricamento dati CRM:', err);
      error('Errore Caricamento', 'Impossibile caricare i dati CRM');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries: CrmEntry[]): CrmStats => {
    const stats = {
      total_entries: entries.length,
      to_contact: 0,
      in_negotiation: 0,
      closed_positive: 0,
      closed_negative: 0,
      on_hold: 0,
      follow_up: 0,
      overdue_follow_ups: 0
    };

    entries.forEach(entry => {
      switch (entry.status) {
        case 'to_contact':
          stats.to_contact++;
          break;
        case 'in_negotiation':
          stats.in_negotiation++;
          break;
        case 'closed_positive':
          stats.closed_positive++;
          break;
        case 'closed_negative':
          stats.closed_negative++;
          break;
        case 'on_hold':
          stats.on_hold++;
          break;
        case 'follow_up':
          stats.follow_up++;
          break;
      }

      if (entry.follow_up_date && new Date(entry.follow_up_date) < new Date()) {
        stats.overdue_follow_ups++;
      }
    });

    return stats;
  };

  // Filtra entries in base a ricerca e filtro stato
  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (entry.lead_business_name || '').toLowerCase().includes(searchLower) ||
      (entry.lead_website_url || '').toLowerCase().includes(searchLower) ||
      (entry.lead_city || '').toLowerCase().includes(searchLower) ||
      (entry.lead_category || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEditEntry = (entry: CrmEntry) => {
    setSelectedEntry(entry);
    setFormData({
      status: entry.status,
      note: entry.note || '',
      follow_up_date: entry.follow_up_date ? new Date(entry.follow_up_date) : null
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedEntry) return;

    try {
      // Ottieni la sessione per il token
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        error('Errore Autenticazione', 'Sessione non valida');
        return;
      }

      const response = await fetch('/api/crm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: selectedEntry.lead_id,
          status: formData.status,
          note: formData.note,
          follow_up_date: formData.follow_up_date?.toISOString()
        })
      });

      if (response.ok) {
        success('Successo', 'Entry CRM aggiornata con successo');
        setIsEditModalOpen(false);
        loadCrmData();
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (err) {
      console.error('Errore nel salvataggio:', err);
      error('Errore Salvataggio', 'Impossibile salvare le modifiche');
    }
  };

  // Handler per cambio status da Kanban drag-and-drop
  const handleKanbanStatusChange = async (entryId: string, newStatus: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        error('Errore Autenticazione', 'Sessione non valida');
        return;
      }

      // Trova l'entry per ottenere il lead_id
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      const response = await fetch('/api/crm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: entry.lead_id,
          status: newStatus
        })
      });

      if (response.ok) {
        // Aggiorna localmente per feedback immediato
        setEntries(prev => prev.map(e =>
          e.id === entryId ? { ...e, status: newStatus } : e
        ));
        // Ricalcola stats
        const updatedEntries = entries.map(e =>
          e.id === entryId ? { ...e, status: newStatus } : e
        );
        setStats(calculateStats(updatedEntries));
        success('Stato Aggiornato', `Lead spostato in "${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}"`);
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (err) {
      console.error('Errore cambio stato Kanban:', err);
      error('Errore', 'Impossibile aggiornare lo stato');
      // Ricarica per ripristinare stato corretto
      loadCrmData();
    }
  };

  // Handler per click su card Kanban - apre sidebar
  const handleKanbanEntryClick = (entry: CrmEntry) => {
    setSidebarEntry(entry);
    setIsSidebarOpen(true);
  };

  // Handler per salvare da sidebar
  const handleSidebarSave = async (entryId: string, data: { status: string; note: string; follow_up_date: string | null }) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        error('Errore Autenticazione', 'Sessione non valida');
        return;
      }

      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      const response = await fetch('/api/crm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: entry.lead_id,
          status: data.status,
          note: data.note,
          follow_up_date: data.follow_up_date
        })
      });

      if (response.ok) {
        // Aggiorna localmente
        setEntries(prev => prev.map(e =>
          e.id === entryId
            ? { ...e, status: data.status, note: data.note, follow_up_date: data.follow_up_date }
            : e
        ));
        // Ricalcola stats
        const updatedEntries = entries.map(e =>
          e.id === entryId
            ? { ...e, status: data.status, note: data.note, follow_up_date: data.follow_up_date }
            : e
        );
        setStats(calculateStats(updatedEntries));
        // Aggiorna anche entry nella sidebar
        setSidebarEntry(prev => prev ? { ...prev, status: data.status, note: data.note, follow_up_date: data.follow_up_date } : null);
        success('Salvato', 'Modifiche salvate con successo');
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (err) {
      console.error('Errore salvataggio sidebar:', err);
      error('Errore', 'Impossibile salvare le modifiche');
    }
  };

  // Handler per navigare al dettaglio da sidebar
  const handleViewDetail = (leadId: string) => {
    setIsSidebarOpen(false);
    router.push(`/crm/${leadId}`);
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

  const isOverdue = (followUpDate: string | null) => {
    if (!followUpDate) return false;
    return new Date(followUpDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Se il piano non è PRO o superiore, mostra messaggio di upgrade
  if (!user || !isStarterOrHigher(user.plan || '')) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-2xl mx-auto text-center">
          <div className="py-12">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              CRM Personale - Piano Starter o superiore
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Il sistema CRM è disponibile per gli utenti con piano Starter o Agency.
              Aggiorna il tuo piano per accedere a tutte le funzionalità di gestione lead.
            </p>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Il tuo piano attuale: <Badge variant="info">{user?.plan?.toUpperCase() || 'FREE'}</Badge>
              </p>
              <Button onClick={() => window.location.href = '/upgrade'}>
                Aggiorna a Piano Starter
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Se il piano è disattivato, mostra messaggio di riattivazione
  if (user.status === 'inactive') {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-2xl mx-auto text-center">
          <div className="py-12">
            <Pause className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Piano Temporaneamente Disattivato
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Il tuo piano PRO è temporaneamente disattivato. Riattivalo per accedere al CRM.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              Riattiva Piano
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      <TourTarget tourId="crm-header" className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <h1 id="crm-header" className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">CRM Pipeline</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Toggle Vista - Touch friendly */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 sm:flex-none">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-2 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors min-h-[44px] ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden xs:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-2 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors min-h-[44px] ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden xs:inline">Lista</span>
            </button>
          </div>
          <Button onClick={loadCrmData} variant="secondary" className="min-h-[44px] px-3">
            <RotateCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Aggiorna</span>
          </Button>
        </div>
      </TourTarget>

      {/* Statistiche Dashboard */}
      <TourTarget tourId="crm-stats">
        <CRMStatsHeader stats={stats} entries={entries} />
      </TourTarget>

      {/* Filtri e Ricerca - Mobile friendly */}
      <TourTarget tourId="crm-filters" className="flex flex-col gap-2 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca lead..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10 min-h-[44px] text-base"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 min-h-[44px] text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tutti gli stati</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </TourTarget>

      {/* Vista Kanban o Lista */}
      <TourTarget tourId="crm-entries">
        {viewMode === 'kanban' ? (
          /* Vista Kanban */
          <div className="overflow-x-auto">
            {filteredEntries.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <LayoutGrid className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">Nessun lead nel tuo CRM</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Sblocca dei lead per iniziare a gestirli</p>
                </div>
              </Card>
            ) : (
              <CRMKanban
                entries={filteredEntries}
                onStatusChange={handleKanbanStatusChange}
                onEntryClick={handleKanbanEntryClick}
              />
            )}
          </div>
        ) : (
          /* Vista Lista */
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Nessun lead trovato nel tuo CRM</p>
                </div>
              </Card>
            ) : (
              filteredEntries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{entry.lead_business_name}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {getStatusBadge(entry.status)}
                        <Badge variant="info">
                          Punteggio: {entry.lead_score}/100
                        </Badge>
                        {entry.follow_up_date && (
                          <Badge variant={isOverdue(entry.follow_up_date) ? 'error' : 'info'}>
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {formatDate(entry.follow_up_date)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/crm/${entry.lead_id}`)}
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Dettaglio
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifica
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Globe className="w-4 h-4 mr-2" />
                      {entry.lead_website_url}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">📍</span>
                      {entry.lead_city}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">🏢</span>
                      {entry.lead_category}
                    </div>
                  </div>

                  {entry.note && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{entry.note}</p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
      </TourTarget>

      {/* Modal Modifica Entry - Mobile optimized */}
      {isEditModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b border-gray-200 dark:border-gray-700 mb-4">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Modifica Lead CRM</h2>
            </div>
            <div className="space-y-4 pb-safe">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stato</label>
                <select
                  value={formData.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2.5 min-h-[44px] text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, note: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Follow-up</label>
                <input
                  type="date"
                  value={formData.follow_up_date ? formData.follow_up_date.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setFormData({...formData, follow_up_date: date});
                  }}
                  className="w-full px-3 py-2.5 min-h-[44px] text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto min-h-[44px]">
                  Annulla
                </Button>
                <Button onClick={handleSaveEntry} className="w-full sm:w-auto min-h-[44px]">
                  Salva
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Sidebar Dettaglio Lead */}
      <CRMLeadSidebar
        entry={sidebarEntry}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSave={handleSidebarSave}
        onViewDetail={handleViewDetail}
      />
    </div>
  );
}
