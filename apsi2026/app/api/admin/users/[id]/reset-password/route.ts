import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { generateRandomPassword } from '@/app/lib/passwordGen';

/* ============================================================
   /api/admin/users/[id]/reset-password
     POST -> generate password baru, set force_password_change=1.
             Return plaintext SEKALI di response.
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idUser = Number(id);
    if (!Number.isFinite(idUser) || idUser <= 0)
      return NextResponse.json({ success: false, message: 'ID tidak valid.' }, { status: 400 });

    const rows = (await query(
      `SELECT id_user, email FROM user WHERE id_user = ? LIMIT 1`,
      [idUser],
    )) as Array<{ id_user: number; email: string }>;
    if (!rows.length)
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });

    const plain = generateRandomPassword(10);
    const hash = await bcrypt.hash(plain, 10);

    await query(
      `UPDATE user SET sandi_hash = ?, force_password_change = 1 WHERE id_user = ?`,
      [hash, idUser],
    );

    return NextResponse.json({
      success: true,
      data: { id_user: idUser, email: rows[0].email, generated_password: plain },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/users/[id]/reset-password]', err);
    return serverError('Gagal reset password.');
  }
}