import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_cpmk = Number(id);
    if (!Number.isInteger(id_cpmk) || id_cpmk <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpmk tidak valid.' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));

    const sets: string[] = [];
    const params: unknown[] = [];
    if (body.kode_cpmk !== undefined) {
      const v = String(body.kode_cpmk || '').trim();
      if (!v || v.length > 30) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode CPMK wajib (maks 30).' }, { status: 400 });
      sets.push('kode_cpmk=?'); params.push(v);
    }
    if (body.deskripsi_id !== undefined) {
      const v = String(body.deskripsi_id || '').trim();
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi (ID) wajib.' }, { status: 400 });
      sets.push('deskripsi_id=?'); params.push(v);
    }
    if (body.deskripsi_en !== undefined) {
      const raw = body.deskripsi_en;
      const v = raw === null || raw === '' ? null : String(raw).trim();
      sets.push('deskripsi_en=?'); params.push(v);
    }
    if (body.urutan !== undefined) {
      sets.push('urutan=?'); params.push(Number(body.urutan) || 0);
    }
    if (body.id_mata_kuliah !== undefined) {
      const v = Number(body.id_mata_kuliah);
      if (!Number.isInteger(v) || v <= 0) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_mata_kuliah tidak valid.' }, { status: 400 });
      sets.push('id_mata_kuliah=?'); params.push(v);
    }
    if (sets.length === 0) {
      return NextResponse.json({ success: false, error: 'NOTHING_TO_UPDATE', message: 'Tidak ada perubahan.' }, { status: 400 });
    }
    params.push(id_cpmk);

    try {
      await query(`UPDATE cpmk SET ${sets.join(', ')} WHERE id_cpmk=?`, params);
    } catch (e: unknown) {
      const msg = (e as { code?: string })?.code === 'ER_DUP_ENTRY' ? 'Kombinasi MK + Kode CPMK sudah ada.' : 'Gagal update.';
      return NextResponse.json({ success: false, error: 'DUPLICATE_OR_FK', message: msg }, { status: 409 });
    }
    return NextResponse.json({ success: true, message: 'CPMK berhasil diperbarui.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PATCH /api/admin/cpmk/:id]', err);
    return serverError('Gagal update CPMK.');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_cpmk = Number(id);
    if (!Number.isInteger(id_cpmk) || id_cpmk <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpmk tidak valid.' }, { status: 400 });
    }

    const refs = (await query(
      `SELECT (SELECT COUNT(*) FROM mapping_cpmk_ik WHERE id_cpmk=?) AS cnt_ik,
              (SELECT COUNT(*) FROM mapping_media_cpmk WHERE id_cpmk=?) AS cnt_media`,
      [id_cpmk, id_cpmk],
    )) as Array<{cnt_ik:number; cnt_media:number}>;
    const r = refs[0];
    if (r && (Number(r.cnt_ik) + Number(r.cnt_media)) > 0) {
      return NextResponse.json({
        success: false, error: 'HAS_REFS',
        message: `CPMK masih dipakai (mapping IK: ${r.cnt_ik}, mapping media/komponen nilai: ${r.cnt_media}). Hapus relasi dulu.`,
      }, { status: 409 });
    }

    await query(`DELETE FROM cpmk WHERE id_cpmk=?`, [id_cpmk]);
    return NextResponse.json({ success: true, message: 'CPMK berhasil dihapus.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/cpmk/:id]', err);
    return serverError('Gagal hapus CPMK.');
  }
}