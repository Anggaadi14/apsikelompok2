// app/api/mahasiswa/cpl/route.ts
//
// ENDPOINT: GET /api/mahasiswa/cpl
//
// Mengembalikan data CPL lengkap untuk mahasiswa yang sedang login,
// dihitung dari database melalui rantai:
//   nilai_detail → komponen → CPMK → IK → CPL
//
// RUMUS PERHITUNGAN:
//   1. Nilai CPMK = rata-rata nilai_asli dari semua komponen yang mapping ke CPMK tersebut
//   2. Nilai IK   = Σ (nilai_CPMK × bobot_cpmk_persen / 100)
//   3. Nilai CPL  = Σ (nilai_IK   × bobot_ik_persen   / 100)
//
// RESPONSE FORMAT (sesuai CplDataItem & DetailCplItem di data.ts):
// {
//   success: true,
//   data: {
//     cplData: CplDataItem[],       // untuk DashboardView & bar chart
//     detailCpl: DetailCplItem[],   // untuk CplView dengan breakdown IK & CPMK
//   }
// }
//
// AUTH: membaca X-User-Session header (dikirim oleh fetchWithSession di page.tsx)

import { NextRequest } from 'next/server';
import { getDb } from '@/app/lib/db';
import type mysql from 'mysql2/promise';

// ─────────────────────────────────────────────
// Tipe internal (hasil query DB)
// ─────────────────────────────────────────────

interface CplRow {
  id_cpl: number;
  kode_cpl: string;
  deskripsi: string;
}

interface IkRow {
  id_ik: number;
  id_cpl: number;
  kode_ik: string;
  deskripsi: string;
  bobot_ik_persen: number;
}

interface CpmkMappingRow {
  id_cpmk: number;
  id_ik: number;
  kode_cpmk: string;
  bobot_cpmk_persen: number;
  id_mk: number;
  kode_mk: string;
  nama_mk: string;
  plot_semester: number;
}

interface NilaiRow {
  id_cpmk: number;
  rata_nilai: number;
}

interface KategoriCpl {
  [key: string]: string;
}

// ─────────────────────────────────────────────
// Kategori CPL (tetap, sesuai kurikulum)
// ─────────────────────────────────────────────
const KATEGORI_CPL: KategoriCpl = {
  'CPL-1':  'Pengetahuan',
  'CPL-2':  'Keterampilan Khusus',
  'CPL-3':  'Keterampilan Umum',
  'CPL-4':  'Keterampilan Khusus',
  'CPL-5':  'Keterampilan Umum',
  'CPL-6':  'Sikap',
  'CPL-7':  'Keterampilan Umum',
  'CPL-8':  'Pengetahuan',
  'CPL-9':  'Sikap',
  'CPL-10': 'Keterampilan Khusus',
};

// ─────────────────────────────────────────────
// Konversi nilai angka → huruf mutu
// ─────────────────────────────────────────────
function nilaiToHuruf(nilai: number): string {
  if (nilai >= 87)      return 'A';
  if (nilai >= 82)      return 'A-';
  if (nilai >= 78)      return 'B+';
  if (nilai >= 74)      return 'B';
  if (nilai >= 70)      return 'B-';
  if (nilai >= 65)      return 'C+';
  if (nilai >= 60)      return 'C';
  if (nilai >= 55)      return 'D';
  return 'E';
}

// ─────────────────────────────────────────────
// HANDLER UTAMA
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // ── Auth: baca session dari header ─────────────────────────────────────
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
      { success: false, error: 'INVALID_SESSION', message: 'Format session tidak valid.' },
      { status: 401 }
    );
  }

  if (session.role !== 'mahasiswa') {
    return Response.json(
      { success: false, error: 'FORBIDDEN', message: 'Endpoint ini hanya untuk mahasiswa.' },
      { status: 403 }
    );
  }

  // Ekstrak id_mahasiswa dari session.id ("mhs_{id}")
  const idMahasiswa = parseInt(session.id.replace('mhs_', ''), 10);
  if (isNaN(idMahasiswa)) {
    return Response.json(
      { success: false, error: 'INVALID_SESSION', message: 'ID mahasiswa tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    // ── STEP 1: Ambil semua CPL ───────────────────────────────────────────
    const [cplRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_cpl, kode_cpl, deskripsi FROM cpl ORDER BY id_cpl`
    );
    const cpls = cplRows as CplRow[];

    // ── STEP 2: Ambil semua IK beserta bobot ke CPL ───────────────────────
    const [ikRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_ik, id_cpl, kode_ik, deskripsi, bobot_ik_persen
       FROM mapping_ik_cpl
       ORDER BY id_cpl, id_ik`
    );
    const iks = ikRows as IkRow[];

    // ── STEP 3: Ambil semua CPMK yang ter-mapping ke IK ──────────────────
    const [cpmkRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT
          mci.id_cpmk,
          mci.id_ik,
          c.kode_cpmk,
          mci.bobot_cpmk_persen,
          mk.id_mk,
          mk.kode_mk,
          mk.nama_mk,
          mk.plot_semester
       FROM mapping_cpmk_ik mci
       JOIN cpmk c ON c.id_cpmk = mci.id_cpmk
       JOIN mata_kuliah mk ON mk.id_mk = c.id_mk
       ORDER BY mci.id_ik, mci.id_cpmk`
    );
    const cpmkMappings = cpmkRows as CpmkMappingRow[];

    // ── STEP 4: Hitung nilai rata-rata per CPMK untuk mahasiswa ini ───────
    // Nilai CPMK = rata-rata nilai_asli dari semua komponen yang mapping ke CPMK
    const [nilaiRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT
          mkc.id_cpmk,
          AVG(nd.nilai_asli) AS rata_nilai
       FROM nilai_detail nd
       JOIN komponen_nilai kn ON kn.id_komponen = nd.id_komponen
       JOIN mapping_komponen_cpmk mkc ON mkc.id_komponen = kn.id_komponen
       WHERE nd.id_mahasiswa = ?
       GROUP BY mkc.id_cpmk`,
      [idMahasiswa]
    );

    // Build lookup map: id_cpmk → rata_nilai
    const nilaiCpmkMap = new Map<number, number>();
    for (const row of nilaiRows as NilaiRow[]) {
      nilaiCpmkMap.set(row.id_cpmk, Number(row.rata_nilai));
    }

    // ── STEP 5: Hitung nilai IK dari CPMK yang ter-mapping ───────────────
    // Group cpmkMappings by id_ik
    const cpmkByIk = new Map<number, CpmkMappingRow[]>();
    for (const row of cpmkMappings) {
      if (!cpmkByIk.has(row.id_ik)) cpmkByIk.set(row.id_ik, []);
      cpmkByIk.get(row.id_ik)!.push(row);
    }

    // Nilai IK = Σ (nilaiCpmk × bobot / 100)
    const nilaiIkMap = new Map<number, number>(); // id_ik → nilai
    for (const ik of iks) {
      const cpmksForIk = cpmkByIk.get(ik.id_ik) ?? [];
      if (cpmksForIk.length === 0) {
        nilaiIkMap.set(ik.id_ik, 0);
        continue;
      }

      let totalBobotAda = 0;
      let nilaiIk = 0;
      for (const cpmk of cpmksForIk) {
        const nilaiCpmk = nilaiCpmkMap.get(cpmk.id_cpmk) ?? 0;
        nilaiIk += nilaiCpmk * (cpmk.bobot_cpmk_persen / 100);
        if (nilaiCpmk > 0) totalBobotAda += cpmk.bobot_cpmk_persen;
      }

      // Jika tidak semua CPMK punya nilai: proporsi ulang ke bobot yang ada
      const totalBobot = cpmksForIk.reduce((s, c) => s + c.bobot_cpmk_persen, 0);
      if (totalBobotAda > 0 && totalBobotAda < totalBobot) {
        // Ada sebagian yang belum ditempuh → skala ulang (jangan bagi 0)
        nilaiIk = (nilaiIk / totalBobotAda) * 100;
        // Tapi tandai sebagai partial — untuk display IK tetap pakai nilaiIk asli
        // agar tidak menipu; kita gunakan normalisasi sederhana
        nilaiIk = nilaiIk * (totalBobotAda / 100);
      }

      nilaiIkMap.set(ik.id_ik, Math.round(nilaiIk * 10) / 10);
    }

    // ── STEP 6: Hitung nilai CPL dari IK ─────────────────────────────────
    // Group iks by id_cpl
    const ikByCpl = new Map<number, IkRow[]>();
    for (const ik of iks) {
      if (!ikByCpl.has(ik.id_cpl)) ikByCpl.set(ik.id_cpl, []);
      ikByCpl.get(ik.id_cpl)!.push(ik);
    }

    // Nilai CPL = Σ (nilaiIk × bobot_ik / 100)
    // ── STEP 7: Build response ─────────────────────────────────────────────
    const TARGET_MIN = 80;

    // 7a. cplData (flat, untuk DashboardView)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cplData: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailCpl: any[] = [];

    for (const cpl of cpls) {
      const iksForCpl = ikByCpl.get(cpl.id_cpl) ?? [];

      let nilaiCpl = 0;
      let hasAnyValue = false;

      // Build detail IK
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ikDetails: any[] = [];

      for (const ik of iksForCpl) {
        const nilaiIk = nilaiIkMap.get(ik.id_ik) ?? 0;
        if (nilaiIk > 0) hasAnyValue = true;

        // Build CPMK detail untuk IK ini
        const cpmksForIk = cpmkByIk.get(ik.id_ik) ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cpmkDetails: any[] = [];

        for (const cpmk of cpmksForIk) {
          const nilaiCpmk = nilaiCpmkMap.get(cpmk.id_cpmk) ?? 0;
          cpmkDetails.push({
            kode:        cpmk.kode_cpmk,
            deskripsi:   `CPMK dari ${cpmk.nama_mk}`,
            bobot:       cpmk.bobot_cpmk_persen,
            nilai:       Math.round(nilaiCpmk * 10) / 10,
            matakuliah:  `${cpmk.nama_mk} (${cpmk.kode_mk})`,
            semester:    cpmk.plot_semester,
            nilaiMK:     nilaiCpmk > 0 ? nilaiToHuruf(nilaiCpmk) : '-',
          });
        }

        ikDetails.push({
          kode:      ik.kode_ik,
          deskripsi: ik.deskripsi,
          bobot:     ik.bobot_ik_persen,
          nilai:     nilaiIk,
          cpmk:      cpmkDetails,
        });

        nilaiCpl += nilaiIk * (ik.bobot_ik_persen / 100);
      }

      nilaiCpl = Math.round(nilaiCpl * 10) / 10;

      // Tentukan status
      let status: string;
      if (!hasAnyValue || nilaiCpl === 0) {
        status = 'Belum Ditempuh';
        nilaiCpl = 0;
      } else if (nilaiCpl >= TARGET_MIN) {
        status = 'Tercapai';
      } else {
        status = 'Belum Tercapai';
      }

      // cplData flat item
      cplData.push({
        name:     cpl.kode_cpl,
        nilai:    nilaiCpl,
        target:   TARGET_MIN,
        status,
        kategori: KATEGORI_CPL[cpl.kode_cpl] ?? 'Pengetahuan',
      });

      // detailCpl item (hanya yang punya IK)
      if (iksForCpl.length > 0) {
        detailCpl.push({
          cpl:       cpl.kode_cpl,
          deskripsi: cpl.deskripsi,
          nilai:     nilaiCpl,
          status,
          ik:        ikDetails,
        });
      }
    }

    return Response.json({
      success: true,
      data: { cplData, detailCpl },
    });

  } catch (error) {
    console.error('[API] GET /mahasiswa/cpl error:', error);
    return Response.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Gagal menghitung data CPL.',
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
