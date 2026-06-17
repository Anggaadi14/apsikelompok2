import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';

/* ============================================================
   /api/admin/kelas/[id]/dosen
     GET    -> daftar pengampu kelas
     POST   -> assign / update peran (UPSERT). Auto-demote koordinator lama.
               body: { id_staff, peran_di_kelas: 'koordinator'|'anggota' }
     DELETE -> remove dosen dari kelas. body: { id_staff }
   ============================================================ */

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const rows = await query(
      `SELECT md.id_staff, md.peran_di_kelas,
              s.nama_lengkap, s.email_sso, s.nip_nidn_nik, s.peran
       FROM mapping_dosen_kelas md
       JOIN staff s ON s.id_staff = md.id_staff
       WHERE md.id_kelas = ?
       ORDER BY FIELD(md.peran_di_kelas,'koordinator','anggota'), s.nama_lengkap`,
      [idKelas],
    );
    return NextResponse.json({ success: true, data: { items: rows } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/kelas/[id]/dosen]', err);
    return serverError('Gagal memuat pengampu kelas.');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const id_staff = Number(body.id_staff);
    const peran = String(body.peran_di_kelas ?? 'anggota').toLowerCase();
    if (!Number.isInteger(id_staff) || id_staff <= 0) return bad('id_staff tidak valid.');
    if (peran !== 'koordinator' && peran !== 'anggota')
      return bad('peran_di_kelas harus "koordinator" atau "anggota".');

    const ok = (await query(
      `SELECT 1 FROM staff WHERE id_staff = ? AND peran IN ('dosen','kaprodi') LIMIT 1`,
      [id_staff],
    )) as Array<unknown>;
    if (ok.length === 0) return bad('Staff yang dipilih bukan dosen/kaprodi.');

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      if (peran === 'koordinator') {
        await conn.query(
          `UPDATE mapping_dosen_kelas SET peran_di_kelas = 'anggota'
           WHERE id_kelas = ? AND peran_di_kelas = 'koordinator' AND id_staff <> ?`,
          [idKelas, id_staff],
        );
      }
      await conn.query(
        `INSERT INTO mapping_dosen_kelas (id_kelas, id_staff, peran_di_kelas)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE peran_di_kelas = VALUES(peran_di_kelas)`,
        [idKelas, id_staff, peran],
      );
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }

    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/kelas/[id]/dosen]', err);
    return serverError('Gagal menyimpan pengampu.');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const id_staff = Number(body.id_staff);
    if (!Number.isInteger(id_staff) || id_staff <= 0) return bad('id_staff tidak valid.');

    await query(
      `DELETE FROM mapping_dosen_kelas WHERE id_kelas = ? AND id_staff = ?`,
      [idKelas, id_staff],
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/kelas/[id]/dosen]', err);
    return serverError('Gagal menghapus pengampu.');
  }
}

function bad(message: string) {
  return NextResponse.json({ success: false, error: 'BAD_REQUEST', message }, { status: 400 });
}