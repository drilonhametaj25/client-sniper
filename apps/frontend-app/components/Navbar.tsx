// UI restyling stile Apple + Linear
// Navbar moderna fissa con glassmorphism e design minimale  
// Layout pulito ispirato a apple.com con navigazione fluida
// Supporta navigazione admin e client con ruoli dinamici

'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Target, User, Settings, LogOut, Menu, X, Crown, Shield, Users, Home, MessageSquare } from 'lucide-react'
import Button from './ui/Button'
import Badge from './ui/Badge'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getPlanBadgeVariant = (plan?: string) => {
    switch (plan) {
      case 'pro': return 'info'
      case 'starter': return 'warning'
      default: return 'default'
    }
  }

  const formatPlanName = (plan?: string) => {
    if (!plan) return 'Free'
    return plan.charAt(0).toUpperCase() + plan.slice(1)
  }

  // Se siamo sulla homepage e non c'è utente, non mostrare la navbar
  const isHomePage = pathname === '/'
  const isAdmin = user?.role === 'admin'
  const isAdminRoute = pathname.startsWith('/admin')
  
  if (isHomePage && !user) return null

  // Navigazione per homepage con utente loggato
  if (isHomePage && user) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TrovaMi</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Badge variant={getPlanBadgeVariant(user.plan)}>
                {formatPlanName(user.plan)}
              </Badge>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!user) return null

  // Navigazione dinamica basata su ruolo e pagina corrente
  const navigation = isAdmin ? [
    { 
      name: 'Dashboard', 
      href: isAdminRoute ? '/admin/dashboard' : '/dashboard', 
      icon: Home,
      description: isAdminRoute ? 'Admin Dashboard' : 'Client Dashboard'
    },
    ...(isAdminRoute ? [
      { name: 'Utenti', href: '/admin/users', icon: Users, description: 'Gestione Utenti' },
      { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare, description: 'Segnalazioni Utenti' },
      { name: 'Settings', href: '/admin/settings', icon: Settings, description: 'Configurazioni Sistema' },
    ] : []),
    { name: 'Analisi Manuale', href: '/tools/manual-scan', icon: Target, description: 'Analizza qualsiasi sito web' },
    { name: 'Mio account', href: '/settings', icon: User, description: 'Gestisci account e abbonamento' },
    { 
      name: isAdminRoute ? 'Vista Client' : 'Vista Admin', 
      href: isAdminRoute ? '/dashboard' : '/admin/dashboard', 
      icon: isAdminRoute ? User : Shield,
      description: isAdminRoute ? 'Passa alla vista client' : 'Passa alla vista admin'
    },
  ] : [
    { name: 'Dashboard', href: '/dashboard', icon: Home, description: 'I miei lead' },
    { name: 'Analisi Manuale', href: '/tools/manual-scan', icon: Target, description: 'Analizza qualsiasi sito web' },
    { name: 'Mio account', href: '/settings', icon: User, description: 'Gestisci account e abbonamento' },
    { name: 'Upgrade', href: '/upgrade', icon: Crown, description: 'Aggiorna piano' },
  ]

  return (
    <>
      {/* Navbar fissa con glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link href={isAdmin && isAdminRoute ? '/admin/dashboard' : '/dashboard'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900">
                  TrovaMi
                </span>
                {isAdmin && (
                  <div className="text-xs text-gray-500">
                    {isAdminRoute ? 'Admin Panel' : 'Client View'}
                  </div>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Navigation Links */}
              <div className="flex items-center space-x-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isAdmin && <Shield className="h-4 w-4 text-red-500" />}
                  <Badge variant={getPlanBadgeVariant(user.plan)} size="sm">
                    {formatPlanName(user.plan)}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {user.credits_remaining} crediti
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost"
                size="sm"
                className="text-gray-600"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200/50 py-4">
              <div className="space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
              
              {/* Mobile User Info */}
              <div className="mt-4 pt-4 border-t border-gray-200/50">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center space-x-2">
                    {isAdmin && <Shield className="h-4 w-4 text-red-500" />}
                    <span className="text-sm font-medium text-gray-900">{user.email}</span>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2 px-3 py-2">
                  <Badge variant={getPlanBadgeVariant(user.plan)} size="sm">
                    {formatPlanName(user.plan)}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {user.credits_remaining} crediti
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer per il contenuto */}
      <div className="h-16"></div>
    </>
  )
}
