import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

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
    const patch: Record<string, unknown> = {};
    const admin = createSupabaseAdminClient();

    if (body.kode_kelas !== undefined) {
      const v = String(body.kode_kelas).trim().toUpperCase();
      if (!v || v.length > 5) return bad('Kode kelas wajib diisi (maks 5 karakter).');
      patch.kode_kelas = v;
    }
    if (body.kuota !== undefined) {
      const v = body.kuota === null || body.kuota === '' ? null : Number(body.kuota);
      if (v !== null && (!Number.isFinite(v) || v < 0)) return bad('Kuota tidak valid.');
      patch.kuota = v;
    }
    if (body.id_tahun_akademik !== undefined) {
      const n = Number(body.id_tahun_akademik);
      if (!Number.isInteger(n) || n <= 0) return bad('Tahun Akademik tidak valid.');
      const { data: ta } = await admin.from('tahun_akademik').select('tahun_mulai, tahun_selesai, semester').eq('id_tahun_akademik', n).maybeSingle();
      if (!ta) return bad('Tahun Akademik tidak ditemukan.');
      if (ta.semester === 'Pendek') return bad('TA "Pendek" belum didukung.');
      patch.id_tahun_akademik = n;
      patch.tahun_akademik = `${ta.tahun_mulai}/${ta.tahun_selesai}`;
      patch.semester = ta.semester;
    }
    if (Object.keys(patch).length === 0) return bad('Tidak ada perubahan.');

    const { error } = await admin.from('kelas_mk').update(patch).eq('id_kelas', idKelas);
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'DUPLICATE', message: 'Kombinasi MK + TA + Semester + Kode Kelas sudah dipakai kelas lain.' }, { status: 409 });
      }
      throw error;
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

    const admin = createSupabaseAdminClient();
    const { count } = await admin.from('nilai_detail').select('id_nilai', { count: 'exact', head: true }).eq('id_kelas', idKelas);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { success: false, error: 'HAS_NILAI', message: 'Kelas tidak bisa dihapus karena sudah ada nilai mahasiswa yang ter-input. Hapus nilai terlebih dahulu atau arsipkan kelas.' },
        { status: 409 },
      );
    }

    const { error } = await admin.from('kelas_mk').delete().eq('id_kelas', idKelas);
    if (error) throw error;
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
