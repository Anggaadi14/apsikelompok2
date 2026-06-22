// app/api/auth/google/route.ts
//
// POST /api/auth/google  Body: { credential: <Google ID token> }
//
// Verifies the Google ID token (unchanged from before), then bridges into a
// real Supabase Auth session for that email using an admin-generated magic
// link token exchanged server-side — this is the supported way to mint a
// session for a user without a password (Supabase's admin API has no
// "sign in as user" call for security reasons).

import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

type ProfileRow = {
  id_user: number
  role: string
  status: string
  id_mahasiswa: number | null
  id_staff: number | null
  nama_input: string | null
  mahasiswa: { nim: string; nama_mahasiswa: string } | null
  staff: { nip_nidn_nik: string; nama_lengkap: string } | null
}

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json()
    if (!credential) {
      return NextResponse.json({ success: false, message: 'No credential provided' }, { status: 400 })
    }

    let payload: any
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
      payload = ticket.getPayload()
    } else {
      console.warn('⚠️ GOOGLE_CLIENT_ID is not configured. Bypassing signature verification.')
      payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString())
    }

    if (!payload?.email) {
      return NextResponse.json({ success: false, message: 'Invalid token payload' }, { status: 401 })
    }

    const email = String(payload.email).toLowerCase()
    const name = payload.name || email.split('@')[0]

    let role: 'kaprodi' | 'admin' | 'jamu' | 'mahasiswa' | 'dosen' | null = null
    let tableTarget: 'mahasiswa' | 'staff' | null = null

    if (email === 'kaprodi@kaprodi.uns.ac.id') { role = 'kaprodi'; tableTarget = 'staff' }
    else if (email === 'admin@admin.uns.ac.id') { role = 'admin'; tableTarget = 'staff' }
    else if (email === 'jamu@jamu.uns.ac.id') { role = 'jamu'; tableTarget = 'staff' }
    else if (email.endsWith('@student.uns.ac.id')) { role = 'mahasiswa'; tableTarget = 'mahasiswa' }
    else if (email.endsWith('@staff.uns.ac.id')) { role = 'dosen'; tableTarget = 'staff' }
    else {
      return NextResponse.json({ success: false, message: 'Email tidak diizinkan. Gunakan email UNS.' }, { status: 403 })
    }

    const admin = createSupabaseAdminClient()
    const identifierStr = email.split('@')[0]

    // Mint (or reuse) a magic-link token — this is also how we get/create the
    // underlying auth.users row without ever touching a password.
    let linkRes = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (!linkRes.data?.user) {
      const { error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true })
      if (createErr && !createErr.message?.toLowerCase().includes('already')) throw createErr
      linkRes = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    }
    const authUserId = linkRes.data?.user?.id
    const hashedToken = linkRes.data?.properties?.hashed_token
    if (!authUserId || !hashedToken) throw new Error('Gagal autentikasi Google.')

    const { data: existingProfile } = await admin
      .from('app_user')
      .select(
        `id_user, role, status, id_mahasiswa, id_staff, nama_input,
         mahasiswa:id_mahasiswa ( nim, nama_mahasiswa ),
         staff:id_staff ( nip_nidn_nik, nama_lengkap )`,
      )
      .eq('auth_user_id', authUserId)
      .maybeSingle<ProfileRow>()

    let profile = existingProfile

    if (!profile) {
      let id_mahasiswa: number | null = null
      let id_staff: number | null = null

      if (tableTarget === 'mahasiswa') {
        const { data: mhs } = await admin
          .from('mahasiswa')
          .select('id_mahasiswa')
          .or(`nim.eq.${identifierStr},email_sso.eq.${email}`)
          .maybeSingle<{ id_mahasiswa: number }>()
        if (mhs) {
          id_mahasiswa = mhs.id_mahasiswa
        } else {
          const { data: ins, error: insErr } = await admin
            .from('mahasiswa')
            .insert({ nim: identifierStr, nama_mahasiswa: name, email_sso: email })
            .select('id_mahasiswa')
            .single()
          if (insErr) throw insErr
          id_mahasiswa = ins.id_mahasiswa
        }
      } else if (tableTarget === 'staff') {
        const { data: stf } = await admin
          .from('staff')
          .select('id_staff')
          .or(`nip_nidn_nik.eq.${identifierStr},email_sso.eq.${email}`)
          .maybeSingle<{ id_staff: number }>()
        if (stf) {
          id_staff = stf.id_staff
        } else {
          const { data: ins, error: insErr } = await admin
            .from('staff')
            .insert({ nip_nidn_nik: identifierStr, nama_lengkap: name, email_sso: email, peran: role })
            .select('id_staff')
            .single()
          if (insErr) throw insErr
          id_staff = ins.id_staff
        }
      }

      const { data: insertedUser, error: insUserErr } = await admin
        .from('app_user')
        .insert({
          auth_user_id: authUserId,
          email,
          role,
          status: 'aktif',
          verified_at: new Date().toISOString(),
          id_mahasiswa,
          id_staff,
          nama_input: name,
        })
        .select('id_user, role, status, id_mahasiswa, id_staff, nama_input')
        .single()
      if (insUserErr) throw insUserErr

      profile = { ...insertedUser, mahasiswa: null, staff: null } as ProfileRow
    } else if (profile.status !== 'aktif') {
      return NextResponse.json({ success: false, message: 'Akun nonaktif. Hubungi admin.' }, { status: 403 })
    }

    const supabase = await createSupabaseServerClient()
    const { error: otpErr } = await supabase.auth.verifyOtp({ email, token_hash: hashedToken, type: 'magiclink' })
    if (otpErr) throw otpErr

    const isMahasiswa = profile.role === 'mahasiswa' && !!profile.id_mahasiswa
    const legacyId = isMahasiswa
      ? `mhs_${profile.id_mahasiswa}`
      : profile.id_staff
        ? `staff_${profile.id_staff}`
        : ''
    const displayName = isMahasiswa
      ? profile.mahasiswa?.nama_mahasiswa ?? name
      : profile.staff?.nama_lengkap || profile.nama_input || name
    const identifierOut = isMahasiswa ? profile.mahasiswa?.nim ?? identifierStr : profile.staff?.nip_nidn_nik ?? identifierStr
    const initials = String(displayName || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

    const session = {
      id_user: profile.id_user,
      email,
      role: profile.role,
      id_mahasiswa: profile.id_mahasiswa,
      id_staff: profile.id_staff,
      id: legacyId,
      username: email.split('@')[0],
      name: displayName,
      identifier: identifierOut,
      initials,
      prodi: 'Prodi Teknik Industri UNS',
      force_password_change: 0 as const,
    }

    return NextResponse.json({ success: true, data: session })
  } catch (err: any) {
    console.error('[POST /api/auth/google]', err)
    return NextResponse.json({ success: false, message: err?.message || 'Internal server error' }, { status: 500 })
  }
}
