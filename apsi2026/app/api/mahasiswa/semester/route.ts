// app/api/mahasiswa/semester/route.ts
//
// ENDPOINT: GET /api/mahasiswa/semester
//
// Mengembalikan daftar semester yang pernah diambil oleh mahasiswa ini.
// Data ini digunakan oleh Navbar (dropdown pilih semester).
//
// Perlu dipahami: Tidak ada tabel semester di schema ini.
// Kita generate daftar semester dari kombinasi unik
// kolom (semester, tahun_akademik) di tabel nilai_detail milik mahasiswa ini.
//
// Contoh output:
//   ["Ganjil 2024/2025", "Genap 2023/2024", "Ganjil 2023/2024"]

import { NextRequest } from 'next/server';
import { getSessionFromRequest, unauthorized, forbidden, serverError } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';
import { formatSemester } from '@/app/lib/grading';
import type mysql from 'mysql2/promise';

interface SemesterRow {
  semester: string;
  tahun_akademik: string;
}

export async function GET(request: NextRequest) {
  // ── Validasi session ──────────────────────────────────────────────────
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (session.role !== 'mahasiswa') return forbidden();

  const nim = session.identifier;

  try {
    const db = getDb();

    // Cari id_mahasiswa
    const [mhsRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_mahasiswa FROM mahasiswa WHERE nim = ? LIMIT 1`,
      [nim]
    );

    if (mhsRows.length === 0) {
      // Kalau tidak ada di DB, kembalikan array default (fallback)
      return Response.json({
        success: true,
        data: ['Ganjil 2024/2025'],
      });
    }

    const idMahasiswa = mhsRows[0].id_mahasiswa as number;

    // Ambil kombinasi unik semester + tahun_akademik dari nilai_detail
    // ORDER BY: tahun terbaru dulu, ganjil sebelum genap
    const [semRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT DISTINCT semester, tahun_akademik
       FROM nilai_detail
       WHERE id_mahasiswa = ?
       ORDER BY tahun_akademik DESC,
                FIELD(semester, 'ganjil', 'genap')`,
      [idMahasiswa]
    );

    if ((semRows as SemesterRow[]).length === 0) {
      // Mahasiswa belum punya nilai → kembalikan tahun berjalan sebagai default
      return Response.json({
        success: true,
        data: ['Ganjil 2024/2025'],
      });
    }

    // Format ke string yang dimengerti Navbar: "Ganjil 2024/2025"
    const daftarSemester = (semRows as SemesterRow[]).map((row) =>
      formatSemester(row.semester, row.tahun_akademik)
    );

    return Response.json({
      success: true,
      data: daftarSemester,
    });

  } catch (error) {
    console.error('[API] GET /mahasiswa/semester error:', error);
    return serverError(error instanceof Error ? error.message : String(error));
  }
}
