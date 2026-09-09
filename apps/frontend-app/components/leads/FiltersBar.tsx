/**
 * FiltersBar — barra filtri della dashboard "Trova clienti".
 *
 * Deve sembrare uno strumento leggero, non un pannello di controllo: nessuna
 * superficie che la incornici, solo i controlli appoggiati sulla pagina.
 *
 * Riga 1: ricerca testuale (debounce nel hook useLeads) + ordinamento.
 * Riga 2: Categoria, Città, "Solo per i miei servizi" (il filtro che conta:
 * VISIBILE, non sepolto), "Solo sbloccati", salva ricerca, export CSV (Starter+).
 * Sotto: AdvancedFilters per tutto il resto (score, contatti, tecnici, CRM,
 * servizi richiesti). Tutti i filtri sono applicati server-side da /api/leads.
 *
 * Usato da: app/dashboard/page.tsx
 */

'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Search, X, Bell, Check } from 'lucide-react'
import AdvancedFilters, { AdvancedFiltersState } from '@/components/AdvancedFilters'
import ExportCSV from '@/components/leads/ExportCSV'
import SavedSearchForm from '@/components/SavedSearchForm'
import { Button, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils/cn'
import { CATEGORY_OPTIONS } from '@/lib/utils/categories'
import type { LeadsFilterState, LeadSortBy, DashboardLead } from '@/lib/hooks/useLeads'

// v1: score basso = sito con più problemi = opportunità migliore
const SORT_OPTIONS = [
  { value: 'score-asc', label: 'Opportunità (migliore prima)' },
  { value: 'score-desc', label: 'Opportunità (peggiore prima)' },
  { value: 'created_at-desc', label: 'Più recenti' },
  { value: 'created_at-asc', label: 'Meno recenti' },
  { value: 'last_seen_at-desc', label: 'Ultimo aggiornamento' },
  { value: 'business_name-asc', label: 'Nome azienda (A-Z)' },
  { value: 'business_name-desc', label: 'Nome azienda (Z-A)' }
]

interface FiltersBarProps {
  filters: LeadsFilterState
  onChange: (patch: Partial<LeadsFilterState>) => void
  cities: string[]
  /** true se l'utente ha configurato i servizi offerti */
  hasServices: boolean
  plan: string
  /** lead sbloccati della pagina corrente, per l'export CSV */
  unlockedLeads: DashboardLead[]
  leadCount: number
}

/** Chip di filtro: acceso = fondo d'accento tenue + spunta (mai solo colore). */
function FilterChip({
  active,
  onClick,
  title,
  children
}: {
  active: boolean
  onClick: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'focus-ring inline-flex h-11 items-center gap-2 rounded-control border px-3.5',
        'text-body font-medium whitespace-nowrap',
        'transition-colors duration-fast ease-soft',
        active
          ? 'border-accent-edge bg-accent-soft text-accent-ink'
          : 'border-edge bg-surface-elevated text-content-muted hover:bg-surface-subtle hover:text-content'
      )}
    >
      {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  )
}

export default function FiltersBar({
  filters,
  onChange,
  cities,
  hasServices,
  plan,
  unlockedLeads,
  leadCount
}: FiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSavedSearch, setShowSavedSearch] = useState(false)

  // Identità stabile: SavedSearchForm ha un effect su initialFilters e un
  // object literal nuovo a ogni render lo farebbe scattare in loop
  const savedSearchInitialFilters = useMemo(() => ({
    categories: filters.category ? [filters.category] : [],
    cities: filters.city ? [filters.city] : [],
    scoreMin: filters.advanced.scoreRange.min,
    scoreMax: filters.advanced.scoreRange.max
  }), [filters.category, filters.city, filters.advanced.scoreRange.min, filters.advanced.scoreRange.max])

  return (
    <div className="mb-6 space-y-3">
      {/* Riga 1: ricerca + ordinamento */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Input
            type="text"
            aria-label="Cerca fra i lead"
            placeholder="Cerca per nome o città"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            icon={<Search />}
            className={filters.search ? 'pr-14' : undefined}
            trailing={
              filters.search ? (
                <Button
                  variant="ghost"
                  iconOnly
                  aria-label="Pulisci la ricerca"
                  onClick={() => onChange({ search: '' })}
                  icon={<X />}
                />
              ) : undefined
            }
          />
        </div>
        <div className="sm:w-64">
          <Select
            aria-label="Ordina i risultati"
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const idx = e.target.value.lastIndexOf('-')
              onChange({
                sortBy: e.target.value.slice(0, idx) as LeadSortBy,
                sortOrder: e.target.value.slice(idx + 1) as 'asc' | 'desc'
              })
            }}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Riga 2: categoria, città, i due filtri che contano, azioni */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-[calc(50%-0.25rem)] sm:w-44">
          <Select
            aria-label="Filtra per categoria"
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            <option value="">Tutte le categorie</option>
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-[calc(50%-0.25rem)] sm:w-44">
          <Select
            aria-label="Filtra per città"
            value={filters.city}
            onChange={(e) => onChange({ city: e.target.value })}
          >
            <option value="">Tutte le città</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </Select>
        </div>

        {hasServices && (
          <FilterChip
            active={filters.showOnlyMatching}
            onClick={() => onChange({ showOnlyMatching: !filters.showOnlyMatching })}
            title="Mostra solo i lead che hanno bisogno dei servizi che offri"
          >
            Solo per i miei servizi
          </FilterChip>
        )}

        <FilterChip
          active={filters.showOnlyUnlocked}
          onClick={() => onChange({ showOnlyUnlocked: !filters.showOnlyUnlocked })}
          title="Mostra solo i lead che hai già sbloccato"
        >
          Solo sbloccati
        </FilterChip>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="ghost"
            icon={<Bell />}
            onClick={() => setShowSavedSearch(true)}
            title="Salva questa ricerca e ricevi un avviso quando arrivano nuovi lead compatibili"
          >
            Salva ricerca
          </Button>
          <ExportCSV leads={unlockedLeads} plan={plan} />
        </div>
      </div>

      {/* Ricerche salvate → alert email "nuovi lead per te" (cron già attivo) */}
      <SavedSearchForm
        isOpen={showSavedSearch}
        onClose={() => setShowSavedSearch(false)}
        initialFilters={savedSearchInitialFilters}
      />

      {/* Tutto il resto dei filtri */}
      <AdvancedFilters
        isOpen={showAdvanced}
        onToggle={() => setShowAdvanced(!showAdvanced)}
        filters={filters.advanced}
        onFiltersChange={(advanced: AdvancedFiltersState) => onChange({ advanced })}
        leadCount={leadCount}
        userPlan={plan}
      />
    </div>
  )
}
