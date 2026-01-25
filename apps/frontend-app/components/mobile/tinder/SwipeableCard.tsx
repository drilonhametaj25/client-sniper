/**
 * SwipeableCard - Card swipeable per Tinder mode
 *
 * Supporta:
 * - Swipe right: Sblocca (mostra modal conferma)
 * - Swipe left: Salta lead
 * - Swipe up: Archivia lead
 */

'use client'

import { useState } from 'react'
import { useSpring, animated, to } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import {
  MapPin,
  AlertTriangle,
  CheckCircle,
  Lock,
  Phone,
  Mail,
  Globe,
  ExternalLink
} from 'lucide-react'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch, getMatchColor, getMatchIcon } from '@/lib/utils/match-calculation'
import { SERVICE_CONFIGS, type ServiceType, formatBudget } from '@/lib/types/services'
import { getCriticalityConfig, getScoreBarColor } from '@/lib/utils/lead-card-helpers'

interface SwipeableCardProps {
  lead: {
    id: string
    business_name?: string
    website_url?: string
    city?: string
    category?: string
    phone?: string
    email?: string
    score: number
    created_at?: string
    analysis?: any
    website_analysis?: any
  }
  userServices: ServiceType[]
  index: number
  total: number
  isTop: boolean
  onSwipeRight: () => void
  onSwipeLeft: () => void
  onSwipeUp: () => void
}

export default function SwipeableCard({
  lead,
  userServices,
  index,
  total,
  isTop,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp
}: SwipeableCardProps) {
  const [gone, setGone] = useState(false)

  // Animation spring
  const [{ x, y, rotateZ, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotateZ: 0,
    scale: 1 - index * 0.05 // Stack effect
  }))

  // Analysis e match
  const analysis = lead.website_analysis || lead.analysis
  const detectedServices = detectServices(analysis)
  const matchResult = calculateMatch(detectedServices, userServices)
  const matchColors = getMatchColor(matchResult.score)
  const criticality = getCriticalityConfig(lead.score)

  // Drag gesture
  const bind = useDrag(
    ({ down, movement: [mx, my], velocity: [vx, vy], direction: [xDir, yDir] }) => {
      // Trigger threshold
      const trigger = vx > 0.3 || Math.abs(mx) > 150

      if (!down && trigger && !gone) {
        // Swipe completed
        setGone(true)

        if (Math.abs(mx) > Math.abs(my)) {
          // Horizontal swipe
          if (xDir > 0) {
            // Swipe right = unlock
            api.start({
              x: 500,
              rotateZ: 20,
              scale: 1.05,
              config: { friction: 50, tension: 200 }
            })
            setTimeout(onSwipeRight, 200)
          } else {
            // Swipe left = skip
            api.start({
              x: -500,
              rotateZ: -20,
              scale: 1.05,
              config: { friction: 50, tension: 200 }
            })
            setTimeout(onSwipeLeft, 200)
          }
        } else if (my < -100) {
          // Swipe up = archive
          api.start({
            y: -500,
            scale: 0.8,
            config: { friction: 50, tension: 200 }
          })
          setTimeout(onSwipeUp, 200)
        }
      } else if (down) {
        // Dragging
        api.start({
          x: mx,
          y: my,
          rotateZ: mx / 15,
          scale: 1.05,
          immediate: true
        })
      } else if (!gone) {
        // Release without trigger - snap back
        api.start({
          x: 0,
          y: 0,
          rotateZ: 0,
          scale: 1 - index * 0.05,
          config: { friction: 10, tension: 300 }
        })
      }
    },
    {
      enabled: isTop && !gone,
      filterTaps: true,
      rubberband: true
    }
  )

  if (gone && !isTop) return null

  return (
    <animated.div
      {...bind()}
      style={{
        x,
        y,
        rotateZ,
        scale,
        touchAction: 'none',
        zIndex: total - index,
        position: 'absolute',
        width: '100%',
        height: '100%'
      }}
      className={`
        will-change-transform cursor-grab active:cursor-grabbing
        ${!isTop ? 'pointer-events-none' : ''}
      `}
    >
      <div className="h-full w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header con Match Score */}
        <div className="absolute top-4 right-4 z-10">
          {userServices.length > 0 && (
            <div className={`px-4 py-2 rounded-full text-lg font-bold shadow-lg ${matchColors.bgColor} ${matchColors.textColor}`}>
              {getMatchIcon(matchResult.score)} {matchResult.score}%
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-6 h-full flex flex-col">
          {/* Business Name */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {lead.category || 'Lead'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {lead.city || 'Posizione non disponibile'}
            </p>
          </div>

          {/* Score */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Score sito:</span>
              <span className={`text-4xl font-bold ${criticality.textColor}`}>
                {lead.score}
                <span className="text-lg text-gray-400">/100</span>
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(lead.score)} transition-all`}
                style={{ width: `${lead.score}%` }}
              />
            </div>
          </div>

          {/* Service Tags */}
          <div className="flex-1 mb-4">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
              Ha bisogno di:
            </div>
            <div className="space-y-2">
              {detectedServices.services.slice(0, 4).map((service) => {
                const config = SERVICE_CONFIGS[service.type]
                const isMatched = matchResult.matchedServices.includes(service.type)

                return (
                  <div
                    key={service.type}
                    className={`
                      flex items-center justify-between p-3 rounded-xl
                      ${config.bgColor}
                      ${isMatched ? 'ring-2 ring-green-400' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <div className={`font-semibold ${config.textColor}`}>
                          {config.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {service.issueCount} problemi
                        </div>
                      </div>
                    </div>

                    {isMatched && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Tu</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Budget */}
          {detectedServices.totalBudget.max > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Budget stimato:
                </span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatBudget(detectedServices.totalBudget)}
                </span>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Analisi automatica - verifica prima di contattare</span>
          </div>
        </div>

        {/* Swipe Hint Overlays */}
        <animated.div
          style={{
            opacity: to([x], (x) => (x > 50 ? Math.min(x / 100, 1) : 0))
          }}
          className="absolute inset-0 bg-green-500/30 flex items-center justify-center pointer-events-none rounded-3xl"
        >
          <div className="text-7xl animate-pulse">⚡</div>
        </animated.div>

        <animated.div
          style={{
            opacity: to([x], (x) => (x < -50 ? Math.min(Math.abs(x) / 100, 1) : 0))
          }}
          className="absolute inset-0 bg-red-500/30 flex items-center justify-center pointer-events-none rounded-3xl"
        >
          <div className="text-7xl">✕</div>
        </animated.div>

        <animated.div
          style={{
            opacity: to([y], (y) => (y < -50 ? Math.min(Math.abs(y) / 100, 1) : 0))
          }}
          className="absolute inset-0 bg-purple-500/30 flex items-center justify-center pointer-events-none rounded-3xl"
        >
          <div className="text-7xl">↑</div>
        </animated.div>
      </div>
    </animated.div>
  )
}
