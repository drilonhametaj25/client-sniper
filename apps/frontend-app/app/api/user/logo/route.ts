/**
 * API Route - User Logo Upload
 *
 * POST: Carica logo utente su Supabase Storage
 *
 * - Max 2MB
 * - Formati: PNG, JPG, SVG
 * - Bucket: user-assets
 * - Path: logos/{userId}/{filename}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non autenticato' },
        { status: 401 }
      )
    }

    // Ottieni file dal form
    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nessun file caricato' },
        { status: 400 }
      )
    }

    // Validazione tipo file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Formato non supportato. Usa PNG, JPG o SVG.' },
        { status: 400 }
      )
    }

    // Validazione dimensione
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Il file deve essere inferiore a 2MB' },
        { status: 400 }
      )
    }

    // Genera nome file univoco
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `logos/${user.id}/${fileName}`

    // Converti file in buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload su Supabase Storage
    const supabaseAdmin = getSupabaseAdmin()

    // Prima elimina eventuali logo precedenti
    const { data: existingFiles } = await supabaseAdmin.storage
      .from('user-assets')
      .list(`logos/${user.id}`)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `logos/${user.id}/${f.name}`)
      await supabaseAdmin.storage
        .from('user-assets')
        .remove(filesToDelete)
    }

    // Carica nuovo file
    const { error: uploadError } = await supabaseAdmin.storage
      .from('user-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Errore upload logo:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Errore durante il caricamento' },
        { status: 500 }
      )
    }

    // Ottieni URL pubblico
    const { data: urlData } = supabaseAdmin.storage
      .from('user-assets')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Aggiorna profilo utente con URL logo
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ company_logo_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Errore aggiornamento profilo:', updateError)
      // Non è critico, l'upload è comunque riuscito
    }

    console.log(`[Logo Upload] User ${user.id} uploaded logo: ${publicUrl}`)

    return NextResponse.json({
      success: true,
      url: publicUrl
    })

  } catch (error) {
    console.error('Errore API user/logo:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// DELETE: Rimuovi logo utente
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Elimina tutti i file nella cartella dell'utente
    const { data: existingFiles } = await supabaseAdmin.storage
      .from('user-assets')
      .list(`logos/${user.id}`)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `logos/${user.id}/${f.name}`)
      await supabaseAdmin.storage
        .from('user-assets')
        .remove(filesToDelete)
    }

    // Rimuovi URL dal profilo
    await supabaseAdmin
      .from('users')
      .update({ company_logo_url: null })
      .eq('id', user.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Errore DELETE user/logo:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}
