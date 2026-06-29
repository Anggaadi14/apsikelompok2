import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

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

    const admin = createSupabaseAdminClient();
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
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const baris = i + 2;
        const nim = cellStr(r['NIM'] ?? r['nim']);
        const nama = cellStr(r['Nama Lengkap'] ?? r['nama_mahasiswa'] ?? r['Nama']);
        const emailRaw = cellStr(r['Email SSO'] ?? r['email_sso'] ?? r['Email']);
        const angkatan = cellNum(r['Angkatan'] ?? r['angkatan']);

        if (!nim && !nama) continue;
        if (!nim) { secMhs.detail.push({ baris, kode: '-', status: 'gagal', catatan: 'NIM kosong.' }); secMhs.gagal++; continue; }
        if (!/^[A-Za-z0-9_-]{4,15}$/.test(nim)) { secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: 'NIM tidak valid (4-15 char alfanumerik).' }); secMhs.gagal++; continue; }
        if (!nama) { secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: 'Nama Lengkap kosong.' }); secMhs.gagal++; continue; }
        if (!angkatan || angkatan < 1990 || angkatan > 2100) { secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: 'Angkatan tidak valid (1990-2100).' }); secMhs.gagal++; continue; }
        const email = emailRaw || `${nim.toLowerCase()}@placeholder.sicpl.local`;

        const { data: ups, error } = await admin
          .from('mahasiswa')
          .upsert({ nim, nama_mahasiswa: nama, email_sso: email, angkatan }, { onConflict: 'nim' })
          .select('id_mahasiswa')
          .single();

        if (!error && ups) {
          nimToId.set(nim, ups.id_mahasiswa);
          secMhs.detail.push({ baris, kode: nim, status: 'sukses' });
          secMhs.sukses++;
        } else if (error?.code === '23505') {
          const fallbackEmail = `${nim.toLowerCase()}@placeholder.sicpl.local`;
          const { data: ups2, error: err2 } = await admin
            .from('mahasiswa')
            .upsert({ nim, nama_mahasiswa: nama, email_sso: fallbackEmail, angkatan }, { onConflict: 'nim' })
            .select('id_mahasiswa')
            .single();
          if (!err2 && ups2) {
            nimToId.set(nim, ups2.id_mahasiswa);
            secMhs.detail.push({ baris, kode: nim, status: 'sukses', catatan: `Email dipakai mhs lain, otomatis pakai ${fallbackEmail}` });
            secMhs.sukses++;
          } else {
            secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: err2?.message ?? 'Gagal insert.' });
            secMhs.gagal++;
          }
        } else {
          secMhs.detail.push({ baris, kode: nim, status: 'gagal', catatan: error?.message ?? 'Gagal insert.' });
          secMhs.gagal++;
        }
      }
    }
    sections.push(secMhs);

    // Pre-load semua mhs di DB ke nimToId (untuk enrollment yang merujuk mhs lama)
    {
      const { data: existing } = await admin.from('mahasiswa').select('id_mahasiswa, nim');
      for (const e of existing ?? []) nimToId.set(e.nim, e.id_mahasiswa);
    }

    // ===== Section 2: Enrollment Kelas =====
    const enrSheet = findSheet(wb, SHEET_ENR_ALIASES);
    if (enrSheet) {
      const secEnr: SectionResult = { sheet: '2. Enrollment Kelas', sukses: 0, gagal: 0, detail: [] };
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(enrSheet, { defval: '' });

      // Pre-load existing kelas
      const { data: allKelas } = await admin
        .from('kelas_mk')
        .select('id_kelas, tahun_akademik, semester, kode_kelas, id_mata_kuliah, id_kurikulum, id_tahun_akademik, mata_kuliah:id_mata_kuliah ( kode_mk )');
      const kelasMap = new Map<string, number>();
      for (const k of (allKelas ?? []) as any[]) {
        const key = `${k.mata_kuliah?.kode_mk}|${k.tahun_akademik}|${k.semester}|${k.kode_kelas}`.toLowerCase();
        kelasMap.set(key, k.id_kelas);
      }

      // Pre-load lookups for auto-creation
      const [{ data: mkRows }, { data: taRows }, { data: kurMkRows }] = await Promise.all([
        admin.from('mata_kuliah').select('id_mata_kuliah, kode_mk'),
        admin.from('tahun_akademik').select('id_tahun_akademik, tahun_mulai, tahun_selesai, semester'),
        admin.from('kurikulum_mk').select('id_mata_kuliah, id_kurikulum, kurikulum:id_kurikulum( is_active )'),
      ]);

      const mkByCode = new Map<string, number>();
      for (const mk of mkRows ?? []) mkByCode.set(mk.kode_mk.toLowerCase(), mk.id_mata_kuliah);

      // "2024/2025|ganjil" → { id_tahun_akademik, semester }
      const taByKey = new Map<string, { id_tahun_akademik: number; semester: string }>();
      for (const ta of taRows ?? []) {
        const key = `${ta.tahun_mulai}/${ta.tahun_selesai}|${ta.semester}`.toLowerCase();
        taByKey.set(key, { id_tahun_akademik: ta.id_tahun_akademik, semester: ta.semester });
      }

      // id_mata_kuliah → id_kurikulum (prefer active)
      const kurByMk = new Map<number, number>();
      for (const r of (kurMkRows ?? []) as any[]) {
        if (!kurByMk.has(r.id_mata_kuliah)) kurByMk.set(r.id_mata_kuliah, r.id_kurikulum);
      }
      for (const r of (kurMkRows ?? []) as any[]) {
        if (r.kurikulum?.is_active) kurByMk.set(r.id_mata_kuliah, r.id_kurikulum);
      }

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

        const kelasKey = `${kodeMk}|${ta}|${semester}|${kodeKelas}`.toLowerCase();
        let idKelas = kelasMap.get(kelasKey);

        // Auto-create kelas if MK and TA exist but kelas belum dibuat
        if (!idKelas) {
          const idMk = mkByCode.get(kodeMk.toLowerCase());
          const taData = taByKey.get(`${ta}|${semester}`.toLowerCase());
          const idKur = idMk !== undefined ? kurByMk.get(idMk) : undefined;

          if (idMk !== undefined && taData && idKur !== undefined) {
            const { data: newKelas, error: newErr } = await admin
              .from('kelas_mk')
              .insert({
                id_mata_kuliah: idMk,
                id_kurikulum: idKur,
                tahun_akademik: ta,
                semester: taData.semester,
                kode_kelas: kodeKelas,
                id_tahun_akademik: taData.id_tahun_akademik,
                kuota: null,
              })
              .select('id_kelas')
              .single();
            if (!newErr && newKelas?.id_kelas) {
              idKelas = newKelas.id_kelas as number;
              kelasMap.set(kelasKey, idKelas);
            }
          }

          if (!idKelas) {
            const mkExists = mkByCode.has(kodeMk.toLowerCase());
            const taExists = taByKey.has(`${ta}|${semester}`.toLowerCase());
            let catatan: string;
            if (!mkExists) catatan = `MK ${kodeMk} belum ada — upload Data Master CPMK terlebih dahulu.`;
            else if (!taExists) catatan = `Tahun Akademik "${ta} ${semester}" tidak ditemukan — buat dulu di menu Tahun Akademik.`;
            else catatan = `Gagal membuat kelas otomatis untuk ${kodeMk} ${ta} ${semester} ${kodeKelas}.`;
            secEnr.detail.push({ baris, kode: label, status: 'gagal', catatan });
            secEnr.gagal++;
            continue;
          }
        }

        const { error } = await admin.from('mahasiswa_kelas').upsert({ id_kelas: idKelas, id_mahasiswa: idMhs }, { onConflict: 'id_kelas,id_mahasiswa', ignoreDuplicates: true });
        if (!error) {
          secEnr.detail.push({ baris, kode: label, status: 'sukses' });
          secEnr.sukses++;
        } else {
          secEnr.detail.push({ baris, kode: label, status: 'gagal', catatan: error.message });
          secEnr.gagal++;
        }
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
