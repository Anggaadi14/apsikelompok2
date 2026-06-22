import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

const SEMESTER_ORDER: Record<string, number> = { Ganjil: 0, Genap: 1, Pendek: 2 };

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('mapping_dosen_kelas')
      .select(
        `peran_di_kelas,
         kelas:id_kelas (
           id_kelas, kode_kelas, tahun_akademik, semester, kuota,
           mata_kuliah:id_mata_kuliah ( id_mata_kuliah, kode_mk, nama_mk, sks ),
           kurikulum:id_kurikulum ( kode, nama )
         )`,
      )
      .eq('id_staff', user.id_staff);
    if (error) throw error;

    const kelasIds = (data ?? []).map((r: any) => r.kelas?.id_kelas).filter(Boolean);
    const mhsCounts = new Map<number, number>();
    if (kelasIds.length) {
      const { data: enr } = await admin.from('mahasiswa_kelas').select('id_kelas').in('id_kelas', kelasIds);
      for (const e of enr ?? []) mhsCounts.set(e.id_kelas, (mhsCounts.get(e.id_kelas) ?? 0) + 1);
    }

    const rows = (data ?? [])
      .filter((r: any) => r.kelas)
      .map((r: any) => ({
        id_kelas: r.kelas.id_kelas,
        kode_kelas: r.kelas.kode_kelas,
        tahun_akademik: r.kelas.tahun_akademik,
        semester: r.kelas.semester,
        kuota: r.kelas.kuota,
        id_mata_kuliah: r.kelas.mata_kuliah?.id_mata_kuliah,
        kode_mk: r.kelas.mata_kuliah?.kode_mk,
        nama_mk: r.kelas.mata_kuliah?.nama_mk,
        sks: r.kelas.mata_kuliah?.sks,
        kode_kurikulum: r.kelas.kurikulum?.kode,
        nama_kurikulum: r.kelas.kurikulum?.nama,
        peran_di_kelas: r.peran_di_kelas,
        jumlah_mahasiswa: mhsCounts.get(r.kelas.id_kelas) ?? 0,
      }))
      .sort((a: any, b: any) => b.tahun_akademik.localeCompare(a.tahun_akademik) || SEMESTER_ORDER[a.semester] - SEMESTER_ORDER[b.semester] || (a.kode_mk ?? '').localeCompare(b.kode_mk ?? ''));

    return NextResponse.json({ success: true, data: { kelas: rows, total: rows.length } });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/kelas]', err);
    return serverError('Gagal memuat daftar kelas pengampu.');
  }
}
