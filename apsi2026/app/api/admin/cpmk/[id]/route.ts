import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

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

    const patch: Record<string, unknown> = {};
    if (body.kode_cpmk !== undefined) {
      const v = String(body.kode_cpmk || '').trim();
      if (!v || v.length > 30) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode CPMK wajib (maks 30).' }, { status: 400 });
      if (!/^[A-Za-z]+-[0-9]+$/.test(v)) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Format Kode CPMK harus huruf-angka, contoh: MO-1.' }, { status: 400 });
      patch.kode_cpmk = v;
    }
    if (body.deskripsi_id !== undefined) {
      const v = String(body.deskripsi_id || '').trim();
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi (ID) wajib.' }, { status: 400 });
      patch.deskripsi_id = v;
    }
    if (body.deskripsi_en !== undefined) {
      const raw = body.deskripsi_en;
      patch.deskripsi_en = raw === null || raw === '' ? null : String(raw).trim();
    }
    if (body.urutan !== undefined) {
      patch.urutan = Number(body.urutan) || 0;
    }
    if (body.id_mata_kuliah !== undefined) {
      const v = Number(body.id_mata_kuliah);
      if (!Number.isInteger(v) || v <= 0) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_mata_kuliah tidak valid.' }, { status: 400 });
      patch.id_mata_kuliah = v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: 'NOTHING_TO_UPDATE', message: 'Tidak ada perubahan.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('cpmk').update(patch).eq('id_cpmk', id_cpmk);
    if (error) {
      const msg = error.code === '23505' ? 'Kombinasi MK + Kode CPMK sudah ada.' : 'Gagal update.';
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

    const admin = createSupabaseAdminClient();
    const [{ count: cntIk }, { count: cntMedia }] = await Promise.all([
      admin.from('mapping_cpmk_ik').select('id_ik', { count: 'exact', head: true }).eq('id_cpmk', id_cpmk),
      admin.from('mapping_media_cpmk').select('id_komponen', { count: 'exact', head: true }).eq('id_cpmk', id_cpmk),
    ]);
    if ((cntIk ?? 0) + (cntMedia ?? 0) > 0) {
      return NextResponse.json({
        success: false, error: 'HAS_REFS',
        message: `CPMK masih dipakai (mapping IK: ${cntIk}, mapping media/komponen nilai: ${cntMedia}). Hapus relasi dulu.`,
      }, { status: 409 });
    }

    const { error } = await admin.from('cpmk').delete().eq('id_cpmk', id_cpmk);
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'CPMK berhasil dihapus.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/cpmk/:id]', err);
    return serverError('Gagal hapus CPMK.');
  }
}
