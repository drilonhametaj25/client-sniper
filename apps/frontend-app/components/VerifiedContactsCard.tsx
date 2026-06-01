/**
 * VerifiedContactsCard — la sezione "tipo Apollo" del dettaglio lead.
 * Mostra contatti verificati + dati azienda ottenuti on-demand:
 *  - Email con livello di confidenza (Verificata / Probabile / Da verificare / Non valida)
 *  - Telefono
 *  - Età dominio, registrar, provider email, stato MX
 *
 * Carica i dati da /api/leads/[id]/enrich (funziona su qualsiasi lead, anche storici).
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Mail, Phone, ShieldCheck, ShieldAlert, ShieldX, Building2,
  CalendarClock, Server, Copy, Check, Loader2, RefreshCw,
} from "lucide-react";

type EmailConfidence = "verified" | "probable" | "risky" | "invalid";

interface VerifiedEmail {
  email: string;
  confidence: EmailConfidence;
  source: "site" | "inferred";
  isRole: boolean;
  isDisposable: boolean;
  mxValid: boolean;
  smtp?: "accepted" | "rejected" | "unknown";
  reasons: string[];
}

interface EnrichmentResult {
  domain: string;
  domainCreatedAt?: string;
  domainAgeYears?: number;
  registrar?: string;
  hasMxRecords: boolean;
  mxHosts: string[];
  emailProvider?: string;
  emails: VerifiedEmail[];
}

const CONF: Record<EmailConfidence, { label: string; cls: string; Icon: any }> = {
  verified: { label: "Verificata", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", Icon: ShieldCheck },
  probable: { label: "Probabile", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", Icon: ShieldCheck },
  risky: { label: "Rischiosa", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", Icon: ShieldAlert },
  invalid: { label: "Non valida", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", Icon: ShieldX },
};

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      title="Copia"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function VerifiedContactsCard({ leadId, phone }: { leadId: string; phone?: string }) {
  const [data, setData] = useState<EnrichmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { setError("Sessione scaduta"); setLoading(false); return; }
      const res = await fetch(`/api/leads/${leadId}/enrich`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore");
      setData(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [leadId]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Building2 className="h-5 w-5 mr-2 text-indigo-600" />
          Contatti &amp; Dati Azienda
        </h2>
        <button onClick={load} disabled={loading} className="text-gray-400 hover:text-indigo-600 disabled:opacity-50" title="Aggiorna">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center text-sm text-gray-500 py-6 justify-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recupero dati pubblici…
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-amber-600 py-2">Impossibile arricchire: {error}</p>
      )}

      {!loading && !error && !data && (
        <p className="text-sm text-gray-500 py-2">Lead senza sito web: dati azienda non disponibili.</p>
      )}

      {!loading && data && (
        <div className="space-y-5">
          {/* Email verificate */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Email</p>
            {data.emails.length === 0 ? (
              <p className="text-sm text-gray-500">Nessuna email rilevata sul dominio.</p>
            ) : (
              <ul className="space-y-2">
                {data.emails.map((e) => {
                  const c = CONF[e.confidence];
                  return (
                    <li key={e.email} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2">
                      <div className="flex items-center min-w-0 gap-2">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${e.email}`} className="text-sm text-gray-900 dark:text-white truncate hover:underline">{e.email}</a>
                        <CopyBtn value={e.email} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {e.source === "inferred" && (
                          <span className="text-[10px] text-gray-400" title="Indirizzo dedotto da pattern comune">dedotta</span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`} title={e.reasons.join(" · ")}>
                          <c.Icon className="h-3 w-3 mr-1" />{c.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Telefono */}
          {phone && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Telefono</p>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2">
                <a href={`tel:${phone}`} className="flex items-center text-sm text-gray-900 dark:text-white hover:underline">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />{phone}
                </a>
                <CopyBtn value={phone} />
              </div>
            </div>
          )}

          {/* Dati azienda */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Dati dominio</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <CalendarClock className="h-4 w-4 text-gray-400 mr-2" />
                {typeof data.domainAgeYears === "number"
                  ? `${data.domainAgeYears} anni online`
                  : "Età non disponibile"}
              </div>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <Server className="h-4 w-4 text-gray-400 mr-2" />
                {data.hasMxRecords ? (data.emailProvider || "Email attiva") : "Nessuna email (MX)"}
              </div>
              {data.registrar && (
                <div className="flex items-center text-gray-700 dark:text-gray-300 col-span-2 text-xs text-gray-500">
                  Registrar: {data.registrar}
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Dati da fonti pubbliche (DNS/RDAP). "Verificata" = confermata dal server email; "Probabile" = dominio con email attiva.
          </p>
        </div>
      )}
    </div>
  );
}
