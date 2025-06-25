// Utility per validazione password e altre validazioni form
// Utilizzato nelle pagine di registrazione e cambio password
// È parte del modulo apps/frontend-app

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  let score = 0

  // Lunghezza minima
  if (password.length < 8) {
    errors.push('Almeno 8 caratteri')
  } else {
    score += 1
  }

  // Lettera maiuscola
  if (!/[A-Z]/.test(password)) {
    errors.push('Almeno una lettera maiuscola')
  } else {
    score += 1
  }

  // Lettera minuscola
  if (!/[a-z]/.test(password)) {
    errors.push('Almeno una lettera minuscola')
  } else {
    score += 1
  }

  // Numero
  if (!/\d/.test(password)) {
    errors.push('Almeno un numero')
  } else {
    score += 1
  }

  // Carattere speciale
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Almeno un carattere speciale (!@#$%^&*)')
  } else {
    score += 1
  }

  // Determina la forza
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (score >= 4) {
    strength = 'strong'
  } else if (score >= 3) {
    strength = 'medium'
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'text-red-600'
    case 'medium':
      return 'text-yellow-600'
    case 'strong':
      return 'text-green-600'
    default:
      return 'text-gray-600'
  }
}

export function getPasswordStrengthBg(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-200'
    case 'medium':
      return 'bg-yellow-200'
    case 'strong':
      return 'bg-green-200'
    default:
      return 'bg-gray-200'
  }
}
