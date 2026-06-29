import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole, handleAuthError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

// ============================================================================
// IMPORT MASTER OBE — membaca Template_Import_SICPL (5 sheet) lalu UPSERT.
// Urutan proses mengikuti FK: CPL -> IK (+bobot IK->CPL) -> Mata Kuliah
//   -> CPMK -> Mapping CPMK-IK.
// Mode: kode sama => di-update (upsert). Baris yang gagal dilewati & dicatat
//   supaya bisa diperbaiki manual lewat edit web.
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

function readSheet(wb: XLSX.WorkBook, names: string[]): { header: string[]; rows: unknown[][] } | null {
  // Iterate names in priority order (most specific first) so e.g. "4. CPMK" is
  // found before a sheet like "CPL- PI - CPMK" that also contains "CPMK".
  let name: string | undefined;
  for (const t of names) {
    name = wb.SheetNames.find((n) => n.toLowerCase().includes(t.toLowerCase()));
    if (name) break;
  }
  if (!name) return null;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: null });
  let hi = aoa.findIndex((r) => Array.isArray(r) && s(r[0]).toLowerCase().startsWith('kode'));
  if (hi < 0) hi = 0;
  return { header: (aoa[hi] as unknown[]).map((c) => s(c)), rows: aoa.slice(hi + 1) as unknown[][] };
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Field "file" wajib diisi (Excel template).' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    } catch {
      return NextResponse.json({ success: false, error: 'BAD_FILE', message: 'File tidak bisa dibaca. Pastikan .xlsx/.xls sesuai template.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: kurRows } = await admin.from('kurikulum').select('id_kurikulum, kode, is_active').or('is_active.eq.true,kode.eq.K24');
    const idKurikulum = (kurRows ?? []).sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0) || (b.kode === 'K24' ? 1 : 0) - (a.kode === 'K24' ? 1 : 0))[0]?.id_kurikulum;
    if (!idKurikulum) {
      return NextResponse.json({ success: false, error: 'NO_KURIKULUM', message: 'Kurikulum K24 belum ada. Jalankan seed/migration kurikulum dulu.' }, { status: 400 });
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
        const { error } = await admin
          .from('cpl')
          .upsert(
            { id_kurikulum: idKurikulum, kode_cpl: kode, singkatan, domain, deskripsi_id: dId, deskripsi_en: dEn, urutan: numOr(kode, i + 1) },
            { onConflict: 'id_kurikulum,kode_cpl' },
          );
        addRow(sec, baris, kode, !error, error?.message);
      }
      sections.push(sec);
    }

    // ---- 2) IK (+ bobot IK->CPL) ----
    const ikSheet = readSheet(wb, ['2. IK', 'IK']);
    if (ikSheet) {
      const sec: SectionResult = { sheet: 'IK', sukses: 0, gagal: 0, detail: [] };
      // Detect header columns: support old format (kode,cpl,deskripsi,bobot) and
      // new format (kode,cpl,deskripsi_id,deskripsi_en,bobot)
      const hdr = ikSheet.header.map((h) => h.toLowerCase());
      const colDeskEn = hdr.findIndex((h) => h.includes('english') || h.includes('inggris') || /\ben\b/.test(h));
      const hasEnCol = colDeskEn >= 0 && colDeskEn !== 2;
      for (let i = 0; i < ikSheet.rows.length; i++) {
        const r = ikSheet.rows[i]; const baris = i + 1;
        const kodeIk = s(r[0]); const kodeCpl = s(r[1]);
        if (!kodeIk) continue;
        const desk = s(r[2]);
        // If header has deskripsi_en column, read it; otherwise r[3] is bobot
        const deskEn = hasEnCol ? (s(r[colDeskEn]) || null) : null;
        const botokIdx = hasEnCol ? (colDeskEn + 1 < r.length ? colDeskEn + 1 : 3) : 3;
        const bobot = numOr(r[botokIdx], 0);
        const { data: cplR } = await admin.from('cpl').select('id_cpl').eq('id_kurikulum', idKurikulum).eq('kode_cpl', kodeCpl).maybeSingle();
        if (!cplR) { addRow(sec, baris, kodeIk, false, `CPL induk "${kodeCpl}" tidak ditemukan`); continue; }
        const { data: ikR, error: ikErr } = await admin
          .from('indikator_kinerja')
          .upsert({ id_cpl: cplR.id_cpl, kode_ik: kodeIk, deskripsi: desk || kodeIk, deskripsi_en: deskEn, urutan: i + 1 }, { onConflict: 'id_cpl,kode_ik' })
          .select('id_ik')
          .single();
        if (ikErr || !ikR) { addRow(sec, baris, kodeIk, false, ikErr?.message); continue; }
        const { error: mapErr } = await admin
          .from('mapping_ik_cpl')
          .upsert({ id_ik: ikR.id_ik, id_cpl: cplR.id_cpl, bobot_persen: bobot }, { onConflict: 'id_ik,id_cpl' });
        addRow(sec, baris, kodeIk, !mapErr, mapErr?.message);
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
        const isEval = /^ya|^y|^1|^true/i.test(s(r[5]));
        if (!namaId) { addRow(sec, baris, kodeMk, false, 'Nama MK (Indonesia) kosong'); continue; }
        const { data: mkR, error: mkErr } = await admin
          .from('mata_kuliah')
          .upsert({ kode_mk: kodeMk, nama_mk: namaId, nama_mk_en: namaEn, sks, singkatan, is_evaluator: isEval }, { onConflict: 'kode_mk' })
          .select('id_mata_kuliah')
          .single();
        if (mkErr || !mkR) { addRow(sec, baris, kodeMk, false, mkErr?.message); continue; }
        const { error: kurMkErr } = await admin.from('kurikulum_mk').upsert({ id_kurikulum: idKurikulum, id_mata_kuliah: mkR.id_mata_kuliah, is_wajib: true }, { onConflict: 'id_kurikulum,id_mata_kuliah', ignoreDuplicates: true });
        if (kurMkErr) { addRow(sec, baris, kodeMk, false, `MK tersimpan tapi gagal link ke kurikulum: ${kurMkErr.message}`); continue; }
        addRow(sec, baris, kodeMk, true);
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
        const kodeAsesmen = s(r[4]) || null; // e.g. "UK1", "UK2"
        if (!dId) { addRow(sec, baris, kodeCpmk, false, 'Deskripsi (Indonesia) kosong'); continue; }
        if (!kodeMk) { addRow(sec, baris, kodeCpmk, false, 'Kode MK kosong'); continue; }
        const { data: mkR } = await admin.from('mata_kuliah').select('id_mata_kuliah').eq('kode_mk', kodeMk).maybeSingle();
        if (!mkR) { addRow(sec, baris, kodeCpmk, false, `MK induk "${kodeMk}" tidak ditemukan di database`); continue; }
        // Use check-then-insert/update to avoid dependency on DB unique constraint
        const { data: existing } = await admin.from('cpmk').select('id_cpmk').eq('id_mata_kuliah', mkR.id_mata_kuliah).eq('kode_cpmk', kodeCpmk).maybeSingle();
        let idCpmk: number | null = existing?.id_cpmk ?? null;
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
          const { data: inserted, error: insErr } = await admin.from('cpmk').insert({ id_mata_kuliah: mkR.id_mata_kuliah, kode_cpmk: kodeCpmk, deskripsi_id: dId, deskripsi_en: dEn, urutan: i + 1 }).select('id_cpmk').single();
          if (insErr && /deskripsi_en|column/i.test(insErr.message ?? '')) {
            // Retry without deskripsi_en — column may not exist in this DB version
            const { data: ins2, error: insErr2 } = await admin.from('cpmk').insert({ id_mata_kuliah: mkR.id_mata_kuliah, kode_cpmk: kodeCpmk, deskripsi_id: dId, urutan: i + 1 }).select('id_cpmk').single();
            importErr = insErr2?.message;
            idCpmk = ins2?.id_cpmk ?? null;
          } else {
            importErr = insErr?.message;
            idCpmk = inserted?.id_cpmk ?? null;
          }
        }
        if (!importErr && idCpmk && kodeAsesmen) {
          // Upsert komponen_nilai for this MK + asesmen code
          // Try to find existing komponen first; only insert if not found (preserve existing nama_media/bobot)
          const { data: existingKomp } = await admin
            .from('komponen_nilai')
            .select('id_komponen')
            .eq('id_mata_kuliah', mkR.id_mata_kuliah)
            .eq('kode_media', kodeAsesmen)
            .maybeSingle();
          let kompR: { id_komponen: number } | null = existingKomp;
          let kompErr: unknown = null;
          if (!existingKomp) {
            const res = await admin
              .from('komponen_nilai')
              .insert({ id_mata_kuliah: mkR.id_mata_kuliah, kode_media: kodeAsesmen, nama_media: kodeAsesmen, bobot_terhadap_mk: 0, urutan: Number(kodeAsesmen.replace(/\D/g, '')) || 0 })
              .select('id_komponen')
              .single();
            kompR = res.data;
            kompErr = res.error;
          }
          if (!kompErr && kompR) {
            await admin
              .from('mapping_media_cpmk')
              .upsert({ id_komponen: kompR.id_komponen, id_cpmk: idCpmk, bobot_persen: 0 }, { onConflict: 'id_komponen,id_cpmk' });
          }
        }
        addRow(sec, baris, kodeCpmk, !importErr, importErr);
      }
      sections.push(sec);
    }

    // ---- 5) Mapping CPMK -> IK (bobot 0; engine pakai rata-rata) ----
    const mapSheet = readSheet(wb, ['5. Mapping', 'Mapping']);
    if (mapSheet) {
      const sec: SectionResult = { sheet: 'Mapping CPMK-IK', sukses: 0, gagal: 0, detail: [] };
      // Pre-load MK IDs in this kurikulum to scope CPMK lookup
      const { data: kurMkForMap } = await admin.from('kurikulum_mk').select('id_mata_kuliah').eq('id_kurikulum', idKurikulum);
      const mkIdsForMap = (kurMkForMap ?? []).map((r) => r.id_mata_kuliah);

      for (let i = 0; i < mapSheet.rows.length; i++) {
        const r = mapSheet.rows[i]; const baris = i + 1;
        const kodeCpmk = s(r[0]); const kodeIk = s(r[1]);
        if (!kodeCpmk && !kodeIk) continue;
        const label = `${kodeCpmk} -> ${kodeIk}`;
        // Scope CPMK lookup to this kurikulum's MKs to avoid cross-MK code collisions
        const cpmkQ = admin.from('cpmk').select('id_cpmk').eq('kode_cpmk', kodeCpmk);
        const { data: cpmkResults } = mkIdsForMap.length ? await cpmkQ.in('id_mata_kuliah', mkIdsForMap) : await cpmkQ;
        const cpmkR = cpmkResults?.[0] ?? null;
        const { data: ikR } = await admin
          .from('indikator_kinerja')
          .select('id_ik, cpl:id_cpl ( id_kurikulum )')
          .eq('kode_ik', kodeIk);
        const ikMatch = (ikR ?? []).find((x: any) => x.cpl?.id_kurikulum === idKurikulum);
        if (!cpmkR) { addRow(sec, baris, label, false, `CPMK "${kodeCpmk}" tidak ditemukan`); continue; }
        if (!ikMatch) { addRow(sec, baris, label, false, `IK "${kodeIk}" tidak ditemukan`); continue; }
        const { data: existingMap } = await admin.from('mapping_cpmk_ik').select('bobot_persen').eq('id_cpmk', cpmkR.id_cpmk).eq('id_ik', ikMatch.id_ik).maybeSingle();
        const { error } = await admin
          .from('mapping_cpmk_ik')
          .upsert({ id_cpmk: cpmkR.id_cpmk, id_ik: ikMatch.id_ik, bobot_persen: existingMap?.bobot_persen ?? 0 }, { onConflict: 'id_cpmk,id_ik' });
        addRow(sec, baris, label, !error, error?.message);
      }
      sections.push(sec);
    }

    if (sections.length === 0) {
      return NextResponse.json({ success: false, error: 'NO_SHEET', message: 'Tidak ada sheet yang dikenali (CPL/IK/Mata Kuliah/CPMK/Mapping).' }, { status: 400 });
    }

    const totalSukses = sections.reduce((a, s2) => a + s2.sukses, 0);
    const totalGagal = sections.reduce((a, s2) => a + s2.gagal, 0);
    return NextResponse.json({
      success: true,
      message: `Import selesai: ${totalSukses} baris berhasil, ${totalGagal} gagal.`,
      data: { id_kurikulum: idKurikulum, total_sukses: totalSukses, total_gagal: totalGagal, sections },
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('[API] POST /api/admin/import-master error:', err);
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal memproses file import.' }, { status: 500 });
  }
}
