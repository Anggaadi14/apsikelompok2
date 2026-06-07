import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

type KelasRow = {
  id_kelas: number;
  kode_kelas: string | null;
  tahun_akademik: string;
  semester: string;
  kuota: number | null;
  id_mata_kuliah: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  kode_kurikulum: string;
  nama_kurikulum: string;
  peran_di_kelas: 'koordinator' | 'anggota';
  jumlah_mahasiswa: number;
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' },
        { status: 401 },
      );
    }

    const rows = (await query(
      `SELECT
         k.id_kelas, k.kode_kelas, k.tahun_akademik, k.semester, k.kuota,
         mk.id_mata_kuliah, mk.kode_mk, mk.nama_mk, mk.sks,
         kur.kode AS kode_kurikulum, kur.nama AS nama_kurikulum,
         mdk.peran_di_kelas,
         (SELECT COUNT(*) FROM mahasiswa_kelas mks WHERE mks.id_kelas = k.id_kelas) AS jumlah_mahasiswa
       FROM mapping_dosen_kelas mdk
       JOIN kelas_mk k ON k.id_kelas = mdk.id_kelas
       JOIN mata_kuliah mk ON mk.id_mata_kuliah = k.id_mata_kuliah
       JOIN kurikulum kur ON kur.id_kurikulum = k.id_kurikulum
       WHERE mdk.id_staff = ?
       ORDER BY k.tahun_akademik DESC,
                FIELD(k.semester, 'Ganjil', 'Genap', 'Pendek'),
                mk.kode_mk`,
      [user.id_staff],
    )) as KelasRow[];

    return NextResponse.json({
      success: true,
      data: { kelas: rows, total: rows.length },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/kelas]', err);
    return serverError('Gagal memuat daftar kelas pengampu.');
  }
}