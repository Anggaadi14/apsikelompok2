import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';
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

    const admin = createSupabaseAdminClient();
    const { data: user } = await admin.from('app_user').select('id_user, auth_user_id, email').eq('id_user', idUser).maybeSingle();
    if (!user)
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });

    const plain = generateRandomPassword(10);
    const { error: authErr } = await admin.auth.admin.updateUserById(user.auth_user_id, { password: plain });
    if (authErr) throw authErr;

    await admin.from('app_user').update({ force_password_change: true }).eq('id_user', idUser);

    return NextResponse.json({
      success: true,
      data: { id_user: idUser, email: user.email, generated_password: plain },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/users/[id]/reset-password]', err);
    return serverError('Gagal reset password.');
  }
}
