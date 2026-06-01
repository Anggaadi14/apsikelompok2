// app/api/mahasiswa/riwayat/route.ts
//
// ENDPOINT: GET /api/mahasiswa/riwayat
//
// Mengembalikan riwayat nilai per mata kuliah untuk mahasiswa yang login.
// Data diambil dari:
//   nilai_detail → komponen_nilai → mata_kuliah
//
// RESPONSE FORMAT (sesuai RiwayatNilaiItem di data.ts):
// {
//   success: true,
//   data: RiwayatNilaiItem[]
// }
//
// AUTH: X-User-Session header

import { NextRequest } from 'next/server';
import { getDb } from '@/app/lib/db';
import type mysql from 'mysql2/promise';

// ─────────────────────────────────────────────
// Konversi nilai angka → huruf mutu UNS
// ─────────────────────────────────────────────
function nilaiToHuruf(nilai: number): string {
  if (nilai >= 87) return 'A';
  if (nilai >= 82) return 'A-';
  if (nilai >= 78) return 'B+';
  if (nilai >= 74) return 'B';
  if (nilai >= 70) return 'B-';
  if (nilai >= 65) return 'C+';
  if (nilai >= 60) return 'C';
  if (nilai >= 55) return 'D';
  return 'E';
}

// ─────────────────────────────────────────────
// Konversi semester + tahun_akademik → nomor semester
// Heuristik: semester 1 = angkatan ganjil pertama, dst.
// ─────────────────────────────────────────────
function parseSemesterNumber(tahun: string, semester: string): number {
  // Format tahun: "2020/2021", semester: "ganjil"|"genap"
  try {
    const startYear = parseInt(tahun.split('/')[0], 10);
    // Anggap angkatan = 2020 (hardcode ke profil mahasiswa)
    // tahun 2020 ganjil = smt 1, 2020 genap = smt 2, 2021 ganjil = smt 3, dst.
    const diff = startYear - 2020; // 0, 1, 2, ...
    const base = diff * 2;
    return semester === 'ganjil' ? base + 1 : base + 2;
  } catch {
    return 0;
  }
}

interface MkValueRow {
  kode_mk: string;
  nama_mk: string;
  sks: number;
  plot_semester: number;
  tahun_akademik: string;
  semester: string;
  // Kolom nilai per komponen (kita ambil semua lalu kelompokkan)
  nama_komponen: string;
  nilai_asli: number;
}

export async function GET(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────
  const sessionHeader = request.headers.get('X-User-Session');
  if (!sessionHeader) {
    return Response.json(
      { success: false, error: 'UNAUTHORIZED', message: 'Session tidak ditemukan.' },
      { status: 401 }
    );
  }

  let session: { id: string; role: string };
  try {
    session = JSON.parse(sessionHeader);
  } catch {
    return Response.json(
      { success: false, error: 'INVALID_SESSION' },
      { status: 401 }
    );
  }

  if (session.role !== 'mahasiswa') {
    return Response.json(
      { success: false, error: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  const idMahasiswa = parseInt(session.id.replace('mhs_', ''), 10);
  if (isNaN(idMahasiswa)) {
    return Response.json(
      { success: false, error: 'INVALID_SESSION' },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    // Query semua nilai detail mahasiswa, join ke komponen & MK
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT
          mk.kode_mk,
          mk.nama_mk,
          mk.sks,
          mk.plot_semester,
          nd.tahun_akademik,
          nd.semester,
          kn.nama_komponen,
          nd.nilai_asli
       FROM nilai_detail nd
       JOIN komponen_nilai kn ON kn.id_komponen = nd.id_komponen
       JOIN mata_kuliah mk ON mk.id_mk = kn.id_mk
       WHERE nd.id_mahasiswa = ?
       ORDER BY mk.plot_semester, mk.kode_mk, kn.nama_komponen`,
      [idMahasiswa]
    );

    // Kelompokkan per mata kuliah
    const mkMap = new Map<string, {
      kode: string;
      nama: string;
      sks: number;
      semester: number;
      tahunAkademik: string;
      semesterStr: string;
      komponenMap: Map<string, number>;
    }>();

    for (const row of rows as MkValueRow[]) {
      const key = `${row.kode_mk}_${row.tahun_akademik}_${row.semester}`;
      if (!mkMap.has(key)) {
        mkMap.set(key, {
          kode:          row.kode_mk,
          nama:          row.nama_mk,
          sks:           row.sks,
          semester:      parseSemesterNumber(row.tahun_akademik, row.semester),
          tahunAkademik: row.tahun_akademik,
          semesterStr:   row.semester,
          komponenMap:   new Map(),
        });
      }
      mkMap.get(key)!.komponenMap.set(row.nama_komponen, Number(row.nilai_asli));
    }

    // Build RiwayatNilaiItem array
    const riwayatData = Array.from(mkMap.values())
      .sort((a, b) => a.semester - b.semester || a.kode.localeCompare(b.kode))
      .map((mk, idx) => {
        const komponenEntries = Array.from(mk.komponenMap.entries());
        // Mapping komponen ke uk1-uk5 (urut abjad nama komponen)
        const uk = [0, 0, 0, 0, 0];
        komponenEntries.forEach(([, val], i) => {
          if (i < 5) uk[i] = val;
        });

        // Nilai akhir = rata-rata semua komponen
        const nilaiValues = komponenEntries.map(([, v]) => v);
        const nilaiAkhir =
          nilaiValues.length > 0
            ? nilaiValues.reduce((s, v) => s + v, 0) / nilaiValues.length
            : 0;
        const nilaiAkhirRounded = Math.round(nilaiAkhir * 100) / 100;

        return {
          no:         idx + 1,
          semester:   mk.semester,
          kode:       mk.kode,
          nama:       mk.nama,
          sks:        mk.sks,
          uk1:        uk[0],
          uk2:        uk[1],
          uk3:        uk[2],
          uk4:        uk[3],
          uk5:        uk[4],
          nilaiAkhir: nilaiAkhirRounded,
          skala100:   nilaiAkhirRounded,
          huruf:      nilaiToHuruf(nilaiAkhir),
        };
      });

    return Response.json({ success: true, data: riwayatData });

  } catch (error) {
    console.error('[API] GET /mahasiswa/riwayat error:', error);
    return Response.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Gagal mengambil riwayat nilai.',
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
