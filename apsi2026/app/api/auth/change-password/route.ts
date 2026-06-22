import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, handleAuthError, serverError } from '@/app/lib/auth'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/change-password
 * Body: { oldPassword?: string, newPassword: string, confirmPassword: string }
 *
 * Aturan:
 * - Wajib login (cookie session Supabase Auth).
 * - Jika user.force_password_change = 1, oldPassword OPSIONAL (akun baru, password random).
 * - Jika user.force_password_change = 0, oldPassword WAJIB dan harus cocok.
 * - newPassword minimal 8 karakter, harus berbeda dari oldPassword.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req)
    const body = await req.json().catch(() => ({}))
    const oldPassword = typeof body?.oldPassword === 'string' ? body.oldPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'WEAK_PASSWORD', message: 'Password baru minimal 8 karakter.' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: 'MISMATCH', message: 'Konfirmasi password tidak cocok.' }, { status: 400 })
    }
    if (newPassword === oldPassword) {
      return NextResponse.json({ success: false, error: 'SAME_PASSWORD', message: 'Password baru tidak boleh sama dengan password lama.' }, { status: 400 })
    }

    const isForce = session.force_password_change === 1
    if (!isForce && !oldPassword) {
      return NextResponse.json({ success: false, error: 'OLD_PASSWORD_REQUIRED', message: 'Password lama wajib diisi.' }, { status: 400 })
    }

    // Validasi oldPassword (kalau diisi / wajib) dengan re-auth ke Supabase.
    if (oldPassword) {
      const supabase = await createSupabaseServerClient()
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: session.email, password: oldPassword })
      if (reauthErr) {
        return NextResponse.json({ success: false, error: 'WRONG_OLD_PASSWORD', message: 'Password lama salah.' }, { status: 401 })
      }
    }

    const admin = createSupabaseAdminClient()
    const { data: profile } = await admin
      .from('app_user')
      .select('auth_user_id')
      .eq('id_user', session.id_user)
      .maybeSingle<{ auth_user_id: string }>()

    if (!profile) {
      return NextResponse.json({ success: false, error: 'USER_NOT_FOUND', message: 'User tidak ditemukan.' }, { status: 404 })
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(profile.auth_user_id, { password: newPassword })
    if (updErr) throw updErr

    await admin
      .from('app_user')
      .update({ force_password_change: false })
      .eq('id_user', session.id_user)

    return NextResponse.json({
      success: true,
      data: { message: 'Password berhasil diubah.', force_password_change: 0 },
    })
  } catch (err: any) {
    const a = handleAuthError(err); if (a) return a
    console.error('[POST /api/auth/change-password]', err)
    return serverError(err?.message || 'Gagal mengubah password.')
  }
}
