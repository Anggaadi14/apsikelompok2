// app/api/auth/complete-mahasiswa/route.ts
//
// POST /api/auth/complete-mahasiswa
// Body: { token, nim }

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body?.token ?? '').trim()
    const nim = String(body?.nim ?? '').trim()

    if (!token) {
      return NextResponse.json({ success: false, error: 'MISSING_TOKEN', message: 'Token verifikasi tidak ada.' }, { status: 400 })
    }
    if (!nim) {
      return NextResponse.json({ success: false, error: 'MISSING_NIM', message: 'NIM wajib diisi.' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    const { data: profile } = await admin
      .from('app_user')
      .select('id_user, email, role, status, token_expires_at')
      .eq('token_verifikasi', token)
      .maybeSingle<{ id_user: number; email: string; role: string; status: string; token_expires_at: string | null }>()

    if (!profile) {
      return NextResponse.json({ success: false, error: 'INVALID_TOKEN', message: 'Token tidak valid.' }, { status: 400 })
    }
    if (profile.role !== 'mahasiswa') {
      return NextResponse.json(
        { success: false, error: 'INVALID_ROLE', message: 'Endpoint ini hanya untuk mahasiswa.' },
        { status: 400 },
      )
    }
    if (profile.status === 'aktif') {
      return NextResponse.json(
        { success: false, error: 'ALREADY_VERIFIED', message: 'Akun sudah diverifikasi. Silakan login.' },
        { status: 400 },
      )
    }
    if (profile.token_expires_at && new Date(profile.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'TOKEN_EXPIRED', message: 'Link verifikasi kedaluwarsa. Silakan daftar ulang.' },
        { status: 400 },
      )
    }

    const { data: mhs } = await admin
      .from('mahasiswa')
      .select('id_mahasiswa, nama_mahasiswa')
      .eq('nim', nim)
      .maybeSingle<{ id_mahasiswa: number; nama_mahasiswa: string }>()

    if (!mhs) {
      return NextResponse.json(
        {
          success: false,
          error: 'NIM_NOT_FOUND',
          message: 'NIM tidak terdaftar di sistem. Pastikan NIM benar atau hubungi admin prodi.',
        },
        { status: 404 },
      )
    }

    const { data: existingLink } = await admin
      .from('app_user')
      .select('id_user')
      .eq('id_mahasiswa', mhs.id_mahasiswa)
      .neq('id_user', profile.id_user)
      .maybeSingle()

    if (existingLink) {
      return NextResponse.json(
        { success: false, error: 'NIM_TAKEN', message: 'NIM ini sudah dipakai akun lain. Hubungi admin prodi jika ini kesalahan.' },
        { status: 409 },
      )
    }

    await admin
      .from('app_user')
      .update({
        id_mahasiswa: mhs.id_mahasiswa,
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
        role: 'mahasiswa',
        email: profile.email,
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
