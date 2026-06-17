import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSessionUser, handleAuthError, serverError, hashPassword } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/change-password
 * Body: { oldPassword?: string, newPassword: string, confirmPassword: string }
 *
 * Aturan:
 * - Wajib login (X-User-Session header).
 * - Jika user.force_password_change = 1, oldPassword OPSIONAL (akun baru, password random).
 * - Jika user.force_password_change = 0, oldPassword WAJIB dan harus cocok.
 * - newPassword minimal 8 karakter, harus berbeda dari oldPassword.
 * - Setelah berhasil: sandi_hash diupdate + force_password_change = 0.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const body = await req.json().catch(() => ({}));
    const oldPassword = typeof body?.oldPassword === 'string' ? body.oldPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'WEAK_PASSWORD', message: 'Password baru minimal 8 karakter.' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: 'MISMATCH', message: 'Konfirmasi password tidak cocok.' }, { status: 400 });
    }

    const db = getDb();
    const [rows] = await db.query<any[]>(
      `SELECT id_user, sandi_hash, force_password_change FROM user WHERE id_user = ? LIMIT 1`,
      [session.id_user],
    );
    const user = (rows as any[])[0];
    if (!user) {
      return NextResponse.json({ success: false, error: 'USER_NOT_FOUND', message: 'User tidak ditemukan.' }, { status: 404 });
    }

    const isForce = Number(user.force_password_change) === 1;

    if (!isForce) {
      if (!oldPassword) {
        return NextResponse.json({ success: false, error: 'OLD_PASSWORD_REQUIRED', message: 'Password lama wajib diisi.' }, { status: 400 });
      }
      const okOld = user.sandi_hash ? await bcrypt.compare(oldPassword, user.sandi_hash) : false;
      if (!okOld) {
        return NextResponse.json({ success: false, error: 'WRONG_OLD_PASSWORD', message: 'Password lama salah.' }, { status: 401 });
      }
    } else if (oldPassword) {
      // Force-change: kalau diisi, validasi juga supaya konsisten (opsional).
      const okOld = user.sandi_hash ? await bcrypt.compare(oldPassword, user.sandi_hash) : false;
      if (!okOld) {
        return NextResponse.json({ success: false, error: 'WRONG_OLD_PASSWORD', message: 'Password lama (random) tidak cocok.' }, { status: 401 });
      }
    }

    // Cegah password sama persis
    if (user.sandi_hash && (await bcrypt.compare(newPassword, user.sandi_hash))) {
      return NextResponse.json({ success: false, error: 'SAME_PASSWORD', message: 'Password baru tidak boleh sama dengan password lama.' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await db.query(
      `UPDATE user SET sandi_hash = ?, force_password_change = 0, updated_at = NOW() WHERE id_user = ?`,
      [newHash, session.id_user],
    );

    return NextResponse.json({
      success: true,
      data: {
        message: 'Password berhasil diubah.',
        force_password_change: 0,
      },
    });
  } catch (err: any) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/auth/change-password]', err);
    return serverError(err?.message || 'Gagal mengubah password.');
  }
}
