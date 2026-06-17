import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { getConnection, query } from '@/app/lib/db';

/* ============================================================
   /api/admin/import-mahasiswa
     POST FormData(file) -> parse Excel:
       Sheet "1. Mahasiswa"        : NIM | Nama Lengkap | Email SSO | Angkatan
       Sheet "2. Enrollment Kelas" : NIM | Kode MK | Tahun Akademik | Semester | Kode Kelas
     - UPSERT mahasiswa by NIM (update nama/email/angkatan)
     - INSERT IGNORE enrollment ke mahasiswa_kelas
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RowResult = { baris: number; kode: string; status: 'sukses' | 'gagal'; catatan?: string };
type SectionResult = { sheet: string; sukses: number; gagal: number; detail: RowResult[] };
type ImportResult = { total_sukses: number; total_gagal: number; sections: SectionResult[] };

const SHEET_MHS_ALIASES = ['1. mahasiswa', 'mahasiswa', 'sheet1'];
const SHEET_ENR_ALIASES = ['2. enrollment kelas', 'enrollment kelas', 'enrollment', 'sheet2'];

function findSheet(wb: XLSX.WorkBook, aliases: string[]): XLSX.WorkSheet | null {
  const names = wb.SheetNames;
  for (const a of aliases) {
    const hit = names.find((n: string) => n.trim().toLowerCase() === a);
    if (hit) return wb.Sheets[hit];
  }
  return null;
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}
function cellNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File))
      return NextResponse.json({ success: false, message: 'File tidak ditemukan.' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buf, { type: 'buffer' });
    } catch {
      return NextResponse.json({ success: false, message: 'File bukan Excel yang valid.' }, { status: 400 });
    }

    const sections: SectionResult[] = [];

    // ===== Section 1: Mahasiswa =====
    const mhsSheet = findSheet(wb, SHEET_MHS_ALIASES);
    const secMhs: SectionResult = { sheet: '1. Mahasiswa', sukses: 0, gagal: 0, detail: [] };
    const nimToId = new Map<string, number>();

    if (!mhsSheet) {
      secMhs.detail.push({ baris: 0, kode: '-', status: 'gagal', catatan: 'Sheet "1. Mahasiswa" tidak ditemukan.' });
      secMhs.gagal++;
    } else {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(mhsSheet, { defval: '' });
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const baris = i + 2; // header row = 1
          const nim = cellStr(r['NIM'] ?? r['nim']);
          const nama = cellStr(r['Nama Lengkap'] ?? r['nama_mahasiswa'] ?? r['Nama']);
          const emailRaw = cellStr(r['Email SSO'] ?? r['email_sso'] ?? r['Email']);
          const angkatan = cellNum(r['Angkatan'] ?? r['angkatan']);

          if (!nim && !nama) continue;
          if (!nim) {
            secMhs.detail.push({ baris, kode: '-', status: 'gagal', catatan: 'NIM kosong.' });
            secMhs.gagal++; continue;
          }
          if (!/^[A-Za-z0-9_-]{4,15}$/.test(nim)) {
            secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: 'NIM tidak valid (4-15 char alfanumerik).' });
            secMhs.gagal++; continue;
          }
          if (!nama) {
            secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: 'Nama Lengkap kosong.' });
            secMhs.gagal++; continue;
          }
          if (!angkatan || angkatan < 1990 || angkatan > 2100) {
            secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: 'Angkatan tidak valid (1990-2100).' });
            secMhs.gagal++; continue;
          }
          const email = emailRaw || `${nim.toLowerCase()}@placeholder.sicpl.local`;

          try {
            await conn.query(
              `INSERT INTO mahasiswa (nim, nama_mahasiswa, email_sso, angkatan)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 nama_mahasiswa = VALUES(nama_mahasiswa),
                 email_sso      = VALUES(email_sso),
                 angkatan       = VALUES(angkatan)`,
              [nim, nama, email, angkatan],
            );
            const [idRows] = (await conn.query(
              `SELECT id_mahasiswa FROM mahasiswa WHERE nim = ? LIMIT 1`,
              [nim],
            )) as [Array<{ id_mahasiswa: number }>, unknown];
            if (idRows.length) nimToId.set(nim, idRows[0].id_mahasiswa);
            secMhs.detail.push({ baris, kode: nim, status: 'sukses' });
            secMhs.sukses++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('email_mhs_UNIQUE') || msg.includes('email_sso')) {
              try {
                const fallbackEmail = `${nim.toLowerCase()}@placeholder.sicpl.local`;
                await conn.query(
                  `INSERT INTO mahasiswa (nim, nama_mahasiswa, email_sso, angkatan)
                   VALUES (?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE
                     nama_mahasiswa = VALUES(nama_mahasiswa),
                     email_sso      = VALUES(email_sso),
                     angkatan       = VALUES(angkatan)`,
                  [nim, nama, fallbackEmail, angkatan],
                );
                const [idRows] = (await conn.query(
                  `SELECT id_mahasiswa FROM mahasiswa WHERE nim = ? LIMIT 1`,
                  [nim],
                )) as [Array<{ id_mahasiswa: number }>, unknown];
                if (idRows.length) nimToId.set(nim, idRows[0].id_mahasiswa);
                secMhs.detail.push({ baris, kode: nim, status: 'sukses', catatan: `Email dipakai mhs lain, otomatis pakai ${fallbackEmail}` });
                secMhs.sukses++;
              } catch (e2) {
                secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: e2 instanceof Error ? e2.message : 'Gagal insert.' });
                secMhs.gagal++;
              }
            } else {
              secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: msg });
              secMhs.gagal++;
            }
          }
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        secMhs.detail.push({ baris: 0, kode: '-', status: 'gagal', catatan: e instanceof Error ? e.message : 'Transaksi gagal.' });
        secMhs.gagal++;
      } finally {
        conn.release();
      }
    }
    sections.push(secMhs);

    // Pre-load semua mhs di DB ke nimToId (untuk enrollment yang merujuk mhs lama)
    {
      const existing = (await query(
        `SELECT id_mahasiswa, nim FROM mahasiswa`,
      )) as Array<{ id_mahasiswa: number; nim: string }>;
      for (const e of existing) nimToId.set(e.nim, e.id_mahasiswa);
    }

    // ===== Section 2: Enrollment Kelas =====
    const enrSheet = findSheet(wb, SHEET_ENR_ALIASES);
    if (enrSheet) {
      const secEnr: SectionResult = { sheet: '2. Enrollment Kelas', sukses: 0, gagal: 0, detail: [] };
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(enrSheet, { defval: '' });

      const allKelas = (await query(
        `SELECT k.id_kelas, mk.kode_mk, k.tahun_akademik, k.semester, k.kode_kelas
         FROM kelas_mk k JOIN mata_kuliah mk ON mk.id_mata_kuliah = k.id_mata_kuliah`,
      )) as Array<{ id_kelas: number; kode_mk: string; tahun_akademik: string; semester: string; kode_kelas: string }>;
      const kelasMap = new Map<string, number>();
      for (const k of allKelas) {
        const key = `${k.kode_mk}|${k.tahun_akademik}|${k.semester}|${k.kode_kelas}`.toLowerCase();
        kelasMap.set(key, k.id_kelas);
      }

      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const baris = i + 2;
          const nim = cellStr(r['NIM'] ?? r['nim']);
          const kodeMk = cellStr(r['Kode MK'] ?? r['kode_mk']);
          const ta = cellStr(r['Tahun Akademik'] ?? r['tahun_akademik']);
          const semRaw = cellStr(r['Semester'] ?? r['semester']);
          const kodeKelas = cellStr(r['Kode Kelas'] ?? r['kode_kelas']).toUpperCase();

          if (!nim && !kodeMk) continue;
          const label = `${nim}/${kodeMk}-${kodeKelas}`;

          if (!nim || !kodeMk || !ta || !semRaw || !kodeKelas) {
            secEnr.detail.push({ baris, kode: label, status: 'gagal', catatan: 'Ada kolom wajib yang kosong.' });
            secEnr.gagal++; continue;
          }
          const semester = semRaw.charAt(0).toUpperCase() + semRaw.slice(1).toLowerCase();
          if (semester !== 'Ganjil' && semester !== 'Genap') {
            secEnr.detail.push({ baris, kode: label, status: 'gagal', catatan: 'Semester harus "Ganjil" atau "Genap".' });
            secEnr.gagal++; continue;
          }
          const idMhs = nimToId.get(nim);
          if (!idMhs) {
            secEnr.detail.push({ baris, kode: label, status: 'gagal', catatan: `NIM ${nim} tidak ditemukan.` });
            secEnr.gagal++; continue;
          }
          const key = `${kodeMk}|${ta}|${semester}|${kodeKelas}`.toLowerCase();
          const idKelas = kelasMap.get(key);
          if (!idKelas) {
            secEnr.detail.push({ baris, kode: label, status: 'gagal', catatan: `Kelas ${kodeMk} ${ta} ${semester} ${kodeKelas} tidak ada (buat dulu via Kelola Kelas Tayang).` });
            secEnr.gagal++; continue;
          }
          try {
            await conn.query(
              `INSERT IGNORE INTO mahasiswa_kelas (id_kelas, id_mahasiswa) VALUES (?, ?)`,
              [idKelas, idMhs],
            );
            secEnr.detail.push({ baris, kode: label, status: 'sukses' });
            secEnr.sukses++;
          } catch (e) {
            secEnr.detail.push({ baris, kode: label, status: 'gagal', catatan: e instanceof Error ? e.message : 'Gagal insert.' });
            secEnr.gagal++;
          }
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        secEnr.detail.push({ baris: 0, kode: '-', status: 'gagal', catatan: e instanceof Error ? e.message : 'Transaksi gagal.' });
        secEnr.gagal++;
      } finally {
        conn.release();
      }
      sections.push(secEnr);
    }

    const total_sukses = sections.reduce((s, x) => s + x.sukses, 0);
    const total_gagal = sections.reduce((s, x) => s + x.gagal, 0);
    const result: ImportResult = { total_sukses, total_gagal, sections };
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/import-mahasiswa]', err);
    return serverError('Gagal memproses import mahasiswa.');
  }
}