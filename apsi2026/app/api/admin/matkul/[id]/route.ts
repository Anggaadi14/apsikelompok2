import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_mata_kuliah = Number(id);
    if (!Number.isInteger(id_mata_kuliah) || id_mata_kuliah <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_mata_kuliah tidak valid.' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));

    const patch: Record<string, unknown> = {};
    if (body.kode_mk !== undefined) {
      const v = String(body.kode_mk || '').trim();
      if (!v || v.length > 30) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode MK wajib (maks 30).' }, { status: 400 });
      patch.kode_mk = v;
    }
    if (body.nama_mk !== undefined) {
      const v = String(body.nama_mk || '').trim();
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Nama MK wajib.' }, { status: 400 });
      patch.nama_mk = v;
    }
    if (body.nama_mk_en !== undefined) {
      const raw = body.nama_mk_en;
      patch.nama_mk_en = raw === null || raw === '' ? null : String(raw).trim();
    }
    if (body.singkatan !== undefined) {
      const raw = body.singkatan;
      patch.singkatan = raw === null || raw === '' ? null : String(raw).trim();
    }
    if (body.sks !== undefined) {
      const v = Number(body.sks);
      if (!Number.isFinite(v) || v < 0 || v > 99) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'SKS harus 0..99.' }, { status: 400 });
      patch.sks = v;
    }

    const linksProvided = Array.isArray(body?.links);
    const links: Array<{ id_kurikulum: number; is_wajib?: number | boolean; semester_default?: number | null }> = linksProvided ? body.links : [];

    if (Object.keys(patch).length === 0 && !linksProvided) {
      return NextResponse.json({ success: false, error: 'NOTHING_TO_UPDATE', message: 'Tidak ada perubahan.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    if (Object.keys(patch).length > 0) {
      const { error } = await admin.from('mata_kuliah').update(patch).eq('id_mata_kuliah', id_mata_kuliah);
      if (error) {
        const msg = error.code === '23505' ? 'Kode MK sudah dipakai.' : 'Gagal update MK.';
        return NextResponse.json({ success: false, error: 'DUPLICATE_OR_FK', message: msg }, { status: 409 });
      }
    }
    if (linksProvided) {
      await admin.from('kurikulum_mk').delete().eq('id_mata_kuliah', id_mata_kuliah);
      const linkRows = links
        .map((lk) => ({
          id_kurikulum: Number(lk?.id_kurikulum),
          id_mata_kuliah,
          is_wajib: !(lk?.is_wajib === false || lk?.is_wajib === 0),
          semester_default: lk?.semester_default != null && lk.semester_default !== ('' as unknown) ? Number(lk.semester_default) : null,
        }))
        .filter((lk) => Number.isInteger(lk.id_kurikulum) && lk.id_kurikulum > 0);
      if (linkRows.length > 0) {
        const { error: linkErr } = await admin.from('kurikulum_mk').insert(linkRows);
        if (linkErr) throw linkErr;
      }
    }

    return NextResponse.json({ success: true, message: 'Mata kuliah berhasil diperbarui.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PATCH /api/admin/matkul/:id]', err);
    return serverError('Gagal update mata kuliah.');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const id_mata_kuliah = Number(id);
    if (!Number.isInteger(id_mata_kuliah) || id_mata_kuliah <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_mata_kuliah tidak valid.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const [{ count: cntCpmk }, { count: cntKelas }] = await Promise.all([
      admin.from('cpmk').select('id_cpmk', { count: 'exact', head: true }).eq('id_mata_kuliah', id_mata_kuliah),
      admin.from('kelas_mk').select('id_kelas', { count: 'exact', head: true }).eq('id_mata_kuliah', id_mata_kuliah),
    ]);
    if ((cntCpmk ?? 0) + (cntKelas ?? 0) > 0) {
      return NextResponse.json({
        success: false, error: 'HAS_REFS',
        message: `Mata kuliah masih dipakai (CPMK: ${cntCpmk}, kelas tayang: ${cntKelas}). Hapus relasi dulu.`,
      }, { status: 409 });
    }

    // kurikulum_mk akan ikut terhapus CASCADE
    const { error } = await admin.from('mata_kuliah').delete().eq('id_mata_kuliah', id_mata_kuliah);
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Mata kuliah berhasil dihapus.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/matkul/:id]', err);
    return serverError('Gagal hapus mata kuliah.');
  }
}
