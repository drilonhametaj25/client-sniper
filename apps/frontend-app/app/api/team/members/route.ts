/**
 * API endpoint per gestione membri team
 * POST: Invita nuovo membro
 * PUT: Aggiorna permessi membro
 * DELETE: Rimuovi membro
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const RESEND_API_KEY = process.env.RESEND_API_KEY

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

    const body = await request.json()
    const { teamId, email, role = 'member' } = body

    if (!email || !teamId) {
      return NextResponse.json({ error: 'Missing email or teamId' }, { status: 400 })
    }

    // Verifica permessi dell'utente
    const { data: membership } = await supabase
      .from('team_members')
      .select('role, can_invite')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (!['owner', 'admin'].includes(membership.role) && !membership.can_invite)) {
      return NextResponse.json(
        { error: 'Not authorized to invite members' },
        { status: 403 }
      )
    }

    // Verifica che il team non abbia raggiunto il limite
    const { data: team } = await supabase
      .from('teams')
      .select('name, max_members')
      .eq('id', teamId)
      .single()

    const { count: currentMembers } = await supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active')

    if (team && currentMembers && currentMembers >= team.max_members) {
      return NextResponse.json(
        { error: 'Team has reached maximum members limit' },
        { status: 400 }
      )
    }

    // Verifica se l'utente esiste già
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    // Verifica se è già membro
    if (existingUser) {
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a team member' },
          { status: 400 }
        )
      }
    }

    // Verifica se c'è già un invito pendente
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      )
    }

    // Genera token di invito
    const inviteToken = crypto.randomBytes(32).toString('hex')

    // Crea invito
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        token: inviteToken,
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Error creating invitation' }, { status: 500 })
    }

    // Ottieni info invitante
    const { data: inviter } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single()

    // Invia email di invito
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/team/accept?token=${inviteToken}`

    try {
      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'TrovaMi.pro <noreply@trovami.pro>',
            to: [email],
            subject: `${inviter?.name || 'Un collega'} ti ha invitato a unirsi a ${team?.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Sei stato invitato!</h2>
                <p>${inviter?.name || 'Un tuo collega'} ti ha invitato a unirsi al team <strong>${team?.name}</strong> su TrovaMi.pro.</p>
                <p>TrovaMi.pro è la piattaforma che aiuta freelancer e web agency a trovare nuovi clienti analizzando i siti web.</p>
                <p style="margin: 30px 0;">
                  <a href="${inviteUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Accetta Invito
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  Questo invito scade tra 7 giorni.<br>
                  Se non riconosci questo invito, puoi ignorare questa email.
                </p>
              </div>
            `,
          }),
        })
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Non fallire se l'email non viene inviata
    }

    return NextResponse.json({
      success: true,
      invitation,
    })
  } catch (error) {
    console.error('Error in team members POST:', error)
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
    const { memberId, teamId, role, permissions } = body

    // Verifica permessi dell'utente
    const { data: myMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return NextResponse.json(
        { error: 'Not authorized to update members' },
        { status: 403 }
      )
    }

    // Non permettere di modificare l'owner
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('id', memberId)
      .single()

    if (targetMember?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot modify owner permissions' },
        { status: 400 }
      )
    }

    // Solo l'owner può promuovere ad admin
    if (role === 'admin' && myMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can promote to admin' },
        { status: 403 }
      )
    }

    // Aggiorna permessi
    const updates: any = {}
    if (role) updates.role = role
    if (permissions) {
      if (permissions.can_view_all_leads !== undefined) updates.can_view_all_leads = permissions.can_view_all_leads
      if (permissions.can_export !== undefined) updates.can_export = permissions.can_export
      if (permissions.can_delete !== undefined) updates.can_delete = permissions.can_delete
      if (permissions.can_invite !== undefined) updates.can_invite = permissions.can_invite
      if (permissions.can_manage_settings !== undefined) updates.can_manage_settings = permissions.can_manage_settings
    }

    const { data: updatedMember, error: updateError } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error updating member' }, { status: 500 })
    }

    return NextResponse.json({ success: true, member: updatedMember })
  } catch (error) {
    console.error('Error in team members PUT:', error)
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
    const memberId = searchParams.get('memberId')
    const teamId = searchParams.get('teamId')

    if (!memberId || !teamId) {
      return NextResponse.json({ error: 'Missing memberId or teamId' }, { status: 400 })
    }

    // Verifica permessi
    const { data: myMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return NextResponse.json(
        { error: 'Not authorized to remove members' },
        { status: 403 }
      )
    }

    // Non permettere di rimuovere l'owner
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('id', memberId)
      .single()

    if (targetMember?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove team owner' },
        { status: 400 }
      )
    }

    // Solo l'owner può rimuovere admin
    if (targetMember?.role === 'admin' && myMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can remove admins' },
        { status: 403 }
      )
    }

    // Rimuovi membro (soft delete impostando status = 'removed')
    const { error: deleteError } = await supabase
      .from('team_members')
      .update({ status: 'removed' })
      .eq('id', memberId)

    if (deleteError) {
      return NextResponse.json({ error: 'Error removing member' }, { status: 500 })
    }

    // Riassegna i lead assegnati a questo membro
    await supabase
      .from('lead_assignments')
      .update({ status: 'transferred' })
      .eq('assigned_to', targetMember?.user_id)
      .eq('team_id', teamId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in team members DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
