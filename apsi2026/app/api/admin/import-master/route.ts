import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole, handleAuthError } from '@/app/lib/auth';
import { getConnection } from '@/app/lib/db';
import type { PoolConnection } from 'mysql2/promise';

// ============================================================================
// IMPORT MASTER OBE — membaca Template_Import_SICPL (5 sheet) lalu UPSERT.
// Urutan proses mengikuti FK: CPL -> IK (+bobot IK->CPL) -> Mata Kuliah
//   -> CPMK -> Mapping CPMK-IK.
// Mode: kode sama => di-update (ON DUPLICATE KEY UPDATE). Baris yang gagal
//   dilewati & dicatat supaya bisa diperbaiki manual lewat edit web.
// ============================================================================

const DOMAIN_VALID = ['Pengetahuan', 'Keterampilan Khusus', 'Keterampilan Umum', 'Sikap'];

type RowResult = { baris: number; kode: string; status: 'sukses' | 'gagal'; catatan?: string };
type SectionResult = { sheet: string; sukses: number; gagal: number; detail: RowResult[] };

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}
function numOr(v: unknown, def: number): number {
  if (v === null || v === undefined || s(v) === '') return def;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : def;
}

/** Ambil sheet sbg array-of-arrays, dan temukan baris header (sel pertama diawali "kode"). */
function readSheet(wb: XLSX.WorkBook, names: string[]): { header: string[]; rows: unknown[][] } | null {
  const name = wb.SheetNames.find((n) => names.some((t) => n.toLowerCase().includes(t.toLowerCase())));
  if (!name) return null;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: null });
  let hi = aoa.findIndex((r) => Array.isArray(r) && s(r[0]).toLowerCase().startsWith('kode'));
  if (hi < 0) hi = 0;
  return { header: (aoa[hi] as unknown[]).map((c) => s(c)), rows: aoa.slice(hi + 1) as unknown[][] };
}

export async function POST(req: NextRequest) {
  let conn: PoolConnection | null = null;
  try {
    await requireRole(req, ['admin']);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Field "file" wajib diisi (Excel template).' },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    } catch {
      return NextResponse.json(
        { success: false, error: 'BAD_FILE', message: 'File tidak bisa dibaca. Pastikan .xlsx/.xls sesuai template.' },
        { status: 400 },
      );
    }

    conn = await getConnection();
    await conn.beginTransaction();

    // Tentukan kurikulum target (aktif, fallback K24)
    const [kurRows] = await conn.query(
      `SELECT id_kurikulum FROM kurikulum WHERE is_active = 1 OR kode = 'K24' ORDER BY is_active DESC, kode = 'K24' DESC LIMIT 1`,
    );
    const idKurikulum = (kurRows as Array<{ id_kurikulum: number }>)[0]?.id_kurikulum;
    if (!idKurikulum) {
      await conn.rollback();
      return NextResponse.json(
        { success: false, error: 'NO_KURIKULUM', message: 'Kurikulum K24 belum ada. Jalankan seed/migration kurikulum dulu.' },
        { status: 400 },
      );
    }

    const sections: SectionResult[] = [];
    const addRow = (sec: SectionResult, baris: number, kode: string, ok: boolean, catatan?: string) => {
      sec.detail.push({ baris, kode, status: ok ? 'sukses' : 'gagal', catatan });
      if (ok) sec.sukses++; else sec.gagal++;
    };

    // ---- 1) CPL ----
    const cplSheet = readSheet(wb, ['1. CPL', 'CPL']);
    if (cplSheet) {
      const sec: SectionResult = { sheet: 'CPL', sukses: 0, gagal: 0, detail: [] };
      for (let i = 0; i < cplSheet.rows.length; i++) {
        const r = cplSheet.rows[i]; const baris = i + 1;
        const kode = s(r[0]);
        if (!kode) continue;
        const singkatan = s(r[1]); const domain = s(r[2]);
        const dId = s(r[3]); const dEn = s(r[4]) || null;
        if (!DOMAIN_VALID.includes(domain)) { addRow(sec, baris, kode, false, `Domain "${domain}" tidak valid`); continue; }
        if (!dId) { addRow(sec, baris, kode, false, 'Deskripsi (Indonesia) kosong'); continue; }
        try {
          await conn.query(
            `INSERT INTO cpl (id_kurikulum, kode_cpl, singkatan, domain, deskripsi_id, deskripsi_en, urutan)
             VALUES (?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE singkatan=VALUES(singkatan), domain=VALUES(domain),
               deskripsi_id=VALUES(deskripsi_id), deskripsi_en=VALUES(deskripsi_en)`,
            [idKurikulum, kode, singkatan, domain, dId, dEn, numOr(kode, i + 1)],
          );
          addRow(sec, baris, kode, true);
        } catch (e) { addRow(sec, baris, kode, false, (e as Error).message); }
      }
      sections.push(sec);
    }

    // ---- 2) IK (+ bobot IK->CPL) ----
    const ikSheet = readSheet(wb, ['2. IK', 'IK']);
    if (ikSheet) {
      const sec: SectionResult = { sheet: 'IK', sukses: 0, gagal: 0, detail: [] };
      for (let i = 0; i < ikSheet.rows.length; i++) {
        const r = ikSheet.rows[i]; const baris = i + 1;
        const kodeIk = s(r[0]); const kodeCpl = s(r[1]);
        if (!kodeIk) continue;
        const desk = s(r[2]); const bobot = numOr(r[3], 0);
        try {
          const [cplR] = await conn.query(
            `SELECT id_cpl FROM cpl WHERE id_kurikulum=? AND kode_cpl=? LIMIT 1`, [idKurikulum, kodeCpl],
          );
          const idCpl = (cplR as Array<{ id_cpl: number }>)[0]?.id_cpl;
          if (!idCpl) { addRow(sec, baris, kodeIk, false, `CPL induk "${kodeCpl}" tidak ditemukan`); continue; }
          await conn.query(
            `INSERT INTO indikator_kinerja (id_cpl, kode_ik, deskripsi, urutan) VALUES (?,?,?,?)
             ON DUPLICATE KEY UPDATE deskripsi=VALUES(deskripsi)`,
            [idCpl, kodeIk, desk || kodeIk, i + 1],
          );
          const [ikR] = await conn.query(
            `SELECT id_ik FROM indikator_kinerja WHERE id_cpl=? AND kode_ik=? LIMIT 1`, [idCpl, kodeIk],
          );
          const idIk = (ikR as Array<{ id_ik: number }>)[0]?.id_ik;
          await conn.query(
            `INSERT INTO mapping_ik_cpl (id_ik, id_cpl, bobot_persen) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE bobot_persen=VALUES(bobot_persen)`,
            [idIk, idCpl, bobot],
          );
          addRow(sec, baris, kodeIk, true);
        } catch (e) { addRow(sec, baris, kodeIk, false, (e as Error).message); }
      }
      sections.push(sec);
    }

    // ---- 3) Mata Kuliah ----
    const mkSheet = readSheet(wb, ['3. Mata Kuliah', 'Mata Kuliah']);
    if (mkSheet) {
      const sec: SectionResult = { sheet: 'Mata Kuliah', sukses: 0, gagal: 0, detail: [] };
      for (let i = 0; i < mkSheet.rows.length; i++) {
        const r = mkSheet.rows[i]; const baris = i + 1;
        const kodeMk = s(r[0]);
        if (!kodeMk) continue;
        const namaId = s(r[1]); const namaEn = s(r[2]) || null;
        const sks = numOr(r[3], 0); const singkatan = s(r[4]) || null;
        const isEval = /^ya|^y|^1|^true/i.test(s(r[5])) ? 1 : 0;
        if (!namaId) { addRow(sec, baris, kodeMk, false, 'Nama MK (Indonesia) kosong'); continue; }
        try {
          await conn.query(
            `INSERT INTO mata_kuliah (kode_mk, nama_mk, nama_mk_en, sks, singkatan, is_evaluator)
             VALUES (?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE nama_mk=VALUES(nama_mk), nama_mk_en=VALUES(nama_mk_en),
               sks=VALUES(sks), singkatan=VALUES(singkatan), is_evaluator=VALUES(is_evaluator)`,
            [kodeMk, namaId, namaEn, sks, singkatan, isEval],
          );
          const [mkR] = await conn.query(`SELECT id_mata_kuliah FROM mata_kuliah WHERE kode_mk=? LIMIT 1`, [kodeMk]);
          const idMk = (mkR as Array<{ id_mata_kuliah: number }>)[0]?.id_mata_kuliah;
          await conn.query(
            `INSERT IGNORE INTO kurikulum_mk (id_kurikulum, id_mata_kuliah, is_wajib) VALUES (?,?,1)`,
            [idKurikulum, idMk],
          );
          addRow(sec, baris, kodeMk, true);
        } catch (e) { addRow(sec, baris, kodeMk, false, (e as Error).message); }
      }
      sections.push(sec);
    }

    // ---- 4) CPMK ----
    const cpmkSheet = readSheet(wb, ['4. CPMK', 'CPMK']);
    if (cpmkSheet) {
      const sec: SectionResult = { sheet: 'CPMK', sukses: 0, gagal: 0, detail: [] };
      for (let i = 0; i < cpmkSheet.rows.length; i++) {
        const r = cpmkSheet.rows[i]; const baris = i + 1;
        const kodeCpmk = s(r[0]); const kodeMk = s(r[1]);
        if (!kodeCpmk) continue;
        const dId = s(r[2]); const dEn = s(r[3]) || null;
        if (!dId) { addRow(sec, baris, kodeCpmk, false, 'Deskripsi (Indonesia) kosong'); continue; }
        try {
          const [mkR] = await conn.query(`SELECT id_mata_kuliah FROM mata_kuliah WHERE kode_mk=? LIMIT 1`, [kodeMk]);
          const idMk = (mkR as Array<{ id_mata_kuliah: number }>)[0]?.id_mata_kuliah;
          if (!idMk) { addRow(sec, baris, kodeCpmk, false, `MK induk "${kodeMk}" tidak ditemukan`); continue; }
          await conn.query(
            `INSERT INTO cpmk (id_mata_kuliah, kode_cpmk, deskripsi_id, deskripsi_en, urutan) VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE deskripsi_id=VALUES(deskripsi_id), deskripsi_en=VALUES(deskripsi_en)`,
            [idMk, kodeCpmk, dId, dEn, i + 1],
          );
          addRow(sec, baris, kodeCpmk, true);
        } catch (e) { addRow(sec, baris, kodeCpmk, false, (e as Error).message); }
      }
      sections.push(sec);
    }

    // ---- 5) Mapping CPMK -> IK (bobot 0; engine pakai rata-rata) ----
    const mapSheet = readSheet(wb, ['5. Mapping', 'Mapping']);
    if (mapSheet) {
      const sec: SectionResult = { sheet: 'Mapping CPMK-IK', sukses: 0, gagal: 0, detail: [] };
      for (let i = 0; i < mapSheet.rows.length; i++) {
        const r = mapSheet.rows[i]; const baris = i + 1;
        const kodeCpmk = s(r[0]); const kodeIk = s(r[1]);
        if (!kodeCpmk && !kodeIk) continue;
        const label = `${kodeCpmk} -> ${kodeIk}`;
        try {
          const [cpmkR] = await conn.query(`SELECT id_cpmk FROM cpmk WHERE kode_cpmk=? LIMIT 1`, [kodeCpmk]);
          const idCpmk = (cpmkR as Array<{ id_cpmk: number }>)[0]?.id_cpmk;
          const [ikR] = await conn.query(
            `SELECT ik.id_ik FROM indikator_kinerja ik JOIN cpl c ON c.id_cpl = ik.id_cpl
             WHERE ik.kode_ik=? AND c.id_kurikulum=? LIMIT 1`, [kodeIk, idKurikulum],
          );
          const idIk = (ikR as Array<{ id_ik: number }>)[0]?.id_ik;
          if (!idCpmk) { addRow(sec, baris, label, false, `CPMK "${kodeCpmk}" tidak ditemukan`); continue; }
          if (!idIk) { addRow(sec, baris, label, false, `IK "${kodeIk}" tidak ditemukan`); continue; }
          await conn.query(
            `INSERT INTO mapping_cpmk_ik (id_cpmk, id_ik, bobot_persen) VALUES (?,?,0)
             ON DUPLICATE KEY UPDATE bobot_persen=bobot_persen`,
            [idCpmk, idIk],
          );
          addRow(sec, baris, label, true);
        } catch (e) { addRow(sec, baris, label, false, (e as Error).message); }
      }
      sections.push(sec);
    }

    if (sections.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        { success: false, error: 'NO_SHEET', message: 'Tidak ada sheet yang dikenali (CPL/IK/Mata Kuliah/CPMK/Mapping).' },
        { status: 400 },
      );
    }

    await conn.commit();
    const totalSukses = sections.reduce((a, s2) => a + s2.sukses, 0);
    const totalGagal = sections.reduce((a, s2) => a + s2.gagal, 0);
    return NextResponse.json({
      success: true,
      message: `Import selesai: ${totalSukses} baris berhasil, ${totalGagal} gagal.`,
      data: { id_kurikulum: idKurikulum, total_sukses: totalSukses, total_gagal: totalGagal, sections },
    });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch { /* ignore */ } }
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('[API] POST /api/admin/import-master error:', err);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal memproses file import.' },
      { status: 500 },
    );
  } finally {
    if (conn) conn.release();
  }
}