import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';

/* ============================================================
   /api/admin/kelas/[id]
     PATCH  -> update kuota / kode_kelas / id_tahun_akademik
     DELETE -> hapus kelas (CASCADE: mapping_dosen_kelas + mahasiswa_kelas)
   ============================================================ */

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const sets: string[] = [];
    const params: unknown[] = [];

    if (body.kode_kelas !== undefined) {
      const v = String(body.kode_kelas).trim().toUpperCase();
      if (!v || v.length > 5) return bad('Kode kelas wajib diisi (maks 5 karakter).');
      sets.push('kode_kelas = ?'); params.push(v);
    }
    if (body.kuota !== undefined) {
      const v = body.kuota === null || body.kuota === '' ? null : Number(body.kuota);
      if (v !== null && (!Number.isFinite(v) || v < 0)) return bad('Kuota tidak valid.');
      sets.push('kuota = ?'); params.push(v);
    }
    if (body.id_tahun_akademik !== undefined) {
      const n = Number(body.id_tahun_akademik);
      if (!Number.isInteger(n) || n <= 0) return bad('Tahun Akademik tidak valid.');
      const ta = (await query(
        `SELECT tahun_mulai, tahun_selesai, semester FROM tahun_akademik WHERE id_tahun_akademik = ? LIMIT 1`,
        [n],
      )) as Array<{ tahun_mulai: number; tahun_selesai: number; semester: 'Ganjil'|'Genap'|'Pendek' }>;
      if (ta.length === 0) return bad('Tahun Akademik tidak ditemukan.');
      if (ta[0].semester === 'Pendek') return bad('TA "Pendek" belum didukung.');
      sets.push('id_tahun_akademik = ?'); params.push(n);
      sets.push('tahun_akademik = ?'); params.push(`${ta[0].tahun_mulai}/${ta[0].tahun_selesai}`);
      sets.push('semester = ?'); params.push(ta[0].semester);
    }
    if (sets.length === 0) return bad('Tidak ada perubahan.');

    params.push(idKelas);
    try {
      await query(`UPDATE kelas_mk SET ${sets.join(', ')} WHERE id_kelas = ?`, params);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('uq_kelas') || msg.includes('Duplicate'))
        return NextResponse.json(
          { success: false, error: 'DUPLICATE', message: 'Kombinasi MK + TA + Semester + Kode Kelas sudah dipakai kelas lain.' },
          { status: 409 });
      throw e;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PATCH /api/admin/kelas/[id]]', err);
    return serverError('Gagal memperbarui kelas.');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const hasNilai = (await query(
      `SELECT 1 FROM nilai_detail WHERE id_kelas = ? LIMIT 1`,
      [idKelas],
    )) as Array<unknown>;
    if (hasNilai.length > 0)
      return NextResponse.json(
        { success: false, error: 'HAS_NILAI', message: 'Kelas tidak bisa dihapus karena sudah ada nilai mahasiswa yang ter-input. Hapus nilai terlebih dahulu atau arsipkan kelas.' },
        { status: 409 });

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM kelas_mk WHERE id_kelas = ?`, [idKelas]);
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }

    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/kelas/[id]]', err);
    return serverError('Gagal menghapus kelas.');
  }
}

function bad(message: string) {
  return NextResponse.json({ success: false, error: 'BAD_REQUEST', message }, { status: 400 });
}