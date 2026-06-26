import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RowResult = { baris: number; kode: string; status: 'sukses' | 'gagal'; catatan?: string };

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Field "file" wajib diisi (Excel).' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    } catch {
      return NextResponse.json({ success: false, error: 'BAD_FILE', message: 'File tidak bisa dibaca. Pastikan format .xlsx/.xls.' }, { status: 400 });
    }

    // Prefer "4. CPMK" (exact numbered sheet) over "CPL- PI - CPMK" etc.
    // Strategy: try each pattern in priority order, stop at first hit.
    const patterns = [/^4\.\s*cpmk$/i, /^cpmk$/i, /\b4\.\s*cpmk\b/i, /(?<![a-z])cpmk(?![a-z])/i, /cpmk/i];
    const sheetName =
      patterns.reduce<string | undefined>((found, re) => found ?? wb.SheetNames.find((n) => re.test(n)), undefined) ??
      wb.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ success: false, error: 'NO_SHEET', message: 'File Excel kosong.' }, { status: 400 });
    }

    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: null,
    });

    // Find header row (first row starting with "Kode")
    let hi = aoa.findIndex((r) => Array.isArray(r) && s(r[0]).toLowerCase().startsWith('kode'));
    if (hi < 0) hi = 0;
    const rows = aoa.slice(hi + 1) as unknown[][];

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'EMPTY', message: 'Sheet CPMK tidak memiliki data.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const detail: RowResult[] = [];
    let sukses = 0;
    let gagal = 0;

    const addRow = (baris: number, kode: string, ok: boolean, catatan?: string) => {
      detail.push({ baris, kode, status: ok ? 'sukses' : 'gagal', catatan });
      if (ok) sukses++; else gagal++;
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const baris = i + 1;

      const kodeCpmk = s(r[0]);
      // Normalize MK code: strip trailing ".0" that XLSX sometimes adds to large integers
      const kodeMk = s(r[1]).replace(/\.0+$/, '');

      if (!kodeCpmk) continue;

      const dId = s(r[2]);
      const dEn = s(r[3]) || null;

      if (!dId) { addRow(baris, kodeCpmk, false, 'Deskripsi (Indonesia) kosong'); continue; }
      if (!kodeMk) { addRow(baris, kodeCpmk, false, 'Kode MK kosong'); continue; }

      const { data: mkR } = await admin
        .from('mata_kuliah')
        .select('id_mata_kuliah')
        .eq('kode_mk', kodeMk)
        .maybeSingle();

      if (!mkR) {
        addRow(baris, kodeCpmk, false, `MK "${kodeMk}" tidak ditemukan di database. Pastikan MK sudah diimport dulu.`);
        continue;
      }

      const { data: existing } = await admin
        .from('cpmk')
        .select('id_cpmk')
        .eq('id_mata_kuliah', mkR.id_mata_kuliah)
        .eq('kode_cpmk', kodeCpmk)
        .maybeSingle();

      let importErr: string | undefined;

      if (existing) {
        const updPayload: Record<string, unknown> = { deskripsi_id: dId, urutan: i + 1 };
        if (dEn !== null) updPayload.deskripsi_en = dEn;
        const { error: upErr } = await admin.from('cpmk').update(updPayload).eq('id_cpmk', existing.id_cpmk);
        if (upErr && /deskripsi_en|column/i.test(upErr.message ?? '')) {
          const { error: upErr2 } = await admin.from('cpmk').update({ deskripsi_id: dId, urutan: i + 1 }).eq('id_cpmk', existing.id_cpmk);
          importErr = upErr2?.message;
        } else {
          importErr = upErr?.message;
        }
      } else {
        const { error: insErr } = await admin
          .from('cpmk')
          .insert({ id_mata_kuliah: mkR.id_mata_kuliah, kode_cpmk: kodeCpmk, deskripsi_id: dId, deskripsi_en: dEn, urutan: i + 1 });
        if (insErr && /deskripsi_en|column/i.test(insErr.message ?? '')) {
          const { error: insErr2 } = await admin
            .from('cpmk')
            .insert({ id_mata_kuliah: mkR.id_mata_kuliah, kode_cpmk: kodeCpmk, deskripsi_id: dId, urutan: i + 1 });
          importErr = insErr2?.message;
        } else {
          importErr = insErr?.message;
        }
      }

      addRow(baris, kodeCpmk, !importErr, importErr);
    }

    return NextResponse.json({
      success: true,
      message: `Import CPMK selesai: ${sukses} baris berhasil, ${gagal} gagal.`,
      data: {
        total_sukses: sukses,
        total_gagal: gagal,
        sections: [{ sheet: 'CPMK', sukses, gagal, detail }],
      },
    });
  } catch (err) {
    const a = handleAuthError(err);
    if (a) return a;
    console.error('[POST /api/admin/import-cpmk]', err);
    return serverError('Gagal memproses file import CPMK.');
  }
}
