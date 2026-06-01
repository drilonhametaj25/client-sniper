/**
 * ReportLeadIssueButton
 * Permette all'utente di segnalare che un lead ha dati errati.
 *
 * Chiude il loop di apprendimento (Fase 4): la segnalazione è collegata al lead e,
 * oltre una soglia di segnalazioni distinte, il lead viene messo automaticamente in
 * quarantena (nascosto) lato database tramite la RPC `report_lead_issue`.
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Flag, Check } from "lucide-react";

const ISSUE_TYPES = [
  { value: "wrong_phone", label: "Telefono errato" },
  { value: "wrong_website", label: "Sito web sbagliato" },
  { value: "wrong_name", label: "Nome azienda errato" },
  { value: "site_actually_ok", label: "Il sito in realtà è a posto" },
  { value: "duplicate", label: "Lead duplicato" },
  { value: "other", label: "Altro problema" },
];

export default function ReportLeadIssueButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0].value);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("report_lead_issue", {
        target_lead_id: leadId,
        problem_issue_type: issueType,
        problem_message: message || null,
        current_page_url: typeof window !== "undefined" ? window.location.href : null,
      });
      if (rpcError) throw rpcError;
      if (data && (data as any).success === false) throw new Error((data as any).error);
      setDone(true);
      setTimeout(() => setOpen(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'invio della segnalazione");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
      >
        <Flag className="h-3.5 w-3.5 mr-1" />
        Segnala dato errato
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {done ? (
        <div className="flex items-center text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4 mr-2" />
          Grazie! Segnalazione registrata.
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Cosa c'è di sbagliato in questo lead?
          </p>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="w-full mb-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            {ISSUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Dettagli (facoltativo)"
            rows={2}
            className="w-full mb-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={sending}
              className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
            >
              {sending ? "Invio…" : "Invia segnalazione"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Annulla
            </button>
          </div>
        </>
      )}
    </div>
  );
}
