/**
 * ToolUrlForm — il campo URL + bottone "Analizza" condiviso dai tool.
 *
 * Percorso: apps/frontend-app/components/tools/ToolUrlForm.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * È solo l'aspetto del form: la validazione, la chiamata e la gestione del
 * limite restano nella pagina. Il componente si limita a fare
 * `event.preventDefault()` e a passare l'evento a `onSubmit`, così gli
 * handler esistenti — quelli scritti come `(e) => { e.preventDefault(); ... }` —
 * continuano a funzionare senza modifiche.
 *
 * Campo e bottone sono alti 44px, l'invio da tastiera funziona perché è un
 * <form> vero, e c'è una regione live che annuncia "analisi in corso" e
 * l'errore a chi usa uno screen reader.
 *
 * Usato da: tutte le pagine app/tools/(...)/page.tsx.
 */

'use client'

import { FormEvent, useId } from 'react'
import { Globe } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { cn } from '@/lib/utils/cn'

export interface ToolUrlFormProps {
  value: string
  onChange: (value: string) => void
  /** Riceve l'evento con preventDefault già chiamato */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  /** Analisi in corso: bottone in attesa e campo bloccato */
  loading?: boolean
  /** Campo e bottone disattivati (es. limite giornaliero raggiunto) */
  disabled?: boolean
  /** Etichetta del campo */
  label?: string
  /** Nasconde l'etichetta lasciandola agli screen reader */
  hideLabel?: boolean
  placeholder?: string
  /** Riga di aiuto sotto il campo (sparisce quando c'è un errore) */
  hint?: string
  /** Messaggio di errore sul campo */
  error?: string | null
  submitLabel?: string
  loadingLabel?: string
  /** `url` attiva la validazione nativa del browser; default `text` */
  inputType?: 'text' | 'url'
  required?: boolean
  /** id del campo, se la pagina deve puntarci */
  id?: string
  className?: string
}

export default function ToolUrlForm({
  value,
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
  label = 'Indirizzo del sito da analizzare',
  hideLabel = false,
  placeholder = 'esempio.it',
  hint,
  error,
  submitLabel = 'Analizza',
  loadingLabel = 'Analisi in corso',
  inputType = 'text',
  required = false,
  id,
  className,
}: ToolUrlFormProps) {
  const autoId = useId()
  const inputId = id ?? `tool-url-${autoId}`
  const isBlocked = disabled || loading

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(event)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      {label && !hideLabel && (
        <label htmlFor={inputId} className="mb-2 block text-caption font-medium text-content">
          {label}
        </label>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 sm:flex-1">
          <Input
            id={inputId}
            type={inputType}
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            icon={<Globe />}
            error={error ?? undefined}
            hint={hint}
            disabled={isBlocked}
            required={required}
            aria-label={hideLabel ? label : undefined}
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          loadingText={loadingLabel}
          disabled={disabled}
          fullWidth
          className="sm:w-auto"
        >
          {submitLabel}
        </Button>
      </div>

      {/* Annuncio per screen reader: il testo visibile non cambia */}
      <p className="sr-only" role="status" aria-live="polite">
        {loading ? loadingLabel : error ?? ''}
      </p>
    </form>
  )
}

export { ToolUrlForm }
