import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

type ProfileRow = {
  id_user: number
  role: string
  status: string
  force_password_change: boolean
  id_mahasiswa: number | null
  id_staff: number | null
  nama_input: string | null
  mahasiswa: { nim: string; nama_mahasiswa: string } | null
  staff: { nip_nidn_nik: string; nama_lengkap: string } | null
}

async function resolveEmail(identifier: string): Promise<string | null> {
  if (identifier.includes('@')) return identifier

  const admin = createSupabaseAdminClient()

  const { data: mhs, error: mhsErr } = await admin
    .from('mahasiswa')
    .select('email_sso')
    .eq('nim', identifier)
    .maybeSingle<{ email_sso: string }>()
  if (mhsErr) console.error('[POST /api/auth/login] resolveEmail mahasiswa lookup failed (check SUPABASE_SERVICE_ROLE_KEY):', mhsErr)
  if (mhs) return mhs.email_sso

  const { data: stf, error: stfErr } = await admin
    .from('staff')
    .select('email_sso')
    .eq('nip_nidn_nik', identifier)
    .maybeSingle<{ email_sso: string }>()
  if (stfErr) console.error('[POST /api/auth/login] resolveEmail staff lookup failed (check SUPABASE_SERVICE_ROLE_KEY):', stfErr)
  if (stf) return stf.email_sso

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const identifierRaw = body?.identifier ?? body?.email ?? body?.username ?? ''
    const password = body?.password ?? ''
    const identifier = String(identifierRaw).trim()

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'Email / NIM / NIP dan password wajib diisi' },
        { status: 400 },
      )
    }

    const email = await resolveEmail(identifier)
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: 'Email/NIM/NIP atau password salah' },
        { status: 401 },
      )
    }

    const supabase = await createSupabaseServerClient()
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

    if (signInErr || !signInData.user) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: 'Email/NIM/NIP atau password salah' },
        { status: 401 },
      )
    }

    const admin = createSupabaseAdminClient()
    const { data: profile, error: profileErr } = await admin
      .from('app_user')
      .select(
        `id_user, role, status, force_password_change, id_mahasiswa, id_staff, nama_input,
         mahasiswa:id_mahasiswa ( nim, nama_mahasiswa ),
         staff:id_staff ( nip_nidn_nik, nama_lengkap )`,
      )
      .eq('auth_user_id', signInData.user.id)
      .maybeSingle<ProfileRow>()

    if (profileErr) {
      // Most common cause: SUPABASE_SERVICE_ROLE_KEY misconfigured/truncated
      // in this environment — the admin client can't read app_user even
      // though auth.users sign-in just succeeded. Surface it loudly instead
      // of falling through to a misleading "not registered" message.
      console.error('[POST /api/auth/login] app_user lookup failed (check SUPABASE_SERVICE_ROLE_KEY):', profileErr)
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, error: 'SERVER_ERROR', message: `Gagal memuat profil user: ${profileErr.message}` },
        { status: 500 },
      )
    }

    if (!profile) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: 'Akun tidak terdaftar di sistem.' },
        { status: 401 },
      )
    }

    if (profile.status === 'pending_verification') {
      await supabase.auth.signOut()
      return NextResponse.json(
        {
          success: false,
          error: 'PENDING_VERIFICATION',
          message: 'Akun belum diverifikasi. Silakan cek email untuk link verifikasi.',
        },
        { status: 403 },
      )
    }
    if (profile.status !== 'aktif') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, error: 'ACCOUNT_INACTIVE', message: 'Akun nonaktif. Hubungi admin.' },
        { status: 403 },
      )
    }

    const isMahasiswa = profile.role === 'mahasiswa' && !!profile.id_mahasiswa
    const legacyId = isMahasiswa
      ? `mhs_${profile.id_mahasiswa}`
      : profile.id_staff
        ? `staff_${profile.id_staff}`
        : ''

    const name = isMahasiswa
      ? profile.mahasiswa?.nama_mahasiswa ?? ''
      : profile.staff?.nama_lengkap || profile.nama_input || email

    const identifierOut = isMahasiswa ? profile.mahasiswa?.nim ?? '' : profile.staff?.nip_nidn_nik ?? ''

    const initials = String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const session = {
      id_user: profile.id_user,
      email,
      role: profile.role,
      id_mahasiswa: profile.id_mahasiswa,
      id_staff: profile.id_staff,
      force_password_change: (profile.force_password_change ? 1 : 0) as 0 | 1,
      id: legacyId,
      username: email.split('@')[0],
      name,
      identifier: identifierOut,
      initials,
      prodi: 'Prodi Teknik Industri UNS',
    }

    return NextResponse.json({ success: true, data: session })
  } catch (err: any) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
