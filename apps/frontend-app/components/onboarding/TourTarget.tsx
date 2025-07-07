/**
 * Utility per aggiungere selettori per i tour di onboarding
 * Facilita il targeting degli elementi nelle pagine
 */

'use client'

import React from 'react'

interface TourTargetProps {
  tourId: string
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}

/**
 * Wrapper component per aggiungere attributi tour agli elementi
 */
export const TourTarget: React.FC<TourTargetProps> = ({ 
  tourId, 
  children, 
  className = '', 
  as: Component = 'div' 
}) => {
  return (
    <Component 
      data-tour-id={tourId}
      className={`tour-${tourId} ${className}`.trim()}
    >
      {children}
    </Component>
  )
}

/**
 * Hook per ottenere selettori tour standardizzati
 */
export const useTourSelectors = () => {
  return {
    // Dashboard selectors
    statsCards: '.stats-cards, [data-tour-id="stats-cards"]',
    searchSection: '.search-section, [data-tour-id="search-section"]',
    filtersSection: '.filters-section, [data-tour-id="filters-section"]',
    leadCard: '.lead-card, [data-tour-id="lead-card"]',
    unlockButton: '.unlock-button, [data-tour-id="unlock-button"]',
    
    // Lead detail selectors
    leadHeader: '.lead-header, [data-tour-id="lead-header"]',
    contactInfo: '.contact-info, [data-tour-id="contact-info"]',
    technicalAnalysis: '.technical-analysis, [data-tour-id="technical-analysis"]',
    recommendations: '.recommendations, [data-tour-id="recommendations"]',
    
    // CRM selectors
    crmStats: '.crm-stats, [data-tour-id="crm-stats"]',
    crmEntry: '.crm-entry, [data-tour-id="crm-entry"]',
    crmActions: '.crm-actions, [data-tour-id="crm-actions"]',
    
    // Manual scan selectors
    urlInput: '.url-input, [data-tour-id="url-input"]',
    scanButton: '.scan-button, [data-tour-id="scan-button"]',
    scanResults: '.scan-results, [data-tour-id="scan-results"]',
    
    // Generic selectors
    navbar: '.navbar, [data-tour-id="navbar"]',
    sidebar: '.sidebar, [data-tour-id="sidebar"]',
    mainContent: '.main-content, [data-tour-id="main-content"]'
  }
}

/**
 * Utility per aggiungere classe tour automaticamente
 */
export const addTourClass = (element: string, tourId: string): string => {
  return `${element} tour-${tourId}`
}

/**
 * Componente per evidenziare sezioni durante lo sviluppo
 */
interface TourDebugProps {
  enabled?: boolean
  children: React.ReactNode
}

export const TourDebug: React.FC<TourDebugProps> = ({ enabled = false, children }) => {
  if (!enabled || process.env.NODE_ENV === 'production') {
    return <>{children}</>
  }

  return (
    <div style={{ position: 'relative' }}>
      {children}
      <style jsx>{`
        [data-tour-id]::before {
          content: attr(data-tour-id);
          position: absolute;
          top: -20px;
          left: 0;
          background: #3b82f6;
          color: white;
          padding: 2px 6px;
          font-size: 10px;
          border-radius: 3px;
          z-index: 9999;
          pointer-events: none;
        }
        
        [data-tour-id] {
          outline: 1px dashed #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}

export default TourTarget
