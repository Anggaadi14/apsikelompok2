// app/api/auth/signup/route.ts
//
// POST /api/auth/signup
// Body: { nama, email, password, role: 'mahasiswa' | 'dosen' }
//
// Password storage/auth itself is Supabase Auth's job now (auth.users).
// app_user keeps its own pending_verification gate + token so the existing
// branded-email verification UX (app/lib/email.ts, app/verify/page.tsx)
// keeps working unchanged.

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { sendVerificationEmail } from '@/app/lib/email'

const ALLOWED_ROLES = ['mahasiswa', 'dosen'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

const TOKEN_EXPIRY_HOURS = 24
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const nama = String(body?.nama ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const role = body?.role as AllowedRole

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

    const admin = createSupabaseAdminClient()

    const { data: existing } = await admin
      .from('app_user')
      .select('id_user, auth_user_id, status')
      .eq('email', email)
      .maybeSingle<{ id_user: number; auth_user_id: string; status: string }>()

    if (existing && existing.status === 'aktif') {
      return NextResponse.json(
        { success: false, error: 'EMAIL_TAKEN', message: 'Email ini sudah terdaftar. Silakan login.' },
        { status: 409 },
      )
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()

    if (existing) {
      // Resend case (status masih pending_verification): update password + token.
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.auth_user_id, {
        password,
        email_confirm: true,
      })
      if (updErr) throw updErr

      const { error: upErr } = await admin
        .from('app_user')
        .update({
          nama_input: nama,
          role,
          status: 'pending_verification',
          token_verifikasi: token,
          token_expires_at: expiresAt,
        })
        .eq('id_user', existing.id_user)
      if (upErr) throw upErr
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // verifikasi ditangani sendiri lewat token kustom, bukan oleh Supabase
      })
      if (createErr || !created?.user) {
        const msg = createErr?.message?.toLowerCase() ?? ''
        if (msg.includes('already') || msg.includes('registered')) {
          return NextResponse.json(
            { success: false, error: 'EMAIL_TAKEN', message: 'Email ini sudah terdaftar. Silakan login.' },
            { status: 409 },
          )
        }
        throw createErr ?? new Error('Gagal membuat akun.')
      }

      const { error: insErr } = await admin.from('app_user').insert({
        auth_user_id: created.user.id,
        email,
        role,
        status: 'pending_verification',
        token_verifikasi: token,
        token_expires_at: expiresAt,
        nama_input: nama,
      })
      if (insErr) throw insErr
    }

    const { verifyUrl, sent } = await sendVerificationEmail({ to: email, nama, token, role })

    return NextResponse.json({
      success: true,
      data: {
        message: sent
          ? `Email verifikasi telah dikirim ke ${email}. Cek inbox (atau Mailtrap inbox kamu untuk demo).`
          : `Email verifikasi belum bisa dikirim karena SMTP belum dikonfigurasi. Gunakan link verifikasi di bawah untuk testing.`,
        email,
        role,
        sent,
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
