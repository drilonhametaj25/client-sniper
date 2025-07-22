/*
 * Tipi TypeScript per il sistema CRM integrato
 * 
 * Definisce le interfacce per la gestione dello stato CRM dei lead,
 * permettendo agli utenti PRO di tracciare il progresso delle trattative
 * direttamente dalla dashboard dei lead.
 * 
 * Usato da: dashboard lead, API CRM, componenti badge
 */

export type CRMStatusType = 'new' | 'contacted' | 'in_negotiation' | 'won' | 'lost';

export interface CRMStatus {
  leadId: string;
  status: CRMStatusType;
  lastContactDate?: Date | string;
  nextFollowUp?: Date | string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LeadWithCRM {
  id: string;
  business_name: string;
  website_url: string;
  city: string;
  category: string;
  score: number;
  analysis: any;
  created_at: string;
  assigned_to?: string;
  // Campi CRM per utenti PRO
  crm_status?: CRMStatusType;
  last_contact_date?: string;
  next_follow_up?: string;
  crm_notes?: string;
}

export interface CRMQuickUpdateRequest {
  leadId: string;
  status: CRMStatusType;
  notes?: string;
}

export interface CRMQuickUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    leadId: string;
    status: CRMStatusType;
    updatedAt: string;
  };
}

// Configurazione stati CRM per UI
export const CRM_STATUS_CONFIG = {
  new: {
    label: 'Nuovo',
    color: 'bg-blue-100 text-blue-800',
    icon: '🆕',
    description: 'Lead appena assegnato'
  },
  contacted: {
    label: 'Contattato',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '📞',
    description: 'Primo contatto effettuato'
  },
  in_negotiation: {
    label: 'In Trattativa',
    color: 'bg-purple-100 text-purple-800',
    icon: '💼',
    description: 'Negoziazione in corso'
  },
  won: {
    label: 'Acquisito',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
    description: 'Cliente acquisito'
  },
  lost: {
    label: 'Perso',
    color: 'bg-red-100 text-red-800',
    icon: '❌',
    description: 'Opportunità persa'
  }
} as const;
