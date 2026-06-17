import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let conn: PoolConnection | null = null;
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_mata_kuliah = Number(id);
    if (!Number.isInteger(id_mata_kuliah) || id_mata_kuliah <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_mata_kuliah tidak valid.' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));

    const sets: string[] = [];
    const params: unknown[] = [];
    if (body.kode_mk !== undefined) {
      const v = String(body.kode_mk || '').trim();
      if (!v || v.length > 30) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode MK wajib (maks 30).' }, { status: 400 });
      sets.push('kode_mk=?'); params.push(v);
    }
    if (body.nama_mk !== undefined) {
      const v = String(body.nama_mk || '').trim();
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Nama MK wajib.' }, { status: 400 });
      sets.push('nama_mk=?'); params.push(v);
    }
    if (body.singkatan !== undefined) {
      const raw = body.singkatan;
      const v = raw === null || raw === '' ? null : String(raw).trim();
      sets.push('singkatan=?'); params.push(v);
    }
    if (body.sks !== undefined) {
      const v = Number(body.sks);
      if (!Number.isFinite(v) || v < 0 || v > 99) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'SKS harus 0..99.' }, { status: 400 });
      sets.push('sks=?'); params.push(v);
    }

    const linksProvided = Array.isArray(body?.links);
    const links: Array<{ id_kurikulum:number; is_wajib?:number|boolean; semester_default?:number|null }> = linksProvided ? body.links : [];

    if (sets.length === 0 && !linksProvided) {
      return NextResponse.json({ success: false, error: 'NOTHING_TO_UPDATE', message: 'Tidak ada perubahan.' }, { status: 400 });
    }

    conn = await getConnection();
    await conn.beginTransaction();
    if (sets.length > 0) {
      params.push(id_mata_kuliah);
      try {
        await conn.query(`UPDATE mata_kuliah SET ${sets.join(', ')} WHERE id_mata_kuliah=?`, params);
      } catch (e: unknown) {
        await conn.rollback();
        const msg = (e as { code?: string })?.code === 'ER_DUP_ENTRY' ? 'Kode MK sudah dipakai.' : 'Gagal update MK.';
        return NextResponse.json({ success: false, error: 'DUPLICATE_OR_FK', message: msg }, { status: 409 });
      }
    }
    if (linksProvided) {
      await conn.query(`DELETE FROM kurikulum_mk WHERE id_mata_kuliah=?`, [id_mata_kuliah]);
      for (const lk of links) {
        const idK = Number(lk?.id_kurikulum);
        if (!Number.isInteger(idK) || idK <= 0) continue;
        const wajib = lk?.is_wajib === false || lk?.is_wajib === 0 ? 0 : 1;
        const sem = lk?.semester_default != null && lk.semester_default !== ('' as unknown) ? Number(lk.semester_default) : null;
        await conn.query(
          `INSERT INTO kurikulum_mk (id_kurikulum, id_mata_kuliah, is_wajib, semester_default) VALUES (?,?,?,?)`,
          [idK, id_mata_kuliah, wajib, sem],
        );
      }
    }
    await conn.commit();
    return NextResponse.json({ success: true, message: 'Mata kuliah berhasil diperbarui.' });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    const a = handleAuthError(err); if (a) return a;
    console.error('[PATCH /api/admin/matkul/:id]', err);
    return serverError('Gagal update mata kuliah.');
  } finally { if (conn) conn.release(); }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_mata_kuliah = Number(id);
    if (!Number.isInteger(id_mata_kuliah) || id_mata_kuliah <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_mata_kuliah tidak valid.' }, { status: 400 });
    }

    const refs = (await query(
      `SELECT (SELECT COUNT(*) FROM cpmk WHERE id_mata_kuliah=?) AS cnt_cpmk,
              (SELECT COUNT(*) FROM kelas_mk WHERE id_mk=?) AS cnt_kelas`,
      [id_mata_kuliah, id_mata_kuliah],
    )) as Array<{cnt_cpmk:number; cnt_kelas:number}>;
    const r = refs[0];
    if (r && (Number(r.cnt_cpmk) + Number(r.cnt_kelas)) > 0) {
      return NextResponse.json({
        success: false, error: 'HAS_REFS',
        message: `Mata kuliah masih dipakai (CPMK: ${r.cnt_cpmk}, kelas tayang: ${r.cnt_kelas}). Hapus relasi dulu.`,
      }, { status: 409 });
    }

    // kurikulum_mk akan ikut terhapus CASCADE
    await query(`DELETE FROM mata_kuliah WHERE id_mata_kuliah=?`, [id_mata_kuliah]);
    return NextResponse.json({ success: true, message: 'Mata kuliah berhasil dihapus.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/matkul/:id]', err);
    return serverError('Gagal hapus mata kuliah.');
  }
}