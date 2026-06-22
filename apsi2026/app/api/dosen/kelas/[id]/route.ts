import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // 1) Verifikasi dosen mengampu kelas ini
    const { data: ownership } = await admin
      .from('mapping_dosen_kelas')
      .select('peran_di_kelas')
      .eq('id_kelas', idKelas)
      .eq('id_staff', user.id_staff)
      .maybeSingle<{ peran_di_kelas: 'koordinator' | 'anggota' }>();

    if (!ownership) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    // 2) Info kelas + MK + kurikulum
    const { data: kelas, error: kelasErr } = await admin
      .from('kelas_mk')
      .select(
        `id_kelas, kode_kelas, tahun_akademik, semester, kuota,
         mata_kuliah:id_mata_kuliah ( id_mata_kuliah, kode_mk, nama_mk, sks, singkatan ),
         kurikulum:id_kurikulum ( id_kurikulum, kode, nama )`,
      )
      .eq('id_kelas', idKelas)
      .maybeSingle();
    if (kelasErr) throw kelasErr;
    if (!kelas) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' }, { status: 404 });
    }
    const idMataKuliah = (kelas as any).mata_kuliah.id_mata_kuliah;

    // 3) Komponen nilai MK
    const { data: komponen } = await admin
      .from('komponen_nilai')
      .select('id_komponen, kode_media, nama_media, bobot_terhadap_mk, urutan')
      .eq('id_mata_kuliah', idMataKuliah)
      .order('urutan')
      .order('kode_media');

    // 4) Daftar mahasiswa enrolled
    const { data: mahasiswaRows } = await admin
      .from('mahasiswa_kelas')
      .select('enrolled_at, mahasiswa:id_mahasiswa ( id_mahasiswa, nim, nama_mahasiswa, email_sso )')
      .eq('id_kelas', idKelas);
    const mahasiswa = (mahasiswaRows ?? [])
      .map((r: any) => ({ id_mahasiswa: r.mahasiswa.id_mahasiswa, nim: r.mahasiswa.nim, nama_mahasiswa: r.mahasiswa.nama_mahasiswa, email: r.mahasiswa.email_sso, enrolled_at: r.enrolled_at }))
      .sort((a: any, b: any) => (a.nim ?? '').localeCompare(b.nim ?? ''));

    // 5) Co-pengampu (dosen lain di kelas yang sama)
    const { data: pengampuRows } = await admin
      .from('mapping_dosen_kelas')
      .select('peran_di_kelas, staff:id_staff ( id_staff, nama_lengkap, email_sso, nip_nidn_nik )')
      .eq('id_kelas', idKelas);
    const pengampu = (pengampuRows ?? [])
      .map((r: any) => ({ id_staff: r.staff.id_staff, nama_lengkap: r.staff.nama_lengkap, email: r.staff.email_sso, nip_nidn_nik: r.staff.nip_nidn_nik, peran_di_kelas: r.peran_di_kelas }))
      .sort((a: any, b: any) => (a.peran_di_kelas === b.peran_di_kelas ? (a.nama_lengkap ?? '').localeCompare(b.nama_lengkap ?? '') : a.peran_di_kelas === 'koordinator' ? -1 : 1));

    return NextResponse.json({
      success: true,
      data: { kelas, peran_dosen_login: ownership.peran_di_kelas, komponen_nilai: komponen, mahasiswa, pengampu },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/kelas/[id]]', err);
    return serverError('Gagal memuat detail kelas.');
  }
}
