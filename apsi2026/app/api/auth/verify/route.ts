// app/api/auth/verify/route.ts
//
// GET /api/auth/verify?token=...
//
// Flow per role (unchanged from before the Supabase migration):
//   - mahasiswa: token valid -> return { needs_nim: true, ... } (frontend tampilkan form NIM)
//   - dosen:     token valid -> cek email match staff.email_sso (peran='dosen')
//                             -> kalau match: link app_user.id_staff + aktivasi
//                             -> kalau tidak match: error NOT_REGISTERED

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'MISSING_TOKEN', message: 'Token verifikasi tidak ada di URL.' },
        { status: 400 },
      )
    }

    const admin = createSupabaseAdminClient()
    const { data: profile } = await admin
      .from('app_user')
      .select('id_user, email, role, status, nama_input, token_expires_at')
      .eq('token_verifikasi', token)
      .maybeSingle<{
        id_user: number
        email: string
        role: string
        status: string
        nama_input: string | null
        token_expires_at: string | null
      }>()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN', message: 'Link verifikasi tidak valid atau sudah pernah dipakai.' },
        { status: 400 },
      )
    }

    if (profile.token_expires_at && new Date(profile.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'TOKEN_EXPIRED', message: 'Link verifikasi sudah kedaluwarsa. Silakan daftar ulang.' },
        { status: 400 },
      )
    }

    if (profile.status === 'aktif') {
      return NextResponse.json({
        success: true,
        data: {
          already_verified: true,
          role: profile.role,
          email: profile.email,
          message: 'Akun sudah diverifikasi sebelumnya. Silakan login.',
        },
      })
    }

    // ─── MAHASISWA: butuh isi NIM dulu ───────────────
    if (profile.role === 'mahasiswa') {
      return NextResponse.json({
        success: true,
        data: {
          needs_nim: true,
          role: 'mahasiswa',
          email: profile.email,
          nama: profile.nama_input,
          token,
        },
      })
    }

    // ─── DOSEN: cek di tabel staff ───────────────────
    if (profile.role === 'dosen') {
      const { data: staff } = await admin
        .from('staff')
        .select('id_staff, nama_lengkap, nip_nidn_nik')
        .eq('email_sso', profile.email)
        .eq('peran', 'dosen')
        .maybeSingle<{ id_staff: number; nama_lengkap: string; nip_nidn_nik: string }>()

      if (!staff) {
        return NextResponse.json(
          {
            success: false,
            error: 'NOT_REGISTERED',
            message:
              'Email Anda belum terdaftar sebagai dosen di sistem. Hubungi admin prodi untuk mendaftarkan akun dosen Anda terlebih dahulu.',
          },
          { status: 403 },
        )
      }

      const { data: linked } = await admin
        .from('app_user')
        .select('id_user')
        .eq('id_staff', staff.id_staff)
        .neq('id_user', profile.id_user)
        .maybeSingle()

      if (linked) {
        return NextResponse.json(
          { success: false, error: 'STAFF_TAKEN', message: 'Akun dosen ini sudah dipakai oleh user lain. Hubungi admin.' },
          { status: 409 },
        )
      }

      await admin
        .from('app_user')
        .update({
          id_staff: staff.id_staff,
          status: 'aktif',
          verified_at: new Date().toISOString(),
          token_verifikasi: null,
          token_expires_at: null,
        })
        .eq('id_user', profile.id_user)

      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          role: 'dosen',
          email: profile.email,
          nama: staff.nama_lengkap,
          nip: staff.nip_nidn_nik,
          message: 'Verifikasi berhasil. Silakan login.',
        },
      })
    }

    return NextResponse.json({ success: false, error: 'INVALID_ROLE', message: 'Role tidak dikenali.' }, { status: 400 })
  } catch (err: any) {
    console.error('[GET /api/auth/verify]', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
