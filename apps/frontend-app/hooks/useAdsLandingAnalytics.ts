// Hook per tracking analytics specifico per la landing page /ads
// Monitora conversioni, scroll depth e interazioni degli utenti
// Utilizzato per ottimizzare le performance delle campagne pubblicitarie

'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AnalyticsEvent {
  event: string
  page: string
  user_id?: string
  timestamp: string
  data?: Record<string, any>
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    fbq?: any
  }
}

export function useAdsLandingAnalytics() {
  const { user } = useAuth()

  const trackEvent = (event: string, data?: Record<string, any>) => {
    // Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        page_title: 'Ads Landing Page',
        page_location: window.location.href,
        user_id: user?.id,
        ...data
      })
    }

    // Facebook Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', event, {
        content_name: 'Ads Landing Page',
        user_id: user?.id,
        ...data
      })
    }

    // Console per debug
    console.log('Analytics Event:', {
      event,
      page: 'ads-landing',
      user_id: user?.id,
      timestamp: new Date().toISOString(),
      data
    })
  }

  useEffect(() => {
    // Track page view
    trackEvent('page_view', {
      page_type: 'ads_landing',
      referrer: document.referrer,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign')
    })

    // Track scroll depth
    let maxScrollDepth = 0
    const handleScroll = () => {
      const scrollDepth = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      )
      
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        
        // Track milestone scroll depths
        if (scrollDepth >= 25 && maxScrollDepth < 25) {
          trackEvent('scroll_depth_25')
        } else if (scrollDepth >= 50 && maxScrollDepth < 50) {
          trackEvent('scroll_depth_50')
        } else if (scrollDepth >= 75 && maxScrollDepth < 75) {
          trackEvent('scroll_depth_75')
        } else if (scrollDepth >= 90 && maxScrollDepth < 90) {
          trackEvent('scroll_depth_90')
        }
      }
    }

    window.addEventListener('scroll', handleScroll)

    // Track time on page
    const startTime = Date.now()
    const timeTracker = setInterval(() => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000)
      
      if (timeOnPage === 30) {
        trackEvent('time_on_page_30s')
      } else if (timeOnPage === 60) {
        trackEvent('time_on_page_60s')
      } else if (timeOnPage === 120) {
        trackEvent('time_on_page_120s')
      }
    }, 1000)

    // Track exit intent
    const handleExitIntent = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        trackEvent('exit_intent')
      }
    }

    document.addEventListener('mouseleave', handleExitIntent)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('mouseleave', handleExitIntent)
      clearInterval(timeTracker)
    }
  }, [user])

  return {
    trackEvent,
    trackCTAClick: (ctaLocation: string) => {
      trackEvent('cta_click', { 
        cta_location: ctaLocation,
        cta_text: 'Inizia con 2 Lead Gratuiti'
      })
    },
    trackSectionView: (sectionName: string) => {
      trackEvent('section_view', { section_name: sectionName })
    },
    trackTestimonialView: (testimonialId: string) => {
      trackEvent('testimonial_view', { testimonial_id: testimonialId })
    },
    trackFAQOpen: (question: string) => {
      trackEvent('faq_open', { question })
    },
    trackPriceComparison: (competitor: string) => {
      trackEvent('price_comparison_view', { competitor })
    },
    trackUrgencyInteraction: (element: string) => {
      trackEvent('urgency_interaction', { element })
    }
  }
}

// Componente per inserire script di tracking
export function AdsLandingTracking() {
  useEffect(() => {
    // Google Analytics
    if (typeof window !== 'undefined' && !window.gtag) {
      const script = document.createElement('script')
      script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID'
      script.async = true
      document.head.appendChild(script)

      script.onload = () => {
        window.gtag = window.gtag || function() {
          (window.gtag as any).q = (window.gtag as any).q || []
          ;(window.gtag as any).q.push(arguments)
        }
        window.gtag('js', new Date())
        window.gtag('config', 'GA_MEASUREMENT_ID', {
          page_title: 'Ads Landing Page',
          page_location: window.location.href,
          custom_map: {
            'custom_parameter_1': 'ads_landing'
          }
        })
      }
    }

    // Facebook Pixel
    if (typeof window !== 'undefined' && !window.fbq) {
      ;(function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        }
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = !0
        n.version = '2.0'
        n.queue = []
        t = b.createElement(e)
        t.async = !0
        t.src = v
        s = b.getElementsByTagName(e)[0]
        s.parentNode.insertBefore(t, s)
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

      if (window.fbq) {
        window.fbq('init', 'FB_PIXEL_ID')
        window.fbq('track', 'PageView')
      }
    }
  }, [])

  return null
}
