/**
 * SmartFiltersSidebar - Sidebar con filtri rapidi e ricerche salvate
 * Quick filters: Hot Leads, Con Email, Nuovi oggi, Follow-up scaduti
 * Sezione ricerche salvate
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Flame,
  Mail,
  Calendar,
  Clock,
  Star,
  Bookmark,
  ChevronRight,
  Plus,
  X,
  Filter,
  TrendingUp,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react'

interface QuickFilter {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  color: string
  filter: Record<string, any>
}

interface SavedSearch {
  id: string
  name: string
  filters: Record<string, any>
  createdAt: string
}

interface SmartFiltersSidebarProps {
  leads: any[]
  activeFilter: string | null
  onFilterChange: (filterId: string | null, filters: Record<string, any>) => void
  savedSearches?: SavedSearch[]
  onSaveSearch?: (name: string, filters: Record<string, any>) => void
  onDeleteSearch?: (id: string) => void
  currentFilters?: Record<string, any>
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function SmartFiltersSidebar({
  leads,
  activeFilter,
  onFilterChange,
  savedSearches = [],
  onSaveSearch,
  onDeleteSearch,
  currentFilters = {},
  collapsed = false,
  onToggleCollapse
}: SmartFiltersSidebarProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [searchName, setSearchName] = useState('')

  // Calculate counts for quick filters
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const hotLeadsCount = leads.filter(l => l.score >= 80 && l.email).length
  const withEmailCount = leads.filter(l => l.email).length
  const withPhoneCount = leads.filter(l => l.phone).length
  const newTodayCount = leads.filter(l => new Date(l.created_at) >= todayStart).length
  const followUpOverdueCount = leads.filter(l => {
    if (!l.next_follow_up) return false
    return new Date(l.next_follow_up) < now
  }).length
  const highScoreCount = leads.filter(l => l.score >= 70).length
  const criticalIssuesCount = leads.filter(l => l.score < 40).length

  const quickFilters: QuickFilter[] = [
    {
      id: 'hot',
      label: 'Hot Leads',
      icon: Flame,
      count: hotLeadsCount,
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
      filter: { scoreMin: 80, hasEmail: true }
    },
    {
      id: 'with_email',
      label: 'Con Email',
      icon: Mail,
      count: withEmailCount,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
      filter: { hasEmail: true }
    },
    {
      id: 'with_phone',
      label: 'Con Telefono',
      icon: Phone,
      count: withPhoneCount,
      color: 'text-green-500 bg-green-50 dark:bg-green-900/30',
      filter: { hasPhone: true }
    },
    {
      id: 'new_today',
      label: 'Nuovi oggi',
      icon: Calendar,
      count: newTodayCount,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
      filter: { createdToday: true }
    },
    {
      id: 'follow_up',
      label: 'Follow-up scaduti',
      icon: Clock,
      count: followUpOverdueCount,
      color: 'text-red-500 bg-red-50 dark:bg-red-900/30',
      filter: { followUpOverdue: true }
    },
    {
      id: 'high_score',
      label: 'Score alto (70+)',
      icon: TrendingUp,
      count: highScoreCount,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
      filter: { scoreMin: 70 }
    },
    {
      id: 'critical',
      label: 'Problemi critici',
      icon: AlertCircle,
      count: criticalIssuesCount,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
      filter: { scoreMax: 40 }
    }
  ]

  const handleQuickFilter = (filter: QuickFilter) => {
    if (activeFilter === filter.id) {
      onFilterChange(null, {})
    } else {
      onFilterChange(filter.id, filter.filter)
    }
  }

  const handleSaveSearch = () => {
    if (searchName.trim() && onSaveSearch) {
      onSaveSearch(searchName.trim(), currentFilters)
      setSearchName('')
      setShowSaveModal(false)
    }
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 space-y-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Espandi filtri"
        >
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {quickFilters.slice(0, 4).map(filter => {
          const Icon = filter.icon
          const isActive = activeFilter === filter.id

          return (
            <button
              key={filter.id}
              onClick={() => handleQuickFilter(filter)}
              className={`relative p-2 rounded-lg transition-colors ${
                isActive
                  ? filter.color
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={`${filter.label} (${filter.count})`}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'text-gray-600 dark:text-gray-400'}`} />
              {filter.count && filter.count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                  {filter.count > 99 ? '99+' : filter.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filtri Rapidi
        </h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {/* All Leads */}
          <button
            onClick={() => onFilterChange(null, {})}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
              !activeFilter
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <span className="font-medium">Tutti i lead</span>
            <span className="text-sm">{leads.length}</span>
          </button>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

          {quickFilters.map(filter => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.id

            return (
              <button
                key={filter.id}
                onClick={() => handleQuickFilter(filter)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  isActive
                    ? filter.color + ' font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                </div>
                <span className={`text-sm ${isActive ? 'font-bold' : ''}`}>
                  {filter.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Saved Searches */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
              <Bookmark className="w-4 h-4 mr-1" />
              Ricerche Salvate
            </h4>
            {onSaveSearch && Object.keys(currentFilters).length > 0 && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400"
                title="Salva ricerca corrente"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {savedSearches.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              Nessuna ricerca salvata
            </p>
          ) : (
            <div className="space-y-1">
              {savedSearches.map(search => (
                <div
                  key={search.id}
                  className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => onFilterChange(search.id, search.filters)}
                >
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {search.name}
                    </span>
                  </div>
                  {onDeleteSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSearch(search.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-80 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Salva Ricerca
            </h3>
            <input
              type="text"
              placeholder="Nome della ricerca..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!searchName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
