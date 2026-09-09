/**
 * Pagina di accesso - TrovaMi
 * Percorso: apps/frontend-app/app/login/page.tsx
 *
 * Una cosa sola per schermata: il form. Niente header duplicato (ci pensa la
 * Navbar globale), niente newsletter, niente vetrina di funzionalita'.
 * Presentazione: token e primitive di DESIGN.md.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        setError(error.message || 'Errore durante il login')
        return
      }

      if (data.user) {
        // Attendi che l'AuthContext carichi il profilo
        // Il redirect sarà gestito automaticamente dal dashboard
        router.push('/dashboard')
      }

    } catch (err) {
      setError('Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-title font-semibold text-content">Accedi</h1>
          <p className="mt-2 text-body text-content-muted">
            Entra nel tuo account per vedere i lead della tua zona.
          </p>
        </div>

        <Card padding="lg">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className="rounded-control border border-danger-edge bg-danger-soft px-4 py-3 text-body text-danger"
              >
                {error}
              </div>
            )}

            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.com"
            />

            <div>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="La tua password"
                className="pr-12"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Nascondi la password' : 'Mostra la password'}
                    className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-control text-content-subtle transition-colors duration-fast ease-soft hover:text-content"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />

              <div className="mt-2 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                >
                  Password dimenticata?
                </Link>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading} loadingText="Accesso in corso">
              Accedi
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-caption text-content-muted">
          Non hai un account?{' '}
          <Link
            href="/register"
            className="focus-ring rounded-control font-medium text-accent-ink transition-colors duration-fast ease-soft hover:text-accent"
          >
            Creane uno gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
