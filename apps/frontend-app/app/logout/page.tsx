'use client'

// Questa pagina gestisce il logout degli utenti
// È parte del modulo apps/frontend-app
// Effettua il logout e reindirizza alla homepage

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LogoutPage() {
  const { signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut()
        router.push('/login')
      } catch (error) {
        console.error('Errore durante logout:', error)
        router.push('/login')
      }
    }

    handleLogout()
  }, [signOut, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Logout in corso...</p>
      </div>
    </div>
  )
}
