/**
 * Pagina /pricing - Redirect temporaneo verso /upgrade
 * Usata per: evitare 404 sui link esistenti a /pricing in attesa di una pagina prezzi pubblica dedicata
 * Chiamata da: AccountStatusBar, UnlockConfirmModal e altri link interni
 */

import { redirect } from 'next/navigation'

export default function PricingPage() {
  redirect('/upgrade')
}
