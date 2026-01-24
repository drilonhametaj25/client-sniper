/**
 * API endpoint per assegnazione lead ai membri del team
 * GET: Lista assegnazioni
 * POST: Assegna lead
 * DELETE: Rimuovi assegnazione
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status') || 'active'

    // Verifica che l'utente sia nel team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role, can_view_all_leads')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    // Costruisci query
    let query = supabase
      .from('lead_assignments')
      .select(`
        id,
        lead_id,
        assigned_to,
        assigned_by,
        note,
        status,
        assigned_at,
        completed_at,
        leads (
          id,
          business_name,
          website_url,
          email,
          phone,
          city,
          category,
          score,
          crm_status
        )
      `)
      .eq('team_id', teamId)
      .eq('status', status)
      .order('assigned_at', { ascending: false })

    // Se l'utente non può vedere tutti i lead, mostra solo i suoi
    if (!membership.can_view_all_leads && !['owner', 'admin'].includes(membership.role)) {
      query = query.eq('assigned_to', user.id)
    } else if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    const { data: assignments, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching assignments:', queryError)
      return NextResponse.json({ error: 'Error fetching assignments' }, { status: 500 })
    }

    // Ottieni info utenti assegnati
    const userIds = new Set<string>()
    assignments?.forEach(a => {
      userIds.add(a.assigned_to)
      userIds.add(a.assigned_by)
    })

    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', Array.from(userIds))

    const usersMap = new Map(users?.map(u => [u.id, u]) || [])

    const assignmentsWithUsers = assignments?.map(a => ({
      ...a,
      assigned_to_user: usersMap.get(a.assigned_to),
      assigned_by_user: usersMap.get(a.assigned_by),
    }))

    // Statistiche per membro
    const statsByMember: Record<string, { total: number; completed: number }> = {}

    const { data: allAssignments } = await supabase
      .from('lead_assignments')
      .select('assigned_to, status')
      .eq('team_id', teamId)

    allAssignments?.forEach(a => {
      if (!statsByMember[a.assigned_to]) {
        statsByMember[a.assigned_to] = { total: 0, completed: 0 }
      }
      statsByMember[a.assigned_to].total++
      if (a.status === 'completed') {
        statsByMember[a.assigned_to].completed++
      }
    })

    return NextResponse.json({
      assignments: assignmentsWithUsers || [],
      statsByMember,
    })
  } catch (error) {
    console.error('Error in assignments GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { leadId, leadIds, assignedTo, teamId, note } = body

    // Supporta assegnazione singola o multipla
    const leadsToAssign = leadIds || [leadId]

    if (!leadsToAssign.length || !assignedTo || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verifica che l'utente sia admin/owner del team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Not authorized to assign leads' },
        { status: 403 }
      )
    }

    // Verifica che l'assignee sia membro del team
    const { data: assigneeMembership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', assignedTo)
      .eq('status', 'active')
      .single()

    if (!assigneeMembership) {
      return NextResponse.json(
        { error: 'Assignee is not a team member' },
        { status: 400 }
      )
    }

    const results: { leadId: string; success: boolean; error?: string }[] = []

    for (const lid of leadsToAssign) {
      try {
        // Rimuovi assegnazione precedente se esiste
        await supabase
          .from('lead_assignments')
          .update({ status: 'transferred' })
          .eq('lead_id', lid)
          .eq('status', 'active')

        // Crea nuova assegnazione
        const { error: insertError } = await supabase
          .from('lead_assignments')
          .insert({
            lead_id: lid,
            assigned_to: assignedTo,
            assigned_by: user.id,
            team_id: teamId,
            note: note || null,
          })

        if (insertError) {
          results.push({ leadId: lid, success: false, error: insertError.message })
        } else {
          // Aggiorna anche il campo assigned_to nel lead
          await supabase
            .from('leads')
            .update({ assigned_to: assignedTo, team_id: teamId })
            .eq('id', lid)

          results.push({ leadId: lid, success: true })
        }
      } catch (err) {
        results.push({ leadId: lid, success: false, error: String(err) })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: successCount > 0,
      total: leadsToAssign.length,
      assigned: successCount,
      failed: leadsToAssign.length - successCount,
      results,
    })
  } catch (error) {
    console.error('Error in assignments POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { assignmentId, status, note } = body

    // Ottieni l'assegnazione
    const { data: assignment } = await supabase
      .from('lead_assignments')
      .select('team_id, assigned_to')
      .eq('id', assignmentId)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Verifica permessi: può aggiornare solo se è assignee o admin/owner
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', assignment.team_id)
      .eq('user_id', user.id)
      .single()

    const canUpdate = membership && (
      ['owner', 'admin'].includes(membership.role) ||
      assignment.assigned_to === user.id
    )

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Not authorized to update assignment' },
        { status: 403 }
      )
    }

    const updates: any = {}
    if (status) {
      updates.status = status
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }
    if (note !== undefined) updates.note = note

    const { error: updateError } = await supabase
      .from('lead_assignments')
      .update(updates)
      .eq('id', assignmentId)

    if (updateError) {
      return NextResponse.json({ error: 'Error updating assignment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in assignments PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')

    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 })
    }

    // Ottieni l'assegnazione
    const { data: assignment } = await supabase
      .from('lead_assignments')
      .select('team_id, lead_id')
      .eq('id', assignmentId)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Verifica permessi
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', assignment.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Not authorized to remove assignment' },
        { status: 403 }
      )
    }

    // Rimuovi assegnazione
    const { error: deleteError } = await supabase
      .from('lead_assignments')
      .delete()
      .eq('id', assignmentId)

    if (deleteError) {
      return NextResponse.json({ error: 'Error removing assignment' }, { status: 500 })
    }

    // Aggiorna lead
    await supabase
      .from('leads')
      .update({ assigned_to: null })
      .eq('id', assignment.lead_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in assignments DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
