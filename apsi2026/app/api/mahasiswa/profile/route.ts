// app/api/mahasiswa/profile/route.ts
//
// ENDPOINT: GET /api/mahasiswa/profile
//
// Mengembalikan data profil mahasiswa yang sedang login.
// Setelah migrasi auth ke tabel `user` (Batch 4.5.A), endpoint ini pakai:
//   - requireRole(req, ['mahasiswa']) → return SessionUser (full shape)
//   - session.id_mahasiswa → langsung primary key, skip lookup by NIM

import { NextRequest } from 'next/server';
import type mysql from 'mysql2/promise';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';
import { nilaiKeHuruf } from '@/app/lib/grading';

interface MahasiswaRow {
  id_mahasiswa: number;
  nim: string;
  nama_mahasiswa: string;
  angkatan: number;
}

interface NilaiMKRow {
  sks: number;
  rata_nilai: number;
}

export async function GET(request: NextRequest) {
  try {
    // ── LANGKAH 1: Validasi session + role guard ────────────────────────
    const session = await requireRole(request, ['mahasiswa']);

    if (!session.id_mahasiswa) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Sesi mahasiswa tidak memiliki id_mahasiswa. Silakan logout dan login ulang.',
        },
        { status: 401 },
      );
    }

    const db = getDb();

    // ── LANGKAH 2: Ambil data dasar mahasiswa (by PK, bukan NIM) ────────
    const [mahasiswaRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_mahasiswa, nim, nama_mahasiswa, angkatan
       FROM mahasiswa
       WHERE id_mahasiswa = ?
       LIMIT 1`,
      [session.id_mahasiswa],
    );

    if (mahasiswaRows.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: `Mahasiswa dengan id_mahasiswa ${session.id_mahasiswa} tidak ditemukan di database.`,
        },
        { status: 404 },
      );
    }

    const mahasiswa = mahasiswaRows[0] as MahasiswaRow;

    // ── LANGKAH 3: Hitung semester aktif ─────────────────────────────────
    const [semesterRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT MAX(mk.plot_semester) AS semester_aktif
       FROM nilai_detail nd
       JOIN komponen_nilai kn ON nd.id_komponen = kn.id_komponen
       JOIN mata_kuliah mk    ON kn.id_mk = mk.id_mk
       WHERE nd.id_mahasiswa = ?`,
      [mahasiswa.id_mahasiswa],
    );

    const semesterAktif = (semesterRows[0]?.semester_aktif as number | null) ?? 1;

    // ── LANGKAH 4: Hitung IPK ─────────────────────────────────────────────
    const [nilaiRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT
         mk.sks,
         AVG(COALESCE(nd.nilai_remedi, nd.nilai_asli)) AS rata_nilai
       FROM nilai_detail nd
       JOIN komponen_nilai kn ON nd.id_komponen = kn.id_komponen
       JOIN mata_kuliah mk    ON kn.id_mk = mk.id_mk
       WHERE nd.id_mahasiswa = ?
       GROUP BY mk.id_mk, mk.sks`,
      [mahasiswa.id_mahasiswa],
    );

    const mataKuliahUntukIPK = (nilaiRows as NilaiMKRow[]).map((row) => ({
      sks: row.sks,
      nilaiAngka: Number(row.rata_nilai),
    }));

    let ipk = 0;
    if (mataKuliahUntukIPK.length > 0) {
      let totalMutu = 0;
      let totalSKS = 0;
      for (const mk of mataKuliahUntukIPK) {
        const { bobot } = nilaiKeHuruf(mk.nilaiAngka);
        totalMutu += bobot * mk.sks;
        totalSKS += mk.sks;
      }
      ipk = totalSKS > 0 ? Math.round((totalMutu / totalSKS) * 100) / 100 : 0;
    }

    // ── LANGKAH 5: Kembalikan data ────────────────────────────────────────
    return Response.json({
      success: true,
      data: {
        nim: mahasiswa.nim,
        nama_mahasiswa: mahasiswa.nama_mahasiswa,
        angkatan: mahasiswa.angkatan,
        semester_aktif: semesterAktif,
        ipk: ipk,
        prodi: session.prodi,
      },
    });
  } catch (error) {
    // requireRole akan throw AuthError untuk 401/403 — tangkap lebih dulu
    const authResp = handleAuthError(error);
    if (authResp) return authResp;

    console.error('[API] GET /mahasiswa/profile error:', error);
    return serverError(error instanceof Error ? error.message : String(error));
  }
}