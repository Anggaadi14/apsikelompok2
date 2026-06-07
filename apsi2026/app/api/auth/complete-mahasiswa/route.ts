// app/api/auth/complete-mahasiswa/route.ts
//
// POST /api/auth/complete-mahasiswa
// Body: { token, nim }
//
// Flow:
//   1. Cari user by token (harus role='mahasiswa', status='pending_verification', belum expired)
//   2. Cari mahasiswa by NIM
//   3. Cek NIM belum di-link user lain
//   4. Link user.id_mahasiswa + aktivasi

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/app/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body?.token ?? '').trim()
    const nim = String(body?.nim ?? '').trim()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'MISSING_TOKEN', message: 'Token verifikasi tidak ada.' },
        { status: 400 },
      )
    }
    if (!nim) {
      return NextResponse.json(
        { success: false, error: 'MISSING_NIM', message: 'NIM wajib diisi.' },
        { status: 400 },
      )
    }

    const db = getDb()

    // ─── Cari user by token ────────────────────────
    const [userRows] = await db.query<any[]>(
      `SELECT id_user, email, role, status, token_expires_at
       FROM user
       WHERE token_verifikasi = ?
       LIMIT 1`,
      [token],
    )
    const user = (userRows as any[])[0]
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN', message: 'Token tidak valid.' },
        { status: 400 },
      )
    }
    if (user.role !== 'mahasiswa') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_ROLE',
          message: 'Endpoint ini hanya untuk mahasiswa.',
        },
        { status: 400 },
      )
    }
    if (user.status === 'aktif') {
      return NextResponse.json(
        {
          success: false,
          error: 'ALREADY_VERIFIED',
          message: 'Akun sudah diverifikasi. Silakan login.',
        },
        { status: 400 },
      )
    }
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Link verifikasi kedaluwarsa. Silakan daftar ulang.',
        },
        { status: 400 },
      )
    }

    // ─── Cari mahasiswa by NIM ─────────────────────
    const [mhsRows] = await db.query<any[]>(
      `SELECT m.id_mahasiswa, m.nama_mahasiswa,
              (SELECT id_user FROM user WHERE id_mahasiswa = m.id_mahasiswa LIMIT 1) AS existing_user
       FROM mahasiswa m
       WHERE m.nim = ?
       LIMIT 1`,
      [nim],
    )
    const mhs = (mhsRows as any[])[0]
    if (!mhs) {
      return NextResponse.json(
        {
          success: false,
          error: 'NIM_NOT_FOUND',
          message:
            'NIM tidak terdaftar di sistem. Pastikan NIM benar atau hubungi admin prodi.',
        },
        { status: 404 },
      )
    }

    if (mhs.existing_user && mhs.existing_user !== user.id_user) {
      return NextResponse.json(
        {
          success: false,
          error: 'NIM_TAKEN',
          message: 'NIM ini sudah dipakai akun lain. Hubungi admin prodi jika ini kesalahan.',
        },
        { status: 409 },
      )
    }

    // ─── Link & aktivasi ────────────────────────────
    await db.query(
      `UPDATE user
       SET id_mahasiswa = ?, status = 'aktif', verified_at = NOW(),
           token_verifikasi = NULL, token_expires_at = NULL
       WHERE id_user = ?`,
      [mhs.id_mahasiswa, user.id_user],
    )

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        role: 'mahasiswa',
        email: user.email,
        nama: mhs.nama_mahasiswa,
        nim,
        message: 'Verifikasi berhasil. Silakan login.',
      },
    })
  } catch (err: any) {
    console.error('[POST /api/auth/complete-mahasiswa]', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}