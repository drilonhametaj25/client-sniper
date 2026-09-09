// Tipi condivisi del sistema di FEEDBACK.
//
// ⚠️ Cosa è successo qui (settembre 2026): questo file dichiarava di contenere
// "i tipi condivisi tra tutti i moduli", ma in pratica il motore di scraping non
// ne importa nulla e il frontend ne usa SOLO i tipi Feedback* (5 file, via il
// percorso relativo @/../../libs/types). Tutto il resto era una copia stantia e
// CONTRADDITTORIA delle fonti di verità reali:
//   - PLANS_CONFIG: prezzi e crediti sbagliati (Starter 50 crediti a 29 EUR,
//     Pro 200 a 79 EUR, Agency assente). La verità sui piani è la tabella
//     `plans`, servita da /api/plans/public.
//   - SCORE_RANGES: etichette con la semantica invertita rispetto
//     all'opportunity score v2. La semantica dello score vive in
//     apps/frontend-app/lib/utils/opportunity.ts.
//   - User/Plan/Lead/LeadAnalysis: enum dei piani senza le varianti
//     _monthly/_annual/agency e `Lead.assigned_to` obbligatorio su un modello
//     che il prodotto dichiara NON assegnato.
//   - onboarding.ts: tipi del sistema di tour guidati, rimosso dal prodotto
//     (importava react-joyride, dipendenza eliminata).
// Erano tutti privi di importatori: rimossi invece di essere aggiornati.

// ===== Feedback System Types =====

export interface FeedbackReport {
  id: string;
  user_id?: string;
  email?: string;
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  title?: string;
  is_public?: boolean;
  upvotes?: number;
  downvotes?: number;
  created_at: string;
  status: 'open' | 'in_review' | 'closed';
  response?: string;
  admin_note?: string;
  user_agent?: string;
  ip_address?: string;
  page_url?: string;
}

export interface FeedbackSubmissionData {
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface FeedbackStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  lastWeek: number;
}

// Tipi per il sistema di feedback pubblico esteso
export interface PublicFeedback {
  id: string;
  title: string;
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  has_admin_response: boolean;
  user_vote?: 'up' | 'down' | null;
}

export interface FeedbackDetails extends PublicFeedback {
  admin_response?: string;
}

export interface FeedbackVote {
  id: string;
  feedback_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface FeedbackAbuseReport {
  id: string;
  feedback_id: string;
  reporter_user_id: string;
  reason: string;
  created_at: string;
}

// Tipo per i feedback dell'utente nella dashboard personale
export interface UserFeedback {
  id: string;
  title: string | null;
  type: 'bug' | 'suggestion' | 'contact' | 'other';
  message: string;
  is_public: boolean;
  status: 'open' | 'in_review' | 'closed';
  response: string | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
}

// Estensione del tipo FeedbackSubmissionData esistente
export interface FeedbackSubmissionDataExtended extends FeedbackSubmissionData {
  title?: string;
  isPublic?: boolean;
}
