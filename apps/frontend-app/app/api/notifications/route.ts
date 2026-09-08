/**
 * API endpoint per notifiche in-app
 * GET: Lista notifiche
 * PUT: Segna come lette
 * DELETE: Elimina notifica
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  is_read: boolean
  priority: string
  icon: string | null
  metadata: Record<string, any>
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse

    const { user, admin: supabase } = auth

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // Filter out expired notifications
    query = query.or('expires_at.is.null,expires_at.gt.now()')

    const { data: notifications, count, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching notifications:', queryError)
      return NextResponse.json({ error: 'Error fetching notifications' }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('in_app_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .or('expires_at.is.null,expires_at.gt.now()')

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in notifications GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse

    const { user, admin: supabase } = auth

    const body = await request.json()
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      // Mark all as read
      const { error: updateError } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) {
        return NextResponse.json({ error: 'Error marking notifications as read' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const { error: updateError } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', notificationIds)

      if (updateError) {
        return NextResponse.json({ error: 'Error marking notifications as read' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Missing notificationIds or markAllRead' }, { status: 400 })
  } catch (error) {
    console.error('Error in notifications PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse

    const { user, admin: supabase } = auth

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notification id' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('in_app_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Error deleting notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in notifications DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a test notification (for development)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse

    const { user, admin: supabase } = auth

    const body = await request.json()
    const { type, title, message, entity_type, entity_id, action_url, priority, icon, metadata } = body

    const { data: notification, error: insertError } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id: user.id,
        type: type || 'info',
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        action_url: action_url || null,
        priority: priority || 'normal',
        icon: icon || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating notification:', insertError)
      return NextResponse.json({ error: 'Error creating notification' }, { status: 500 })
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Error in notifications POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
