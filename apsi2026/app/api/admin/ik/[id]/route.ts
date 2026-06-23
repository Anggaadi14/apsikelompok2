import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

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

    const patch: Record<string, unknown> = {};
    if (body.kode_ik !== undefined) {
      const v = String(body.kode_ik || '').trim();
      if (!v || v.length > 20) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode IK wajib (maks 20).' }, { status: 400 });
      if (!/^[A-Za-z]+-[0-9]+$/.test(v)) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Format Kode IK harus huruf-angka, contoh: IK-1.' }, { status: 400 });
      patch.kode_ik = v;
    }
    if (body.deskripsi !== undefined) {
      const v = String(body.deskripsi || '').trim();
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi wajib.' }, { status: 400 });
      patch.deskripsi = v;
    }
    if (body.deskripsi_en !== undefined) {
      const raw = body.deskripsi_en;
      patch.deskripsi_en = raw === null || raw === '' ? null : String(raw).trim();
    }
    if (body.urutan !== undefined) {
      patch.urutan = Number(body.urutan) || 0;
    }
    if (body.id_cpl !== undefined) {
      const v = Number(body.id_cpl);
      if (!Number.isInteger(v) || v <= 0) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpl tidak valid.' }, { status: 400 });
      patch.id_cpl = v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: 'NOTHING_TO_UPDATE', message: 'Tidak ada perubahan.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('indikator_kinerja').update(patch).eq('id_ik', id_ik);
    if (error) {
      const msg = error.code === '23505' ? 'Kombinasi CPL + Kode IK sudah ada.' : 'Gagal update.';
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

    const admin = createSupabaseAdminClient();
    const [{ count: cntCpmk }, { count: cntBobot }] = await Promise.all([
      admin.from('mapping_cpmk_ik').select('id_cpmk', { count: 'exact', head: true }).eq('id_ik', id_ik),
      admin.from('mapping_ik_cpl').select('id_cpl', { count: 'exact', head: true }).eq('id_ik', id_ik),
    ]);
    if ((cntCpmk ?? 0) + (cntBobot ?? 0) > 0) {
      return NextResponse.json({
        success: false, error: 'HAS_REFS',
        message: `IK masih dipakai (mapping CPMK: ${cntCpmk}, bobot CPL: ${cntBobot}). Hapus relasi dulu.`,
      }, { status: 409 });
    }

    const { error } = await admin.from('indikator_kinerja').delete().eq('id_ik', id_ik);
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'IK berhasil dihapus.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/ik/:id]', err);
    return serverError('Gagal hapus IK.');
  }
}
