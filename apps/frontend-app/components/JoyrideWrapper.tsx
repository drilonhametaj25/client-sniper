/**
 * Wrapper per react-joyride con tipizzazione corretta
 * Evita problemi di compatibilità TypeScript
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Step, CallBackProps } from 'react-joyride'

interface JoyrideWrapperProps {
  steps: Step[]
  run: boolean
  stepIndex: number
  callback: (data: CallBackProps) => void
  continuous?: boolean
  showProgress?: boolean
  showSkipButton?: boolean
  scrollToFirstStep?: boolean
  scrollOffset?: number
  disableOverlayClose?: boolean
  disableCloseOnEsc?: boolean
  hideCloseButton?: boolean
  spotlightClicks?: boolean
  styles?: any
}

const JoyrideWrapper: React.FC<JoyrideWrapperProps> = (props) => {
  const [Joyride, setJoyride] = useState<any>(null)

  useEffect(() => {
    // Import dinamico per evitare problemi SSR
    import('react-joyride').then((mod) => {
      setJoyride(() => mod.default)
    })
  }, [])

  if (!Joyride) {
    return null
  }

  return <Joyride {...props} />
}

export default JoyrideWrapper
