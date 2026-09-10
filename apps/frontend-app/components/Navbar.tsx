/**
 * Navbar — la cornice di tutte le pagine dell'app.
 *
 * Percorso: apps/frontend-app/components/Navbar.tsx
 * Guida: apps/frontend-app/DESIGN.md
 * Usata da: app/layout.tsx (quindi ovunque, tranne la landing anonima che ha
 * un header suo).
 *
 * Presentazione portata sui token: superficie piena invece del vetro
 * smerigliato, bordo hairline, un solo accento. Comportamento invariato: le
 * voci, i permessi (admin, piano Starter+), lo stato di login, il dropdown dei
 * tool, il menu mobile e la gestione dell'utente anonimo sono quelli di prima.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { User, Settings, LogOut, Menu, X, Crown, Shield, Users, Home, MessageSquare, FolderOpen, BarChart, BookOpen, Coins, Wrench, Globe, Search, Code, Accessibility, ChevronDown } from 'lucide-react'
import Button from './ui/Button'
import Badge from './ui/Badge'
import LinkButton from './ui/LinkButton'
import ThemeToggle from './theme/ThemeToggle'
import { cn } from '@/lib/utils/cn'

import NotificationCenter from './NotificationCenter'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'
import { formatCredits } from '@/lib/utils/credits-display'

// Tools disponibili per il dropdown
const toolsMenu = [
  { name: 'Tutti i Tool', href: '/tools', icon: Wrench, description: 'Scopri tutti gli strumenti' },
  { name: 'Analisi Completa', href: '/tools/public-scan', icon: Globe, description: 'Scansione completa del sito' },
  { name: 'SEO Checker', href: '/tools/seo-checker', icon: Search, description: 'Verifica SEO on-page' },
  { name: 'Tech Detector', href: '/tools/tech-detector', icon: Code, description: 'Rileva tecnologie usate' },
  { name: 'Security Check', href: '/tools/security-check', icon: Shield, description: 'Audit sicurezza' },
  { name: 'Accessibility', href: '/tools/accessibility-check', icon: Accessibility, description: 'Verifica WCAG' },
]

// Voce di navigazione: attiva = fill tenue, riposo = testo secondario.
const navItemBase =
  'focus-ring flex min-h-control items-center gap-2 rounded-control px-3 text-caption font-medium ' +
  'transition-colors duration-fast ease-soft'
const navItemActive = 'bg-surface-subtle text-content'
const navItemIdle = 'text-content-muted hover:bg-surface-subtle hover:text-content'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  // Esc chiude il dropdown: la tastiera deve poter uscire come il mouse
  useEffect(() => {
    if (!showToolsMenu) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowToolsMenu(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showToolsMenu])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Il piano è un metadato: colorato solo quando dice qualcosa (piano a pagamento).
  const getPlanBadgeVariant = (plan?: string) => {
    switch (plan) {
      case 'pro': return 'accent'
      case 'starter': return 'neutral'
      default: return 'neutral'
    }
  }

  const formatPlanName = (plan?: string) => {
    if (!plan) return 'Free'
    // Nome piano "umano": rimuove i suffissi _monthly/_annual (es. "starter_monthly" -> "Starter").
    const base = plan.replace(/_(monthly|annual)$/i, '')
    return base.charAt(0).toUpperCase() + base.slice(1)
  }

  // Se siamo sulla homepage e non c'è utente, non mostrare la navbar
  const isHomePage = pathname === '/'
  const isAdmin = user?.role === 'admin'
  const isAdminRoute = pathname.startsWith('/admin')

  if (isHomePage && !user) return null

  // Navigazione per homepage con utente loggato
  if (isHomePage && user) {
    return (
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-edge bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="focus-ring rounded-control text-heading font-semibold tracking-tight text-content"
            >
              TrovaMi
            </Link>

            <div className="flex items-center gap-3">
              <Badge variant={getPlanBadgeVariant(user.plan)}>
                {formatPlanName(user.plan)}
              </Badge>
              <LinkButton href="/dashboard">
                Dashboard
              </LinkButton>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  // Header pubblico per visitatori anonimi (prima: return null → /blog, /terms,
  // /tools erano vicoli ciechi senza navigazione né link alla home)
  if (!user) {
    return (
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-edge bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link
              href="/"
              className="focus-ring rounded-control text-heading font-semibold tracking-tight text-content"
            >
              TrovaMi
            </Link>

            <div className="hidden items-center gap-6 sm:flex">
              <Link
                href="/tools"
                className="focus-ring rounded-control text-caption font-medium text-content-muted transition-colors duration-fast ease-soft hover:text-content"
              >
                Tool gratuiti
              </Link>
              <Link
                href="/blog"
                className="focus-ring rounded-control text-caption font-medium text-content-muted transition-colors duration-fast ease-soft hover:text-content"
              >
                Blog
              </Link>
              <Link
                href="/pricing"
                className="focus-ring rounded-control text-caption font-medium text-content-muted transition-colors duration-fast ease-soft hover:text-content"
              >
                Prezzi
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <LinkButton href="/login" variant="ghost">
                Accedi
              </LinkButton>
              <LinkButton href="/register">
                Registrati
              </LinkButton>
            </div>
          </div>
        </div>
      </nav>
    )
  }

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
    { name: 'Invia Feedback', href: '/feedback', icon: MessageSquare, description: 'Invia un feedback o un suggerimento' },
    { name: 'Account', href: '/settings', icon: User, description: 'Gestisci account e abbonamento' },
    { name: 'Upgrade', href: '/upgrade', icon: Crown, description: 'Aggiorna piano' },
  ]

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-edge bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo */}
            <Link
              href={isAdmin && isAdminRoute ? '/admin/dashboard' : '/dashboard'}
              className="focus-ring rounded-control"
            >
              <span className="text-heading font-semibold tracking-tight text-content">
                TrovaMi
              </span>
              {isAdmin && (
                <span className="ml-2 hidden text-micro text-content-subtle sm:inline">
                  {isAdminRoute ? 'Admin Panel' : 'Client View'}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-4 md:flex">
              {/* Navigation Links */}
              <div className="flex items-center gap-1">
                {navigation.map((item: any) => {
                  const isActive = pathname === item.href || (item.isDropdown && pathname.startsWith('/tools'))

                  // Dropdown per Tools
                  if (item.isDropdown) {
                    return (
                      <div key={item.name} className="relative" ref={toolsMenuRef}>
                        <button
                          type="button"
                          onClick={() => setShowToolsMenu(!showToolsMenu)}
                          aria-expanded={showToolsMenu}
                          aria-haspopup="true"
                          aria-controls="navbar-tools-menu"
                          className={cn(navItemBase, isActive ? navItemActive : navItemIdle)}
                        >
                          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{item.name}</span>
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 transition-transform duration-fast ease-soft',
                              showToolsMenu && 'rotate-180'
                            )}
                            aria-hidden="true"
                          />
                        </button>

                        {showToolsMenu && (
                          <div
                            id="navbar-tools-menu"
                            className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-panel border border-edge bg-surface-overlay py-1.5 shadow-pop"
                          >
                            {toolsMenu.map((tool) => (
                              <Link
                                key={tool.href}
                                href={tool.href}
                                onClick={() => setShowToolsMenu(false)}
                                className="focus-ring-inset flex min-h-control items-start gap-3 px-4 py-2.5 transition-colors duration-fast ease-soft hover:bg-surface-subtle"
                              >
                                <tool.icon
                                  className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle"
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">
                                  <span className="block text-caption font-medium text-content">
                                    {tool.name}
                                  </span>
                                  <span className="mt-0.5 block text-micro text-content-subtle">
                                    {tool.description}
                                  </span>
                                </span>
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
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(navItemBase, isActive ? navItemActive : navItemIdle)}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>

              {/* User Info */}
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <Shield className="h-4 w-4 text-content-subtle" aria-hidden="true" />
                    <span className="sr-only">Account amministratore</span>
                  </>
                )}
                <Badge variant={getPlanBadgeVariant(user.plan)} size="sm">
                  {formatPlanName(user.plan)}
                </Badge>
                <Link
                  href="/upgrade#pacchetti"
                  className="focus-ring flex min-h-control items-center gap-1.5 rounded-control px-2 text-caption text-content transition-colors duration-fast ease-soft hover:bg-surface-subtle"
                  title="Acquista crediti"
                >
                  <Coins className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
                  <span className="tabular-nums">
                    {formatCredits((user as any).proposals_remaining ?? user.credits_remaining)}
                  </span>
                  <span className="sr-only">crediti rimasti — acquista crediti</span>
                </Link>
              </div>

              {/* Notification Center */}
              <NotificationCenter />

              {/* Theme Toggle */}
              <ThemeToggle variant="compact" />

              {/* Logout Button */}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                iconOnly
                aria-label="Esci dall'account"
                title="Esci dall'account"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost"
                iconOnly
                aria-label={mobileMenuOpen ? 'Chiudi il menu' : 'Apri il menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="navbar-mobile-menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div
              id="navbar-mobile-menu"
              className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-edge py-3 md:hidden"
            >
              <div className="space-y-1">
                {navigation.map((item: any) => {
                  const isActive = pathname === item.href || (item.isDropdown && pathname.startsWith('/tools'))

                  // Per Tools mostriamo la lista espansa nel mobile
                  if (item.isDropdown) {
                    return (
                      <div key={item.name} className="space-y-1">
                        <Link
                          href="/tools"
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(navItemBase, isActive ? navItemActive : navItemIdle)}
                        >
                          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{item.name}</span>
                        </Link>
                        {/* Sub-menu tools nel mobile */}
                        <div className="ml-6 space-y-1">
                          {toolsMenu.slice(1).map((tool) => (
                            <Link
                              key={tool.href}
                              href={tool.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="focus-ring flex min-h-control items-center gap-2 rounded-control px-3 text-caption text-content-muted transition-colors duration-fast ease-soft hover:bg-surface-subtle hover:text-content"
                            >
                              <tool.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(navItemBase, isActive ? navItemActive : navItemIdle)}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>

              {/* Mobile User Info */}
              <div className="mt-3 space-y-2 border-t border-edge pt-3">
                <div className="flex items-center justify-between gap-3 px-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {isAdmin && (
                      <>
                        <Shield className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
                        <span className="sr-only">Account amministratore</span>
                      </>
                    )}
                    <span className="truncate text-caption text-content">{user.email}</span>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    iconOnly
                    aria-label="Esci dall'account"
                    className="shrink-0"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-3 px-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPlanBadgeVariant(user.plan)} size="sm">
                      {formatPlanName(user.plan)}
                    </Badge>
                    <Link
                      href="/upgrade#pacchetti"
                      onClick={() => setMobileMenuOpen(false)}
                      className="focus-ring flex min-h-control items-center gap-1.5 rounded-control px-2 text-caption text-content transition-colors duration-fast ease-soft hover:bg-surface-subtle"
                    >
                      <Coins className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
                      <span className="tabular-nums">{formatCredits(user.credits_remaining)}</span>
                      <span className="sr-only">crediti rimasti — acquista crediti</span>
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
