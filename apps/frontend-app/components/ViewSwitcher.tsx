/**
 * ViewSwitcher - Toggle tra diverse viste dei lead
 * Supporta: Lista, Grid, Kanban, Mappa (futuro)
 */

'use client'

import { useState, useEffect } from 'react'
import {
  List,
  LayoutGrid,
  Kanban,
  Map,
  Check
} from 'lucide-react'

export type ViewType = 'list' | 'grid' | 'kanban' | 'map'

interface ViewOption {
  id: ViewType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  comingSoon?: boolean
}

interface ViewSwitcherProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  availableViews?: ViewType[]
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const allViews: ViewOption[] = [
  {
    id: 'list',
    label: 'Lista',
    icon: List,
    description: 'Vista classica a lista'
  },
  {
    id: 'grid',
    label: 'Griglia',
    icon: LayoutGrid,
    description: 'Vista a schede compatte'
  },
  {
    id: 'kanban',
    label: 'Kanban',
    icon: Kanban,
    description: 'Pipeline CRM drag & drop'
  },
  {
    id: 'map',
    label: 'Mappa',
    icon: Map,
    description: 'Vista geografica',
    comingSoon: true
  }
]

export default function ViewSwitcher({
  currentView,
  onViewChange,
  availableViews = ['list', 'grid', 'kanban'],
  showLabels = true,
  size = 'md'
}: ViewSwitcherProps) {
  // Persist view preference
  useEffect(() => {
    localStorage.setItem('dashboard_view_preference', currentView)
  }, [currentView])

  // Load preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_view_preference') as ViewType
    if (saved && availableViews.includes(saved) && saved !== currentView) {
      onViewChange(saved)
    }
  }, [])

  const views = allViews.filter(v => availableViews.includes(v.id))

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
      {views.map(view => {
        const Icon = view.icon
        const isActive = currentView === view.id
        const isDisabled = view.comingSoon

        return (
          <button
            key={view.id}
            onClick={() => !isDisabled && onViewChange(view.id)}
            disabled={isDisabled}
            className={`
              relative flex items-center space-x-1.5 rounded-lg transition-all duration-200
              ${sizeClasses[size]}
              ${isActive
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : isDisabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
            title={view.description}
          >
            <Icon className={iconSizes[size]} />
            {showLabels && (
              <span className="font-medium">{view.label}</span>
            )}
            {view.comingSoon && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold bg-purple-500 text-white rounded uppercase">
                Soon
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Componente helper per rendering condizionale delle viste
interface ViewContainerProps {
  currentView: ViewType
  children: {
    list?: React.ReactNode
    grid?: React.ReactNode
    kanban?: React.ReactNode
    map?: React.ReactNode
  }
}

export function ViewContainer({ currentView, children }: ViewContainerProps) {
  switch (currentView) {
    case 'list':
      return <>{children.list}</> || null
    case 'grid':
      return <>{children.grid}</> || null
    case 'kanban':
      return <>{children.kanban}</> || null
    case 'map':
      return <>{children.map}</> || null
    default:
      return <>{children.list}</> || null
  }
}

// Hook per gestire la vista con persistenza
export function useViewPreference(defaultView: ViewType = 'list') {
  const [view, setView] = useState<ViewType>(defaultView)

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_view_preference') as ViewType
    if (saved) {
      setView(saved)
    }
  }, [])

  const setViewWithPersistence = (newView: ViewType) => {
    setView(newView)
    localStorage.setItem('dashboard_view_preference', newView)
  }

  return [view, setViewWithPersistence] as const
}
