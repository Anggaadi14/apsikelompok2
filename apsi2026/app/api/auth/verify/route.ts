// app/api/auth/verify/route.ts
//
// GET /api/auth/verify?token=...
//
// Flow per role:
//   - mahasiswa: token valid → return { needs_nim: true, ... } (frontend tampilkan form NIM)
//   - dosen:     token valid → cek email match staff.email_sso (peran='dosen')
//                            → kalau match: link user.id_staff + aktivasi
//                            → kalau tidak match: error NOT_REGISTERED

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/app/lib/db'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'MISSING_TOKEN', message: 'Token verifikasi tidak ada di URL.' },
        { status: 400 },
      )
    }

    const db = getDb()
    const [rows] = await db.query<any[]>(
      `SELECT id_user, email, role, status, nama_input, token_expires_at
       FROM user
       WHERE token_verifikasi = ?
       LIMIT 1`,
      [token],
    )

    const user = (rows as any[])[0]
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Link verifikasi tidak valid atau sudah pernah dipakai.',
        },
        { status: 400 },
      )
    }

    // Cek expired
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Link verifikasi sudah kedaluwarsa. Silakan daftar ulang.',
        },
        { status: 400 },
      )
    }

    if (user.status === 'aktif') {
      return NextResponse.json({
        success: true,
        data: {
          already_verified: true,
          role: user.role,
          email: user.email,
          message: 'Akun sudah diverifikasi sebelumnya. Silakan login.',
        },
      })
    }

    // ─── MAHASISWA: butuh isi NIM dulu ───────────────
    if (user.role === 'mahasiswa') {
      return NextResponse.json({
        success: true,
        data: {
          needs_nim: true,
          role: 'mahasiswa',
          email: user.email,
          nama: user.nama_input,
          token, // dikirim balik ke frontend untuk POST /complete-mahasiswa
        },
      })
    }

    // ─── DOSEN: cek di tabel staff ───────────────────
    if (user.role === 'dosen') {
      const [staffRows] = await db.query<any[]>(
        `SELECT id_staff, nama_lengkap, nip_nidn_nik
         FROM staff
         WHERE email_sso = ? AND peran = 'dosen'
         LIMIT 1`,
        [user.email],
      )
      const staff = (staffRows as any[])[0]

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

      // Cek apakah staff ini sudah di-link ke user lain
      const [linkedRows] = await db.query<any[]>(
        `SELECT id_user FROM user WHERE id_staff = ? AND id_user <> ? LIMIT 1`,
        [staff.id_staff, user.id_user],
      )
      if ((linkedRows as any[]).length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'STAFF_TAKEN',
            message: 'Akun dosen ini sudah dipakai oleh user lain. Hubungi admin.',
          },
          { status: 409 },
        )
      }

      // Link & aktivasi
      await db.query(
        `UPDATE user
         SET id_staff = ?, status = 'aktif', verified_at = NOW(),
             token_verifikasi = NULL, token_expires_at = NULL
         WHERE id_user = ?`,
        [staff.id_staff, user.id_user],
      )

      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          role: 'dosen',
          email: user.email,
          nama: staff.nama_lengkap,
          nip: staff.nip_nidn_nik,
          message: 'Verifikasi berhasil. Silakan login.',
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'INVALID_ROLE', message: 'Role tidak dikenali.' },
      { status: 400 },
    )
  } catch (err: any) {
    console.error('[GET /api/auth/verify]', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}