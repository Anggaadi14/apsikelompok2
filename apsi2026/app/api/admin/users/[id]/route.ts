import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/users/[id]
     PATCH  -> update nama / email / role / status
     DELETE -> soft delete (status='nonaktif')
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'mahasiswa' | 'dosen' | 'kaprodi' | 'jamu' | 'admin';
type Status = 'pending_verification' | 'aktif' | 'nonaktif';

async function loadUser(admin: ReturnType<typeof createSupabaseAdminClient>, id: number) {
  const { data } = await admin
    .from('app_user')
    .select('id_user, auth_user_id, email, role, status, id_mahasiswa, id_staff, nama_input')
    .eq('id_user', id)
    .maybeSingle<{
      id_user: number; auth_user_id: string; email: string; role: Role; status: Status;
      id_mahasiswa: number | null; id_staff: number | null; nama_input: string | null;
    }>();
  return data ?? null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idUser = Number(id);
    if (!Number.isFinite(idUser) || idUser <= 0)
      return NextResponse.json({ success: false, message: 'ID tidak valid.' }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const existing = await loadUser(admin, idUser);
    if (!existing)
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const newNama = body.nama !== undefined ? String(body.nama).trim() : null;
    const newEmail = body.email !== undefined ? String(body.email).trim().toLowerCase() : null;
    const newRole = body.role !== undefined ? (String(body.role).trim() as Role) : null;
    const newStatus = body.status !== undefined ? (String(body.status).trim() as Status) : null;

    if (newEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
    if (newRole !== null && !['mahasiswa', 'dosen', 'kaprodi', 'jamu', 'admin'].includes(newRole))
      return NextResponse.json({ success: false, message: 'Role tidak valid.' }, { status: 400 });
    if (newStatus !== null && !['pending_verification', 'aktif', 'nonaktif'].includes(newStatus))
      return NextResponse.json({ success: false, message: 'Status tidak valid.' }, { status: 400 });

    if (idUser === session.id_user && newStatus === 'nonaktif')
      return NextResponse.json({ success: false, message: 'Tidak bisa menonaktifkan akun sendiri.' }, { status: 400 });

    if (newEmail && newEmail !== existing.email) {
      const { data: dup } = await admin.from('app_user').select('id_user').eq('email', newEmail).neq('id_user', idUser).maybeSingle();
      if (dup) return NextResponse.json({ success: false, message: 'Email sudah dipakai user lain.' }, { status: 409 });
    }

    const patch: Record<string, unknown> = {};
    if (newNama !== null) patch.nama_input = newNama;
    if (newEmail !== null) patch.email = newEmail;
    if (newRole !== null) patch.role = newRole;
    if (newStatus !== null) patch.status = newStatus;

    if (Object.keys(patch).length === 0)
      return NextResponse.json({ success: false, message: 'Tidak ada perubahan.' }, { status: 400 });

    if (newEmail !== null) {
      const { error: authErr } = await admin.auth.admin.updateUserById(existing.auth_user_id, { email: newEmail, email_confirm: true });
      if (authErr) throw authErr;
    }

    const { error: upErr } = await admin.from('app_user').update(patch).eq('id_user', idUser);
    if (upErr) throw upErr;

    if (newNama !== null || newEmail !== null) {
      if (existing.id_mahasiswa) {
        const fields: Record<string, unknown> = {};
        if (newNama !== null) fields.nama_mahasiswa = newNama;
        if (newEmail !== null) fields.email_sso = newEmail;
        if (Object.keys(fields).length) await admin.from('mahasiswa').update(fields).eq('id_mahasiswa', existing.id_mahasiswa);
      }
      if (existing.id_staff) {
        const fields: Record<string, unknown> = {};
        if (newNama !== null) fields.nama_lengkap = newNama;
        if (newEmail !== null) fields.email_sso = newEmail;
        if (Object.keys(fields).length) await admin.from('staff').update(fields).eq('id_staff', existing.id_staff);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PATCH /api/admin/users/[id]]', err);
    return serverError('Gagal memperbarui user.');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idUser = Number(id);
    if (!Number.isFinite(idUser) || idUser <= 0)
      return NextResponse.json({ success: false, message: 'ID tidak valid.' }, { status: 400 });

    if (idUser === session.id_user)
      return NextResponse.json({ success: false, message: 'Tidak bisa menghapus akun sendiri.' }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const existing = await loadUser(admin, idUser);
    if (!existing)
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });

    // SOFT DELETE: set status='nonaktif'. Row staff/mahasiswa dibiarkan untuk audit.
    const { error } = await admin.from('app_user').update({ status: 'nonaktif' }).eq('id_user', idUser);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/users/[id]]', err);
    return serverError('Gagal menonaktifkan user.');
  }
}
