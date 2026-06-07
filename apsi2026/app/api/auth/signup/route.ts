// app/api/auth/signup/route.ts
//
// POST /api/auth/signup
// Body: { nama, email, password, role: 'mahasiswa' | 'dosen' }
//
// Flow:
//   1. Validasi input (nama, email format, password >= 6 chars, role allowed)
//   2. Cek email belum ada di tabel user
//   3. Generate token verifikasi (32 bytes hex, 24h expiry)
//   4. Hash password
//   5. Insert user dengan status='pending_verification'
//   6. Kirim email verifikasi via Mailtrap
//   7. Return success + (di dev) verifyUrl untuk testing manual

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { getDb } from '@/app/lib/db'
import { sendVerificationEmail } from '@/app/lib/email'

const ALLOWED_ROLES = ['mahasiswa', 'dosen'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

const TOKEN_EXPIRY_HOURS = 24
const BCRYPT_ROUNDS = 10
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const nama = String(body?.nama ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const role = body?.role as AllowedRole

    // ─── Validasi ──────────────────────────────────
    if (!nama || nama.length < 2) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'Nama wajib diisi (minimal 2 karakter)' },
        { status: 400 },
      )
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'Format email tidak valid' },
        { status: 400 },
      )
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'Password minimal 6 karakter' },
        { status: 400 },
      )
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_INPUT',
          message: 'Role hanya boleh mahasiswa atau dosen. Kaprodi/jamu/admin di-seed oleh sistem.',
        },
        { status: 400 },
      )
    }

    const db = getDb()

    // ─── Cek email duplikat ────────────────────────
    const [existing] = await db.query<any[]>(
      `SELECT id_user, status FROM user WHERE email = ? LIMIT 1`,
      [email],
    )
    if ((existing as any[]).length > 0) {
      const existingUser = (existing as any[])[0]
      if (existingUser.status === 'aktif') {
        return NextResponse.json(
          {
            success: false,
            error: 'EMAIL_TAKEN',
            message: 'Email ini sudah terdaftar. Silakan login.',
          },
          { status: 409 },
        )
      }
      // Kalau pending_verification, kita allow resend (overwrite token)
    }

    // ─── Generate token + hash password ────────────
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    const sandiHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // ─── Insert atau update user pending ───────────
    if ((existing as any[]).length > 0) {
      await db.query(
        `UPDATE user
         SET nama_input = ?, sandi_hash = ?, role = ?,
             token_verifikasi = ?, token_expires_at = ?, status = 'pending_verification',
             updated_at = NOW()
         WHERE email = ?`,
        [nama, sandiHash, role, token, expiresAt, email],
      )
    } else {
      await db.query(
        `INSERT INTO user (email, sandi_hash, role, status, token_verifikasi, token_expires_at, nama_input)
         VALUES (?, ?, ?, 'pending_verification', ?, ?, ?)`,
        [email, sandiHash, role, token, expiresAt, nama],
      )
    }

    // ─── Kirim email ───────────────────────────────
    const { verifyUrl, sent } = await sendVerificationEmail({
      to: email,
      nama,
      token,
      role,
    })

    return NextResponse.json({
      success: true,
      data: {
        message: sent
          ? `Email verifikasi telah dikirim ke ${email}. Cek inbox (atau Mailtrap inbox kamu untuk demo).`
          : `Email verifikasi belum bisa dikirim karena SMTP belum dikonfigurasi. Gunakan link verifikasi di bawah untuk testing.`,
        email,
        role,
        sent,
        // verifyUrl HANYA di-return di dev mode untuk kemudahan testing
        ...(process.env.NODE_ENV !== 'production' ? { verifyUrl } : {}),
      },
    })
  } catch (err: any) {
    console.error('[POST /api/auth/signup]', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}