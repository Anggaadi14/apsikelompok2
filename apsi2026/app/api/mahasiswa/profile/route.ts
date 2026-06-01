// app/api/mahasiswa/profile/route.ts
//
// ENDPOINT: GET /api/mahasiswa/profile
//
// Mengembalikan data profil mahasiswa yang sedang login.
// Data ini digunakan oleh komponen ProfileCard di dashboard.
//
// Data yang dikembalikan:
//   - nim, nama_mahasiswa, angkatan (langsung dari tabel mahasiswa)
//   - semester_aktif (dihitung: maks plot_semester dari MK yang sudah ditempuh)
//   - ipk (dihitung dari nilai_detail + komponen_nilai + mata_kuliah)
//
// Query yang dijalankan:
//   1. SELECT dari tabel mahasiswa WHERE nim = ?
//   2. Subquery untuk hitung semester aktif
//   3. Subquery untuk hitung IPK

import { NextRequest } from 'next/server';
import { getSessionFromRequest, unauthorized, forbidden, serverError } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';
import { nilaiKeHuruf } from '@/app/lib/grading';

// Tipe hasil query dari database — sesuai kolom yang di-SELECT
interface MahasiswaRow {
  id_mahasiswa: number;
  nim: string;
  nama_mahasiswa: string;
  angkatan: number;
  status_akun: string;
}

interface NilaiMKRow {
  sks: number;
  rata_nilai: number; // rata-rata nilai komponen per MK
}

export async function GET(request: NextRequest) {
  // ── LANGKAH 1: Validasi session ──────────────────────────────────────────
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized();

  // Endpoint ini hanya boleh diakses oleh mahasiswa
  if (session.role !== 'mahasiswa') return forbidden();

  const nim = session.identifier; // NIM mahasiswa dari session

  try {
    const db = getDb();

    // ── LANGKAH 2: Ambil data dasar mahasiswa ────────────────────────────
    // Query sederhana: cari 1 baris di tabel mahasiswa berdasarkan NIM
    const [mahasiswaRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_mahasiswa, nim, nama_mahasiswa, angkatan, status_akun
       FROM mahasiswa
       WHERE nim = ?
       LIMIT 1`,
      [nim]
    );

    // Jika NIM tidak ditemukan
    if (mahasiswaRows.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: `Mahasiswa dengan NIM ${nim} tidak ditemukan di database.`,
        },
        { status: 404 }
      );
    }

    const mahasiswa = mahasiswaRows[0] as MahasiswaRow;

    // ── LANGKAH 3: Hitung semester aktif ─────────────────────────────────
    // Logika:
    //   - Cari semua MK yang pernah diambil mahasiswa ini (ada di nilai_detail)
    //   - Ambil plot_semester tertinggi = semester aktif mahasiswa
    //   - Jika belum punya nilai sama sekali → semester 1
    //
    // Mengapa query ini kompleks:
    //   nilai_detail → komponen_nilai → mata_kuliah (3 tabel, 2 JOIN)
    const [semesterRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT MAX(mk.plot_semester) AS semester_aktif
       FROM nilai_detail nd
       JOIN komponen_nilai kn ON nd.id_komponen = kn.id_komponen
       JOIN mata_kuliah mk    ON kn.id_mk = mk.id_mk
       WHERE nd.id_mahasiswa = ?`,
      [mahasiswa.id_mahasiswa]
    );

    const semesterAktif = (semesterRows[0]?.semester_aktif as number | null) ?? 1;

    // ── LANGKAH 4: Hitung IPK ─────────────────────────────────────────────
    // Logika:
    //   - Untuk setiap MK yang pernah diambil, ambil rata-rata nilai komponennya
    //   - Konversi rata-rata itu ke bobot mutu (A=4.0, B+=3.3, dst)
    //   - IPK = Σ(bobot × SKS) / Σ(SKS)
    //
    // Catatan: satu MK bisa punya banyak komponen (UTS, UAS, Tugas, dst)
    //          kita rata-ratakan semua komponen untuk dapat "nilai final MK"
    const [nilaiRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT
         mk.sks,
         -- COALESCE: kalau nilai_remedi ada, pakai itu; kalau tidak, pakai nilai_asli
         AVG(COALESCE(nd.nilai_remedi, nd.nilai_asli)) AS rata_nilai
       FROM nilai_detail nd
       JOIN komponen_nilai kn ON nd.id_komponen = kn.id_komponen
       JOIN mata_kuliah mk    ON kn.id_mk = mk.id_mk
       WHERE nd.id_mahasiswa = ?
       GROUP BY mk.id_mk, mk.sks`,
      [mahasiswa.id_mahasiswa]
    );

    // Hitung IPK menggunakan fungsi dari grading.ts
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
        nim:             mahasiswa.nim,
        nama_mahasiswa:  mahasiswa.nama_mahasiswa,
        angkatan:        mahasiswa.angkatan,
        semester_aktif:  semesterAktif,
        ipk:             ipk,
        // Prodi tidak ada di schema mahasiswa — kirim dari session sebagai fallback
        // TODO: tambahkan relasi mahasiswa → prodi ke schema jika dibutuhkan
        prodi:           session.prodi,
      },
    });

  } catch (error) {
    // Log error di server (tidak dikirim ke client di production)
    console.error('[API] GET /mahasiswa/profile error:', error);
    return serverError(error instanceof Error ? error.message : String(error));
  }
}

// Import yang dibutuhkan untuk TypeScript agar mysql2 RowDataPacket dikenali
import type mysql from 'mysql2/promise';
