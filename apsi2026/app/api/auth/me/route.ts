import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, handleAuthError, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ProfileRow = {
  id_user: number
  email: string
  role: string
  status: string
  force_password_change: boolean
  verified_at: string | null
  created_at: string
  updated_at: string
  nama_input: string | null
  id_mahasiswa: number | null
  id_staff: number | null
  mahasiswa: { nim: string; nama_mahasiswa: string; angkatan: number | null } | null
  staff: { nip_nidn_nik: string; nama_lengkap: string; peran: string } | null
}

/**
 * GET /api/auth/me
 * Mengembalikan profil lengkap user yang sedang login.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req)
    const admin = createSupabaseAdminClient()

    const { data: user, error } = await admin
      .from('app_user')
      .select(
        `id_user, email, role, status, force_password_change, verified_at, created_at, updated_at,
         nama_input, id_mahasiswa, id_staff,
         mahasiswa:id_mahasiswa ( nim, nama_mahasiswa, angkatan ),
         staff:id_staff ( nip_nidn_nik, nama_lengkap, peran )`,
      )
      .eq('id_user', session.id_user)
      .maybeSingle<ProfileRow>()

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'USER_NOT_FOUND', message: 'User tidak ditemukan.' }, { status: 404 })
    }

    const isMahasiswa = user.role === 'mahasiswa' && !!user.id_mahasiswa
    const displayName = isMahasiswa
      ? user.mahasiswa?.nama_mahasiswa
      : user.staff?.nama_lengkap || user.nama_input || user.email
    const identifier = isMahasiswa ? user.mahasiswa?.nim ?? '' : user.staff?.nip_nidn_nik ?? ''

    return NextResponse.json({
      success: true,
      data: {
        id_user: user.id_user,
        email: user.email,
        role: user.role,
        status: user.status,
        force_password_change: user.force_password_change ? 1 : 0,
        name: displayName,
        identifier,
        verified_at: user.verified_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        mahasiswa: isMahasiswa
          ? { id_mahasiswa: user.id_mahasiswa, nim: user.mahasiswa?.nim, angkatan: user.mahasiswa?.angkatan }
          : null,
        staff: !isMahasiswa && user.id_staff
          ? { id_staff: user.id_staff, nip_nidn_nik: user.staff?.nip_nidn_nik, peran: user.staff?.peran }
          : null,
      },
    })
  } catch (err: any) {
    const a = handleAuthError(err); if (a) return a
    console.error('[GET /api/auth/me]', err)
    return serverError(err?.message || 'Gagal memuat profil.')
  }
}
