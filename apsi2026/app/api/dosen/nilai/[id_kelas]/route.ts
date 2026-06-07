import { notifyKoPengampuOnEdit } from '@/app/lib/notifikasiPengampu';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

type NilaiRow = {
  id_nilai: number;
  id_mahasiswa: number;
  nim: string;
  nama_mahasiswa: string;
  id_komponen: number;
  kode_media: string;
  nama_media: string;
  nilai_asli: number | null;
  nilai_remedi: number | null;
  catatan: string | null;
  diinput_at: string;
  diupdate_at: string;
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ id_kelas: string }> }) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' },
        { status: 401 },
      );
    }

    const { id_kelas } = await ctx.params;
    const idKelas = Number(id_kelas);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' },
        { status: 400 },
      );
    }

    // Verifikasi ownership
    const ownership = (await query(
      `SELECT 1 FROM mapping_dosen_kelas WHERE id_kelas = ? AND id_staff = ? LIMIT 1`,
      [idKelas, user.id_staff],
    )) as Array<unknown>;
    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' },
        { status: 403 },
      );
    }

    // Join nilai_detail + mahasiswa + komponen
    const rows = (await query(
      `SELECT
         nd.id_nilai, nd.id_mahasiswa, nd.id_komponen,
         nd.nilai_asli, nd.nilai_remedi, nd.catatan,
         nd.diinput_at, nd.diupdate_at,
         m.nim, m.nama_mahasiswa,
         kn.kode_media, kn.nama_media
       FROM nilai_detail nd
       JOIN mahasiswa m ON m.id_mahasiswa = nd.id_mahasiswa
       JOIN komponen_nilai kn ON kn.id_komponen = nd.id_komponen
       WHERE nd.id_kelas = ?
       ORDER BY m.nim, kn.urutan, kn.kode_media`,
      [idKelas],
    )) as NilaiRow[];

    return NextResponse.json({
      success: true,
      data: { nilai: rows, total: rows.length },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/nilai/[id_kelas]]', err);
    return serverError('Gagal memuat nilai kelas.');
  }
}