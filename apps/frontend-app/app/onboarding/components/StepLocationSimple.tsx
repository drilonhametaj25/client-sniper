/**
 * Step 2 onboarding: "Dove lavori?"
 * Scrive operating_city / is_remote_nationwide.
 * Basta una delle due opzioni per continuare.
 *
 * @file apps/frontend-app/app/onboarding/components/StepLocationSimple.tsx
 */

'use client'

import { useState } from 'react'
import { AlertCircle, Check, ChevronLeft, Globe, MapPin } from 'lucide-react'
import type { StepProps } from '@/lib/types/onboarding-v2'
import { validateStep2 } from '@/lib/types/onboarding-v2'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/utils/cn'

export default function StepLocationSimple({
  data,
  onUpdate,
  onNext,
  onBack
}: StepProps) {
  const [showError, setShowError] = useState(false)

  const isValid = validateStep2(data)
  const isRemote = data.is_remote_nationwide || false

  const handleCityChange = (value: string) => {
    onUpdate({ operating_city: value })
    setShowError(false)
  }

  const handleRemoteChange = (checked: boolean) => {
    onUpdate({ is_remote_nationwide: checked })
    setShowError(false)
  }

  const handleNext = () => {
    if (!isValid) {
      setShowError(true)
      return
    }
    onNext()
  }

  return (
    <div>
      <h1 className="text-title font-semibold text-content sm:text-display">Dove lavori?</h1>
      <p className="mt-2 max-w-lg text-body-lg text-content-muted">
        Cercheremo aziende vicino a te. Se lavori da remoto, guardiamo in
        tutta Italia.
      </p>

      <div className="mt-8">
        <Input
          id="city"
          type="text"
          label="Città principale"
          icon={<MapPin />}
          value={data.operating_city || ''}
          onChange={(e) => handleCityChange(e.target.value)}
          placeholder="es. Milano, Roma, Napoli"
          autoComplete="address-level2"
        />
      </div>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-edge" aria-hidden="true" />
        <span className="text-caption text-content-subtle">oppure</span>
        <span className="h-px flex-1 bg-edge" aria-hidden="true" />
      </div>

      <button
        type="button"
        onClick={() => handleRemoteChange(!isRemote)}
        aria-pressed={isRemote}
        className={cn(
          'focus-ring flex w-full items-start gap-3 rounded-card border p-4 text-left',
          'transition-[background-color,border-color] duration-fast ease-soft',
          isRemote
            ? 'border-accent bg-accent-soft'
            : 'border-edge bg-surface-elevated hover:border-edge-strong'
        )}
      >
        <Globe
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            isRemote ? 'text-accent-ink' : 'text-content-subtle'
          )}
          aria-hidden="true"
        />

        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-content">
            Lavoro da remoto in tutta Italia
          </span>
          <span className="mt-0.5 block text-caption text-content-muted">
            Vedrai opportunità da tutte le città italiane
          </span>
        </span>

        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border',
            'transition-colors duration-fast ease-soft',
            isRemote ? 'border-accent bg-accent text-accent-on' : 'border-edge-strong'
          )}
          aria-hidden="true"
        >
          {isRemote && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      </button>

      {showError && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-caption text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Inserisci una città oppure scegli il lavoro da remoto.
        </p>
      )}

      <p className="mt-4 text-caption text-content-subtle">
        Puoi cambiare zona quando vuoi dalle impostazioni.
      </p>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} icon={<ChevronLeft />}>
          Indietro
        </Button>

        <Button onClick={handleNext}>Continua</Button>
      </div>
    </div>
  )
}
