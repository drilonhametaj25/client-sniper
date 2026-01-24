/**
 * API endpoint per gestione team
 * GET: Ottiene info team corrente
 * POST: Crea nuovo team
 * PUT: Aggiorna team
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface Team {
  id: string
  name: string
  owner_id: string
  plan: string
  max_members: number
  logo_url: string | null
  description: string | null
  created_at: string
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  can_view_all_leads: boolean
  can_export: boolean
  can_delete: boolean
  can_invite: boolean
  can_manage_settings: boolean
  status: string
  joined_at: string
  user?: {
    email: string
    name: string
  }
}

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

    // Verifica che l'utente abbia piano agency
    const { data: profile } = await supabase
      .from('users')
      .select('plan, current_team_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.plan !== 'agency') {
      return NextResponse.json(
        { error: 'Team management requires Agency plan' },
        { status: 403 }
      )
    }

    // Ottieni il team corrente
    const { data: teamMembership } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        teams (
          id,
          name,
          owner_id,
          plan,
          max_members,
          logo_url,
          description,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!teamMembership) {
      return NextResponse.json({ team: null, members: [] })
    }

    const team = (teamMembership as any).teams as Team

    // Ottieni i membri del team
    const { data: members } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        can_view_all_leads,
        can_export,
        can_delete,
        can_invite,
        can_manage_settings,
        status,
        joined_at
      `)
      .eq('team_id', team.id)
      .eq('status', 'active')
      .order('role', { ascending: true })

    // Ottieni info utenti
    const memberUserIds = members?.map(m => m.user_id) || []
    const { data: users } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', memberUserIds)

    const usersMap = new Map(users?.map(u => [u.id, u]) || [])

    const membersWithUsers = members?.map(m => ({
      ...m,
      user: usersMap.get(m.user_id)
    })) || []

    // Ottieni inviti pendenti
    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', team.id)
      .eq('status', 'pending')

    // Statistiche team
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id)

    const { count: assignedLeads } = await supabase
      .from('lead_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id)
      .eq('status', 'active')

    return NextResponse.json({
      team,
      members: membersWithUsers,
      invitations: invitations || [],
      stats: {
        totalMembers: members?.length || 0,
        maxMembers: team.max_members,
        pendingInvitations: invitations?.length || 0,
        totalLeads: totalLeads || 0,
        assignedLeads: assignedLeads || 0,
      },
      currentUserRole: teamMembership.role,
    })
  } catch (error) {
    console.error('Error in team GET:', error)
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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verifica piano agency
    const { data: profile } = await supabase
      .from('users')
      .select('plan, name, email')
      .eq('id', user.id)
      .single()

    if (!profile || profile.plan !== 'agency') {
      return NextResponse.json(
        { error: 'Team creation requires Agency plan' },
        { status: 403 }
      )
    }

    // Verifica che l'utente non abbia già un team
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (existingTeam) {
      return NextResponse.json(
        { error: 'You already have a team' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Team name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Crea il team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        owner_id: user.id,
        plan: 'agency',
        max_members: 10,
        description: description || null,
      })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json({ error: 'Error creating team' }, { status: 500 })
    }

    // Aggiungi l'owner come membro
    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'owner',
      can_view_all_leads: true,
      can_export: true,
      can_delete: true,
      can_invite: true,
      can_manage_settings: true,
    })

    // Aggiorna current_team_id dell'utente
    await supabase
      .from('users')
      .update({ current_team_id: team.id })
      .eq('id', user.id)

    return NextResponse.json({ team, success: true })
  } catch (error) {
    console.error('Error in team POST:', error)
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
    const { teamId, name, description, logo_url } = body

    // Verifica che l'utente sia owner o admin del team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role, can_manage_settings')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (!['owner', 'admin'].includes(membership.role) && !membership.can_manage_settings)) {
      return NextResponse.json(
        { error: 'Not authorized to update team' },
        { status: 403 }
      )
    }

    // Aggiorna il team
    const updates: any = { updated_at: new Date().toISOString() }
    if (name) updates.name = name.trim()
    if (description !== undefined) updates.description = description
    if (logo_url !== undefined) updates.logo_url = logo_url

    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error updating team' }, { status: 500 })
    }

    return NextResponse.json({ team, success: true })
  } catch (error) {
    console.error('Error in team PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
