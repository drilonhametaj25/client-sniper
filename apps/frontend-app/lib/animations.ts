/**
 * Animations & Effects Library
 *
 * Utility per animazioni celebrative e feedback visivo
 */

import confetti from 'canvas-confetti'

/**
 * Lancia confetti per celebrare uno sblocco lead
 */
export function triggerUnlockConfetti() {
  const duration = 2000
  const end = Date.now() + duration

  // Colori brand TrovaMi
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: colors
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: colors
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

/**
 * Confetti singolo burst (meno intenso)
 */
export function triggerSuccessBurst() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#10b981', '#22c55e', '#86efac']
  })
}

/**
 * Confetti a cascata dall'alto
 */
export function triggerCelebration() {
  const duration = 3000
  const end = Date.now() + duration

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0 },
      colors: colors,
      ticks: 200,
      gravity: 1.2,
      scalar: 1.2
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0 },
      colors: colors,
      ticks: 200,
      gravity: 1.2,
      scalar: 1.2
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

/**
 * Effetto stelline (per achievement)
 */
export function triggerStars() {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
  }

  const shoot = () => {
    confetti({
      ...defaults,
      particleCount: 30,
      scalar: 1.2,
      shapes: ['star']
    })

    confetti({
      ...defaults,
      particleCount: 20,
      scalar: 0.75,
      shapes: ['circle']
    })
  }

  setTimeout(shoot, 0)
  setTimeout(shoot, 100)
  setTimeout(shoot, 200)
}

/**
 * Riproduce un suono di successo (se disponibile)
 */
export function playSuccessSound() {
  if (typeof Audio !== 'undefined') {
    try {
      const audio = new Audio('/sounds/success.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignora errori (es. autoplay bloccato)
      })
    } catch {
      // Ignora se audio non supportato
    }
  }
}

/**
 * Vibrazione haptic (mobile)
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [50],
      heavy: [100, 50, 100]
    }
    navigator.vibrate(patterns[type])
  }
}

/**
 * Combina confetti + sound + haptic per sblocco completo
 */
export function triggerFullUnlockCelebration() {
  triggerUnlockConfetti()
  playSuccessSound()
  triggerHapticFeedback('medium')
}
