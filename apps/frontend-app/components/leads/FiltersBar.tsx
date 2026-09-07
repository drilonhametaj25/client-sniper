/**
 * FiltersBar — barra filtri della dashboard "Trova clienti".
 *
 * Riga 1: ricerca testuale (debounce nel hook useLeads) + ordinamento.
 * Riga 2: Categoria, Città, toggle "Solo per i miei servizi" (VISIBILE, non
 * sepolto nei filtri), toggle "Solo sbloccati", export CSV (Starter+).
 * Sotto: AdvancedFilters per tutto il resto (score, contatti, tecnici, CRM,
 * servizi richiesti). Tutti i filtri sono applicati server-side da /api/leads.
 *
 * Usato da: app/dashboard/page.tsx
 */

'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import AdvancedFilters, { AdvancedFiltersState } from '@/components/AdvancedFilters'
import ExportCSV from '@/components/leads/ExportCSV'
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

const selectClass =
  'min-h-[44px] px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'

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

  const toggleClass = (active: boolean) =>
    `px-3 py-2 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 mb-6">
      {/* Riga 1: ricerca + ordinamento */}
      <div className="flex flex-col lg:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome o città..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full pl-10 pr-9 py-2.5 min-h-[44px] bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: '' })}
              aria-label="Pulisci ricerca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const idx = e.target.value.lastIndexOf('-')
            onChange({
              sortBy: e.target.value.slice(0, idx) as LeadSortBy,
              sortOrder: e.target.value.slice(idx + 1) as 'asc' | 'desc'
            })
          }}
          className={selectClass}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Riga 2: categoria, città, toggles, export */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className={`${selectClass} max-w-[180px]`}
        >
          <option value="">Tutte le categorie</option>
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className={`${selectClass} max-w-[180px]`}
        >
          <option value="">Tutte le città</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        {hasServices && (
          <button
            onClick={() => onChange({ showOnlyMatching: !filters.showOnlyMatching })}
            className={toggleClass(filters.showOnlyMatching)}
            title="Mostra solo i lead che necessitano dei servizi che offri"
          >
            🎯 Solo per i miei servizi
          </button>
        )}
        <button
          onClick={() => onChange({ showOnlyUnlocked: !filters.showOnlyUnlocked })}
          className={toggleClass(filters.showOnlyUnlocked)}
        >
          Solo sbloccati
        </button>
        <div className="flex-1" />
        <ExportCSV leads={unlockedLeads} plan={plan} />
      </div>

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
