/**
 * LeadOpportunitySummary
 * Riepilogo "opportunità di vendita" mostrato in cima al dettaglio lead.
 *
 * Trasforma i dati tecnici grezzi in una sintesi leggibile in 5 secondi:
 * - perché questo lead è un'opportunità (i 2-3 problemi principali in linguaggio di vendita)
 * - quanto può valere il progetto (stima)
 * - quanto sono affidabili i dati (badge di confidenza)
 *
 * Volutamente difensivo: funziona anche su lead legacy senza analisi moderna.
 */

"use client";

import { AlertTriangle, Euro, ShieldCheck, ShieldAlert } from "lucide-react";

interface OpportunityLead {
  business_name: string;
  city?: string;
  category?: string;
  score?: number;
  issues?: string[];
  confidence_score?: number;
  website_url?: string;
  website_analysis?: any;
  analysis?: any;
}

// Traduce un problema tecnico in un "angolo di vendita" comprensibile.
const SALES_ANGLES: { match: RegExp; label: string; service: string }[] = [
  { match: /non accessibile|offline|sito.*assente/i, label: "Sito non raggiungibile o assente", service: "nuovo sito web" },
  { match: /title/i, label: "Non ottimizzato per Google (manca il titolo SEO)", service: "SEO" },
  { match: /meta description/i, label: "Scheda Google poco attraente (manca la descrizione)", service: "SEO" },
  { match: /tracciamento|tracking|analytics/i, label: "Non misura visite e conversioni", service: "tracciamento & ads" },
  { match: /consenso|gdpr|cookie/i, label: "Possibile non conformità GDPR sui cookie", service: "compliance" },
  { match: /mobile/i, label: "Esperienza scadente da smartphone", service: "restyling responsive" },
  { match: /prestazioni|performance|lento|slow/i, label: "Sito lento: perde visitatori", service: "ottimizzazione performance" },
  { match: /h1/i, label: "Struttura dei contenuti non ottimizzata", service: "SEO on-page" },
  { match: /https|ssl|sicurezza|security/i, label: "Problemi di sicurezza/HTTPS", service: "sicurezza" },
  { match: /immagini|images/i, label: "Immagini non ottimizzate", service: "ottimizzazione media" },
];

function deriveTopIssues(lead: OpportunityLead): string[] {
  const a = lead.website_analysis;
  const raw: string[] = [];
  if (a?.issues) {
    raw.push(...(a.issues.critical || []), ...(a.issues.high || []), ...(a.issues.medium || []));
  }
  if (raw.length === 0 && Array.isArray(lead.issues)) raw.push(...lead.issues);

  const angles: string[] = [];
  for (const issue of raw) {
    const angle = SALES_ANGLES.find((s) => s.match.test(issue));
    const text = angle ? angle.label : issue;
    if (!angles.includes(text)) angles.push(text);
    if (angles.length >= 3) break;
  }
  return angles;
}

function estimateValue(lead: OpportunityLead): string {
  const a = lead.website_analysis;
  const accessible = a?.isAccessible !== false;
  if (!accessible) return "€2.500 – €6.000";
  const score = typeof lead.score === "number" ? lead.score : 60;
  if (score < 30) return "€2.000 – €5.000";
  if (score < 50) return "€1.500 – €3.000";
  if (score < 70) return "€800 – €2.000";
  return "€500 – €1.200";
}

function confidenceLevel(score?: number): { label: string; tone: "high" | "medium" } {
  // I lead a confidenza < 60 sono in quarantena e non arrivano in lista; qui mostriamo
  // comunque il livello per trasparenza su quelli già sbloccati.
  if ((score ?? 100) >= 80) return { label: "Dati affidabili", tone: "high" };
  return { label: "Dati da verificare", tone: "medium" };
}

export default function LeadOpportunitySummary({ lead }: { lead: OpportunityLead }) {
  const topIssues = deriveTopIssues(lead);
  const value = estimateValue(lead);
  const conf = confidenceLevel(lead.confidence_score);

  return (
    <div className="mb-6 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
            Perché è un'opportunità
          </p>
          {topIssues.length > 0 ? (
            <ul className="space-y-1.5">
              {topIssues.map((issue, i) => (
                <li key={i} className="flex items-start text-sm text-gray-800 dark:text-gray-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analisi tecnica disponibile più in basso.
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
              <Euro className="h-4 w-4 mr-1" />
              {value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">valore stimato progetto</div>
          </div>

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              conf.tone === "high"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {conf.tone === "high" ? (
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            )}
            {conf.label}
          </span>
        </div>
      </div>
    </div>
  );
}
