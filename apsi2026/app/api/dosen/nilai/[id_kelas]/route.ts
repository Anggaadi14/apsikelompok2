import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id_kelas: string }> }) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const { id_kelas } = await ctx.params;
    const idKelas = Number(id_kelas);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: ownership } = await admin.from('mapping_dosen_kelas').select('id_staff').eq('id_kelas', idKelas).eq('id_staff', user.id_staff).maybeSingle();
    if (!ownership) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    const { data, error } = await admin
      .from('nilai_detail')
      .select(
        `id_nilai, id_mahasiswa, id_komponen, nilai_asli, nilai_remedi, catatan, diinput_at, diupdate_at,
         mahasiswa:id_mahasiswa ( nim, nama_mahasiswa ),
         komponen_nilai:id_komponen ( kode_media, nama_media, urutan )`,
      )
      .eq('id_kelas', idKelas);
    if (error) throw error;

    const rows = (data ?? [])
      .map((r: any) => ({
        id_nilai: r.id_nilai,
        id_mahasiswa: r.id_mahasiswa,
        id_komponen: r.id_komponen,
        nilai_asli: r.nilai_asli,
        nilai_remedi: r.nilai_remedi,
        catatan: r.catatan,
        diinput_at: r.diinput_at,
        diupdate_at: r.diupdate_at,
        nim: r.mahasiswa?.nim,
        nama_mahasiswa: r.mahasiswa?.nama_mahasiswa,
        kode_media: r.komponen_nilai?.kode_media,
        nama_media: r.komponen_nilai?.nama_media,
        _urutan: r.komponen_nilai?.urutan ?? 0,
      }))
      .sort((a: any, b: any) => (a.nim ?? '').localeCompare(b.nim ?? '') || a._urutan - b._urutan || (a.kode_media ?? '').localeCompare(b.kode_media ?? ''))
      .map(({ _urutan, ...rest }: any) => rest);

    return NextResponse.json({ success: true, data: { nilai: rows, total: rows.length } });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/nilai/[id_kelas]]', err);
    return serverError('Gagal memuat nilai kelas.');
  }
}
