import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

/* ============================================================
   /api/admin/users/[id]
     PATCH  -> update nama / email / role / status
     DELETE -> soft delete (status='nonaktif')
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'mahasiswa' | 'dosen' | 'kaprodi' | 'jamu' | 'admin';
type Status = 'pending_verification' | 'aktif' | 'nonaktif';

async function loadUser(id: number) {
  const rows = (await query(
    `SELECT u.id_user, u.email, u.role, u.status, u.id_mahasiswa, u.id_staff, u.nama_input
     FROM user u WHERE u.id_user = ? LIMIT 1`,
    [id],
  )) as Array<{
    id_user: number; email: string; role: Role; status: Status;
    id_mahasiswa: number | null; id_staff: number | null; nama_input: string | null;
  }>;
  return rows[0] || null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idUser = Number(id);
    if (!Number.isFinite(idUser) || idUser <= 0)
      return NextResponse.json({ success: false, message: 'ID tidak valid.' }, { status: 400 });

    const existing = await loadUser(idUser);
    if (!existing)
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const newNama   = body.nama   !== undefined ? String(body.nama).trim()                 : null;
    const newEmail  = body.email  !== undefined ? String(body.email).trim().toLowerCase() : null;
    const newRole   = body.role   !== undefined ? String(body.role).trim() as Role        : null;
    const newStatus = body.status !== undefined ? String(body.status).trim() as Status    : null;

    // Validate
    if (newEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
    if (newRole !== null && !['mahasiswa', 'dosen', 'kaprodi', 'jamu', 'admin'].includes(newRole))
      return NextResponse.json({ success: false, message: 'Role tidak valid.' }, { status: 400 });
    if (newStatus !== null && !['pending_verification', 'aktif', 'nonaktif'].includes(newStatus))
      return NextResponse.json({ success: false, message: 'Status tidak valid.' }, { status: 400 });

    // Cegah admin menonaktifkan dirinya sendiri
    if (idUser === session.id_user && newStatus === 'nonaktif')
      return NextResponse.json({ success: false, message: 'Tidak bisa menonaktifkan akun sendiri.' }, { status: 400 });

    // Cegah email duplikat
    if (newEmail && newEmail !== existing.email) {
      const dup = (await query(
        `SELECT id_user FROM user WHERE email = ? AND id_user <> ? LIMIT 1`,
        [newEmail, idUser],
      )) as Array<{ id_user: number }>;
      if (dup.length)
        return NextResponse.json({ success: false, message: 'Email sudah dipakai user lain.' }, { status: 409 });
    }

    // Update user table
    const updates: string[] = [];
    const params: unknown[] = [];
    if (newNama   !== null) { updates.push('nama_input = ?'); params.push(newNama); }
    if (newEmail  !== null) { updates.push('email = ?');      params.push(newEmail); }
    if (newRole   !== null) { updates.push('role = ?');       params.push(newRole); }
    if (newStatus !== null) { updates.push('status = ?');     params.push(newStatus); }

    if (updates.length === 0)
      return NextResponse.json({ success: false, message: 'Tidak ada perubahan.' }, { status: 400 });

    params.push(idUser);
    await query(`UPDATE user SET ${updates.join(', ')} WHERE id_user = ?`, params);

    // Sync ke staff/mahasiswa kalau nama atau email berubah
    if ((newNama !== null || newEmail !== null)) {
      if (existing.id_mahasiswa) {
        const fields: string[] = [];
        const args: unknown[] = [];
        if (newNama !== null)  { fields.push('nama_mahasiswa = ?'); args.push(newNama); }
        if (newEmail !== null) { fields.push('email_sso = ?');      args.push(newEmail); }
        if (fields.length) {
          args.push(existing.id_mahasiswa);
          await query(`UPDATE mahasiswa SET ${fields.join(', ')} WHERE id_mahasiswa = ?`, args);
        }
      }
      if (existing.id_staff) {
        const fields: string[] = [];
        const args: unknown[] = [];
        if (newNama !== null)  { fields.push('nama_lengkap = ?'); args.push(newNama); }
        if (newEmail !== null) { fields.push('email_sso = ?');    args.push(newEmail); }
        if (fields.length) {
          args.push(existing.id_staff);
          await query(`UPDATE staff SET ${fields.join(', ')} WHERE id_staff = ?`, args);
        }
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

    const existing = await loadUser(idUser);
    if (!existing)
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });

    // SOFT DELETE: set status='nonaktif'. Row staff/mahasiswa dibiarkan untuk audit.
    await query(`UPDATE user SET status = 'nonaktif' WHERE id_user = ?`, [idUser]);

    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/users/[id]]', err);
    return serverError('Gagal menonaktifkan user.');
  }
}