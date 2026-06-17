import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_ik = Number(id);
    if (!Number.isInteger(id_ik) || id_ik <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));

    const sets: string[] = [];
    const params: unknown[] = [];
    if (body.kode_ik !== undefined) {
      const v = String(body.kode_ik || '').trim();
      if (!v || v.length > 20) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode IK wajib (maks 20).' }, { status: 400 });
      sets.push('kode_ik=?'); params.push(v);
    }
    if (body.deskripsi !== undefined) {
      const v = String(body.deskripsi || '').trim();
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi wajib.' }, { status: 400 });
      sets.push('deskripsi=?'); params.push(v);
    }
    if (body.urutan !== undefined) {
      sets.push('urutan=?'); params.push(Number(body.urutan) || 0);
    }
    if (body.id_cpl !== undefined) {
      const v = Number(body.id_cpl);
      if (!Number.isInteger(v) || v <= 0) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpl tidak valid.' }, { status: 400 });
      sets.push('id_cpl=?'); params.push(v);
    }
    if (sets.length === 0) {
      return NextResponse.json({ success: false, error: 'NOTHING_TO_UPDATE', message: 'Tidak ada perubahan.' }, { status: 400 });
    }
    params.push(id_ik);

    try {
      await query(`UPDATE indikator_kinerja SET ${sets.join(', ')} WHERE id_ik=?`, params);
    } catch (e: unknown) {
      const msg = (e as { code?: string; message?: string })?.code === 'ER_DUP_ENTRY' ? 'Kombinasi CPL + Kode IK sudah ada.' : 'Gagal update.';
      return NextResponse.json({ success: false, error: 'DUPLICATE_OR_FK', message: msg }, { status: 409 });
    }
    return NextResponse.json({ success: true, message: 'IK berhasil diperbarui.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PATCH /api/admin/ik/:id]', err);
    return serverError('Gagal update IK.');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_ik = Number(id);
    if (!Number.isInteger(id_ik) || id_ik <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
    }

    const refs = (await query(
      `SELECT
         (SELECT COUNT(*) FROM mapping_cpmk_ik WHERE id_ik=?) AS cnt_cpmk,
         (SELECT COUNT(*) FROM mapping_ik_cpl WHERE id_ik=?) AS cnt_bobot`,
      [id_ik, id_ik],
    )) as Array<{cnt_cpmk:number; cnt_bobot:number}>;
    const r = refs[0];
    if (r && (Number(r.cnt_cpmk) + Number(r.cnt_bobot)) > 0) {
      return NextResponse.json({
        success: false, error: 'HAS_REFS',
        message: `IK masih dipakai (mapping CPMK: ${r.cnt_cpmk}, bobot CPL: ${r.cnt_bobot}). Hapus relasi dulu.`,
      }, { status: 409 });
    }

    await query(`DELETE FROM indikator_kinerja WHERE id_ik=?`, [id_ik]);
    return NextResponse.json({ success: true, message: 'IK berhasil dihapus.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/ik/:id]', err);
    return serverError('Gagal hapus IK.');
  }
}