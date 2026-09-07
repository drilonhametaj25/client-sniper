/**
 * Tab Notifiche — preferenze di notifica email e newsletter - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Notifiche")
 * Delega tutto al componente condiviso NotificationSettings
 * (GET/PUT /api/notifications/preferences).
 */

'use client'

import NotificationSettings from '@/components/NotificationSettings'

export default function NotificationsTab() {
  return (
    <div className="space-y-6">
      <NotificationSettings />
    </div>
  )
}
