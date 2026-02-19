// UI restyling stile Apple + Linear
// Navbar moderna fissa con glassmorphism e design minimale  
// Layout       {/* Navbar fissa con glassmorphism */}
// Supporta navigazione admin e client con ruoli dinamici

'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Target, User, Settings, LogOut, Menu, X, Crown, Shield, Users, Home, MessageSquare, FolderOpen, GraduationCap, BarChart, BookOpen, Coins, Plus, Wrench, Globe, Search, Code, Accessibility, ChevronDown } from 'lucide-react'
import Button from './ui/Button'
import Badge from './ui/Badge'
import ThemeToggle from './theme/ThemeToggle'
import TourControlMenu from './onboarding/TourControlMenu'
import NotificationCenter from './NotificationCenter'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'

// Tools disponibili per il dropdown
const toolsMenu = [
  { name: 'Tutti i Tool', href: '/tools', icon: Wrench, description: 'Scopri tutti gli strumenti' },
  { name: 'Analisi Completa', href: '/tools/public-scan', icon: Globe, description: 'Scansione completa del sito' },
  { name: 'SEO Checker', href: '/tools/seo-checker', icon: Search, description: 'Verifica SEO on-page' },
  { name: 'Tech Detector', href: '/tools/tech-detector', icon: Code, description: 'Rileva tecnologie usate' },
  { name: 'Security Check', href: '/tools/security-check', icon: Shield, description: 'Audit sicurezza' },
  { name: 'Accessibility', href: '/tools/accessibility-check', icon: Accessibility, description: 'Verifica WCAG' },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTourMenu, setShowTourMenu] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const toolsMenuRef = useRef<HTMLDivElement>(null)

  // Chiudi dropdown tools quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    ] : [
      { name: 'Blog', href: '/blog', icon: BookOpen, description: 'Guide e strategie per trovare clienti' },
      { name: 'Feedback', href: '/feedback', icon: MessageSquare, description: 'Feedback e suggerimenti della community' },
    ]),
    { name: 'Tools', href: '/tools', icon: Wrench, description: 'Strumenti di analisi', isDropdown: true },
    ...(user?.plan && isStarterOrHigher(user.plan) ? [
      { name: 'CRM', href: '/crm', icon: FolderOpen, description: 'Gestisci i tuoi lead sbloccati' },
      { name: 'Analytics', href: '/analytics', icon: BarChart, description: 'Dashboard analytics e ROI' },
    ] : []),
    { name: 'Account', href: '/settings', icon: User, description: 'Gestisci account e abbonamento' },
    {
      name: isAdminRoute ? 'Client' : 'Admin',
      href: isAdminRoute ? '/dashboard' : '/admin/dashboard',
      icon: isAdminRoute ? User : Shield,
      description: isAdminRoute ? 'Passa alla vista client' : 'Passa alla vista admin'
    },
  ] : [
    { name: 'Dashboard', href: '/dashboard', icon: Home, description: 'I miei lead' },
    { name: 'Blog', href: '/blog', icon: BookOpen, description: 'Guide e strategie per trovare clienti' },
    { name: 'Tools', href: '/tools', icon: Wrench, description: 'Strumenti di analisi', isDropdown: true },
    ...(user?.plan && isStarterOrHigher(user.plan) ? [
      { name: 'CRM', href: '/crm', icon: FolderOpen, description: 'Gestisci i tuoi lead sbloccati' },
      { name: 'Analytics', href: '/analytics', icon: BarChart, description: 'Dashboard analytics e ROI' },
    ] : []),
    { name: 'I miei Feedback', href: '/dashboard/feedback', icon: MessageSquare, description: 'I tuoi feedback e risposte' },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare, description: 'Feedback e suggerimenti della community' },
    { name: 'Account', href: '/settings', icon: User, description: 'Gestisci account e abbonamento' },
    { name: 'Upgrade', href: '/upgrade', icon: Crown, description: 'Aggiorna piano' },
  ]

  return (
    <>
      {/* Navbar fissa con glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link href={isAdmin && isAdminRoute ? '/admin/dashboard' : '/dashboard'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  TrovaMi
                </span>
                {isAdmin && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isAdminRoute ? 'Admin Panel' : 'Client View'}
                  </div>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Navigation Links */}
              <div className="flex items-center space-x-1">
                {navigation.map((item: any) => {
                  const isActive = pathname === item.href || (item.isDropdown && pathname.startsWith('/tools'))

                  // Dropdown per Tools
                  if (item.isDropdown) {
                    return (
                      <div key={item.name} className="relative" ref={toolsMenuRef}>
                        <button
                          onClick={() => setShowToolsMenu(!showToolsMenu)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showToolsMenu && (
                          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                            {toolsMenu.map((tool) => (
                              <Link
                                key={tool.href}
                                href={tool.href}
                                onClick={() => setShowToolsMenu(false)}
                                className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <tool.icon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">{tool.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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
                  <Link
                    href="/credits"
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors group"
                    title="Acquista crediti"
                  >
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.credits_remaining}
                    </span>
                    <Plus className="h-3 w-3 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>
              </div>

              {/* Notification Center */}
              <NotificationCenter />

              {/* Tour Menu */}
              <div className="relative">
                <Button
                  onClick={() => setShowTourMenu(!showTourMenu)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                  title="Tutorial guidati"
                >
                  <GraduationCap className="w-4 h-4" />
                </Button>
                
                {showTourMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowTourMenu(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 z-50">
                      <TourControlMenu onClose={() => setShowTourMenu(false)} />
                    </div>
                  </>
                )}
              </div>

              {/* Theme Toggle */}
              <ThemeToggle variant="compact" />

              {/* Logout Button */}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
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
                className="text-gray-600 dark:text-gray-300"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200/50 dark:border-gray-700/50 py-4">
              <div className="space-y-2">
                {navigation.map((item: any) => {
                  const isActive = pathname === item.href || (item.isDropdown && pathname.startsWith('/tools'))

                  // Per Tools mostriamo la lista espansa nel mobile
                  if (item.isDropdown) {
                    return (
                      <div key={item.name} className="space-y-1">
                        <Link
                          href="/tools"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                        {/* Sub-menu tools nel mobile */}
                        <div className="ml-6 space-y-1">
                          {toolsMenu.slice(1).map((tool) => (
                            <Link
                              key={tool.href}
                              href={tool.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                              <tool.icon className="h-3 w-3" />
                              <span>{tool.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getPlanBadgeVariant(user.plan)} size="sm">
                      {formatPlanName(user.plan)}
                    </Badge>
                    <Link
                      href="/credits"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-900/30"
                    >
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user.credits_remaining}
                      </span>
                      <Plus className="h-3 w-3 text-yellow-500" />
                    </Link>
                  </div>
                  <ThemeToggle variant="compact" />
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
