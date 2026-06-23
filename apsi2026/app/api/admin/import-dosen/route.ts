import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/import-dosen
     POST FormData(file) -> parse Excel:
       Sheet "1. Dosen" : NIP/NIDN/NIK | Nama Lengkap | Email SSO | Peran
     - UPSERT staff by nip_nidn_nik (update nama/email/peran)
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RowResult = { baris: number; kode: string; status: 'sukses' | 'gagal'; catatan?: string };
type SectionResult = { sheet: string; sukses: number; gagal: number; detail: RowResult[] };
type ImportResult = { total_sukses: number; total_gagal: number; sections: SectionResult[] };

const SHEET_DOSEN_ALIASES = ['1. dosen', 'dosen', 'sheet1'];
const PERAN_ALLOWED = ['dosen', 'kaprodi', 'jamu', 'admin'];

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

    const dosenSheet = findSheet(wb, SHEET_DOSEN_ALIASES);
    const sec: SectionResult = { sheet: '1. Dosen', sukses: 0, gagal: 0, detail: [] };

    if (!dosenSheet) {
      sec.detail.push({ baris: 0, kode: '-', status: 'gagal', catatan: 'Sheet "1. Dosen" tidak ditemukan.' });
      sec.gagal++;
    } else {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(dosenSheet, { defval: '' });
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const baris = i + 2;
        const nip = cellStr(r['NIP/NIDN/NIK'] ?? r['NIP'] ?? r['NIDN'] ?? r['nip_nidn_nik']);
        const nama = cellStr(r['Nama Lengkap'] ?? r['nama_lengkap'] ?? r['Nama']);
        const emailRaw = cellStr(r['Email SSO'] ?? r['email_sso'] ?? r['Email']);
        const peranRaw = cellStr(r['Peran'] ?? r['peran']).toLowerCase() || 'dosen';

        if (!nip && !nama) continue;
        if (!nip || nip.length < 4 || nip.length > 20) { sec.detail.push({ baris, kode: nip || '-', status: 'gagal', catatan: 'NIP/NIDN/NIK wajib (4-20 karakter).' }); sec.gagal++; continue; }
        if (!nama) { sec.detail.push({ baris, kode: nip, status: 'gagal', catatan: 'Nama Lengkap kosong.' }); sec.gagal++; continue; }
        if (!PERAN_ALLOWED.includes(peranRaw)) { sec.detail.push({ baris, kode: nip, status: 'gagal', catatan: `Peran "${peranRaw}" tidak valid (dosen/kaprodi/jamu/admin).` }); sec.gagal++; continue; }
        const email = emailRaw || `${nip.toLowerCase()}@placeholder.sicpl.local`;

        const { error } = await admin
          .from('staff')
          .upsert({ nip_nidn_nik: nip, nama_lengkap: nama, email_sso: email, peran: peranRaw }, { onConflict: 'nip_nidn_nik' })
          .select('id_staff')
          .single();

        if (!error) {
          sec.detail.push({ baris, kode: nip, status: 'sukses' });
          sec.sukses++;
        } else if (error.code === '23505') {
          const fallbackEmail = `${nip.toLowerCase()}@placeholder.sicpl.local`;
          const { error: err2 } = await admin
            .from('staff')
            .upsert({ nip_nidn_nik: nip, nama_lengkap: nama, email_sso: fallbackEmail, peran: peranRaw }, { onConflict: 'nip_nidn_nik' })
            .select('id_staff')
            .single();
          if (!err2) {
            sec.detail.push({ baris, kode: nip, status: 'sukses', catatan: `Email dipakai staff lain, otomatis pakai ${fallbackEmail}` });
            sec.sukses++;
          } else {
            sec.detail.push({ baris, kode: nip, status: 'gagal', catatan: err2.message ?? 'Gagal insert.' });
            sec.gagal++;
          }
        } else {
          sec.detail.push({ baris, kode: nip, status: 'gagal', catatan: error.message ?? 'Gagal insert.' });
          sec.gagal++;
        }
      }
    }
    sections.push(sec);

    const total_sukses = sections.reduce((s, x) => s + x.sukses, 0);
    const total_gagal = sections.reduce((s, x) => s + x.gagal, 0);
    const result: ImportResult = { total_sukses, total_gagal, sections };
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/import-dosen]', err);
    return serverError('Gagal memproses import dosen.');
  }
}
