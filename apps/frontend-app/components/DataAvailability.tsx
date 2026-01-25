/**
 * DataAvailability - Mostra icone dei dati disponibili prima dello sblocco
 * Indica all'utente quali informazioni otterrà sbloccando il lead
 */

'use client'

import {
  Phone,
  Mail,
  MapPin,
  Globe,
  Users,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube
} from 'lucide-react'
import { LeadAvailableData } from '@/lib/utils/lead-card-helpers'

interface DataAvailabilityProps {
  data: LeadAvailableData
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeConfig = {
  sm: {
    icon: 'w-3.5 h-3.5',
    container: 'p-1',
    gap: 'gap-1',
    text: 'text-xs'
  },
  md: {
    icon: 'w-4 h-4',
    container: 'p-1.5',
    gap: 'gap-1.5',
    text: 'text-sm'
  },
  lg: {
    icon: 'w-5 h-5',
    container: 'p-2',
    gap: 'gap-2',
    text: 'text-base'
  }
}

const socialIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube
}

export default function DataAvailability({
  data,
  showLabels = false,
  size = 'md',
  className = ''
}: DataAvailabilityProps) {
  const config = sizeConfig[size]

  const items = [
    {
      available: data.hasPhone,
      icon: Phone,
      label: 'Telefono',
      color: 'text-green-600 dark:text-green-400',
      bgAvailable: 'bg-green-100 dark:bg-green-900/30',
      bgUnavailable: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      available: data.hasEmail,
      icon: Mail,
      label: 'Email',
      color: 'text-blue-600 dark:text-blue-400',
      bgAvailable: 'bg-blue-100 dark:bg-blue-900/30',
      bgUnavailable: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      available: data.hasAddress,
      icon: MapPin,
      label: 'Indirizzo',
      color: 'text-orange-600 dark:text-orange-400',
      bgAvailable: 'bg-orange-100 dark:bg-orange-900/30',
      bgUnavailable: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      available: data.hasWebsite,
      icon: Globe,
      label: 'Sito Web',
      color: 'text-purple-600 dark:text-purple-400',
      bgAvailable: 'bg-purple-100 dark:bg-purple-900/30',
      bgUnavailable: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      available: data.hasSocial,
      icon: Users,
      label: `Social (${data.socialCount})`,
      color: 'text-pink-600 dark:text-pink-400',
      bgAvailable: 'bg-pink-100 dark:bg-pink-900/30',
      bgUnavailable: 'bg-gray-100 dark:bg-gray-800'
    }
  ]

  // Filtra solo gli elementi disponibili per visualizzazione compatta
  const availableItems = items.filter(item => item.available)
  const unavailableCount = items.filter(item => !item.available).length

  return (
    <div className={`flex flex-wrap items-center ${config.gap} ${className}`}>
      {availableItems.map((item, index) => {
        const Icon = item.icon
        return (
          <div
            key={index}
            className={`
              flex items-center ${config.container} rounded-lg
              ${item.bgAvailable}
              transition-colors
            `}
            title={item.label}
          >
            <Icon className={`${config.icon} ${item.color}`} />
            {showLabels && (
              <span className={`ml-1 ${config.text} ${item.color}`}>
                {item.label}
              </span>
            )}
          </div>
        )
      })}

      {/* Mostra social specifici se disponibili */}
      {data.hasSocial && data.socialPlatforms.length > 0 && (
        <div className="flex items-center gap-0.5 ml-1">
          {data.socialPlatforms.slice(0, 3).map((platform, index) => {
            const SocialIcon = socialIcons[platform]
            if (!SocialIcon) return null
            return (
              <SocialIcon
                key={platform}
                className={`${config.icon} text-gray-500 dark:text-gray-400`}
                title={platform}
              />
            )
          })}
          {data.socialPlatforms.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              +{data.socialPlatforms.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Indicatore dati non disponibili */}
      {unavailableCount > 0 && !showLabels && (
        <span
          className={`${config.text} text-gray-400 dark:text-gray-500 ml-1`}
          title={`${unavailableCount} dati non disponibili`}
        >
          ({unavailableCount} n/d)
        </span>
      )}
    </div>
  )
}

/**
 * Versione compatta per liste/grid
 */
export function DataAvailabilityCompact({
  data,
  className = ''
}: {
  data: LeadAvailableData
  className?: string
}) {
  const availableCount = [
    data.hasPhone,
    data.hasEmail,
    data.hasAddress,
    data.hasWebsite,
    data.hasSocial
  ].filter(Boolean).length

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {data.hasPhone && (
        <div className="p-1 rounded bg-green-100 dark:bg-green-900/30" title="Telefono disponibile">
          <Phone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        </div>
      )}
      {data.hasEmail && (
        <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30" title="Email disponibile">
          <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        </div>
      )}
      {data.hasWebsite && (
        <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30" title="Sito web disponibile">
          <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        </div>
      )}
      {data.hasSocial && (
        <div className="p-1 rounded bg-pink-100 dark:bg-pink-900/30" title={`${data.socialCount} social disponibili`}>
          <Users className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
        </div>
      )}
    </div>
  )
}
