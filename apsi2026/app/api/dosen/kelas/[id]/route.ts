import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' },
        { status: 401 },
      );
    }

    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' },
        { status: 400 },
      );
    }

    // 1) Verifikasi dosen mengampu kelas ini
    const ownership = (await query(
      `SELECT peran_di_kelas FROM mapping_dosen_kelas
       WHERE id_kelas = ? AND id_staff = ? LIMIT 1`,
      [idKelas, user.id_staff],
    )) as Array<{ peran_di_kelas: 'koordinator' | 'anggota' }>;

    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' },
        { status: 403 },
      );
    }

    // 2) Info kelas + MK + kurikulum
    const kelasInfo = (await query(
      `SELECT k.id_kelas, k.kode_kelas, k.tahun_akademik, k.semester, k.kuota,
              mk.id_mata_kuliah, mk.kode_mk, mk.nama_mk, mk.sks, mk.singkatan,
              kur.id_kurikulum, kur.kode AS kode_kurikulum, kur.nama AS nama_kurikulum
       FROM kelas_mk k
       JOIN mata_kuliah mk ON mk.id_mata_kuliah = k.id_mata_kuliah
       JOIN kurikulum kur ON kur.id_kurikulum = k.id_kurikulum
       WHERE k.id_kelas = ? LIMIT 1`,
      [idKelas],
    )) as Array<Record<string, unknown>>;

    if (kelasInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' },
        { status: 404 },
      );
    }
    const kelas = kelasInfo[0];

    // 3) Komponen nilai MK
    const komponen = await query(
      `SELECT id_komponen, kode_media, nama_media, bobot_terhadap_mk, urutan
       FROM komponen_nilai
       WHERE id_mata_kuliah = ?
       ORDER BY urutan, kode_media`,
      [kelas.id_mata_kuliah],
    );

    // 4) Daftar mahasiswa enrolled
    const mahasiswa = await query(
      `SELECT m.id_mahasiswa, m.nim, m.nama_mahasiswa, m.email, mks.enrolled_at
       FROM mahasiswa_kelas mks
       JOIN mahasiswa m ON m.id_mahasiswa = mks.id_mahasiswa
       WHERE mks.id_kelas = ?
       ORDER BY m.nim`,
      [idKelas],
    );

    // 5) Co-pengampu (dosen lain di kelas yang sama)
    const pengampu = await query(
      `SELECT s.id_staff, s.nama_mahasiswa, s.email, s.kode_dosen, mdk.peran_di_kelas
       FROM mapping_dosen_kelas mdk
       JOIN staff s ON s.id_staff = mdk.id_staff
       WHERE mdk.id_kelas = ?
       ORDER BY mdk.peran_di_kelas DESC, s.nama_mahasiswa`,
      [idKelas],
    );

    return NextResponse.json({
      success: true,
      data: {
        kelas,
        peran_dosen_login: ownership[0].peran_di_kelas,
        komponen_nilai: komponen,
        mahasiswa,
        pengampu,
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/kelas/[id]]', err);
    return serverError('Gagal memuat detail kelas.');
  }
}