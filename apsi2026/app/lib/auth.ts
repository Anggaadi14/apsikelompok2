import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

// =====================================================================
// Types
// =====================================================================

/** 5 kelompok role sesuai notul Zoom */
export type UserRole = 'mahasiswa' | 'dosen' | 'kaprodi' | 'jamu' | 'admin'

/**
 * Session shape dipakai semua endpoint. Identik dengan sebelum migrasi ke
 * Supabase Auth supaya tidak ada call site (41 routes + ~20 file frontend
 * yang menyimpan ini di sessionStorage) yang perlu berubah bentuk.
 */
export interface SessionUser {
  id_user: number
  email: string
  id_mahasiswa: number | null
  id_staff: number | null
  role: UserRole
  force_password_change?: 0 | 1

  // Legacy compat — dipertahankan untuk komponen lama yang sudah ada.
  id: string
  username: string
  name: string
  identifier: string
  initials: string
  prodi: string
}

export class AuthError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_SESSION',
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// =====================================================================
// Session — sumber kebenaran sekarang cookie Supabase Auth, bukan header
// X-User-Session. Header itu masih boleh dikirim frontend (harmless), tapi
// tidak lagi dipercaya untuk otorisasi.
// =====================================================================

type AppUserRow = {
  id_user: number
  role: UserRole
  status: 'aktif' | 'nonaktif' | 'pending_verification'
  force_password_change: boolean
  id_mahasiswa: number | null
  id_staff: number | null
  nama_input: string | null
  mahasiswa: { nim: string; nama_mahasiswa: string } | null
  staff: { nip_nidn_nik: string; nama_lengkap: string } | null
}

function buildInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export async function getSessionUser(_req?: NextRequest): Promise<SessionUser> {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authErr } = await supabase.auth.getUser()

  if (authErr || !authData?.user) {
    throw new AuthError('UNAUTHORIZED', 401, 'Tidak ada sesi yang valid. Silakan login ulang.')
  }
  const authUser = authData.user

  const admin = createSupabaseAdminClient()
  const { data: profile, error: profileErr } = await admin
    .from('app_user')
    .select(
      `id_user, role, status, force_password_change, id_mahasiswa, id_staff, nama_input,
       mahasiswa:id_mahasiswa ( nim, nama_mahasiswa ),
       staff:id_staff ( nip_nidn_nik, nama_lengkap )`,
    )
    .eq('auth_user_id', authUser.id)
    .maybeSingle<AppUserRow>()

  if (profileErr) {
    throw new AuthError('INVALID_SESSION', 401, `Gagal memuat profil user: ${profileErr.message}`)
  }
  if (!profile) {
    throw new AuthError('INVALID_SESSION', 401, 'Profil user tidak ditemukan untuk sesi ini.')
  }
  if (profile.status !== 'aktif') {
    throw new AuthError('FORBIDDEN', 403, 'Akun nonaktif. Hubungi admin.')
  }

  const isMahasiswa = profile.role === 'mahasiswa' && !!profile.id_mahasiswa
  const legacyId = isMahasiswa
    ? `mhs_${profile.id_mahasiswa}`
    : profile.id_staff
      ? `staff_${profile.id_staff}`
      : ''

  const name = isMahasiswa
    ? profile.mahasiswa?.nama_mahasiswa ?? ''
    : profile.staff?.nama_lengkap || profile.nama_input || authUser.email || ''

  const identifier = isMahasiswa
    ? profile.mahasiswa?.nim ?? ''
    : profile.staff?.nip_nidn_nik ?? ''

  return {
    id_user: profile.id_user,
    email: authUser.email ?? '',
    id_mahasiswa: profile.id_mahasiswa,
    id_staff: profile.id_staff,
    role: profile.role,
    force_password_change: profile.force_password_change ? 1 : 0,
    id: legacyId,
    username: (authUser.email ?? '').split('@')[0],
    name,
    identifier,
    initials: buildInitials(name || authUser.email || '?'),
    prodi: 'Prodi Teknik Industri UNS',
  }
}

export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[],
): Promise<SessionUser> {
  const session = await getSessionUser(req)
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError(
      'FORBIDDEN',
      403,
      `Role '${session.role}' tidak diizinkan. Diperlukan: ${allowedRoles.join(', ')}`,
    )
  }
  return session
}

export function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: err.code, message: err.message },
      { status: err.statusCode },
    )
  }
  return null
}

export function serverError(message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: 'SERVER_ERROR', message },
    { status: 500 },
  )
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: 'UNAUTHORIZED', message },
    { status: 401 },
  )
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: 'FORBIDDEN', message },
    { status: 403 },
  )
}
