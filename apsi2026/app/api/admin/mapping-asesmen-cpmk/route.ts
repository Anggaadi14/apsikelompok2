import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  ?kur=K24  -> { mkGroups, kurList, kurikulumActive }
 * PUT  body { id_mata_kuliah, rows: [{ id_cpmk, kode_asesmen }] }
 */

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';
    const admin = createSupabaseAdminClient();

    const { data: kurList, error: kurErr } = await admin
      .from('kurikulum')
      .select('id_kurikulum, kode, nama, is_active')
      .order('tahun_mulai', { ascending: false });
    if (kurErr) throw kurErr;

    const targetKur =
      (kurList ?? []).find((k) => k.kode === kur) ||
      (kurList ?? []).find((k) => k.is_active) ||
      (kurList ?? [])[0];

    if (!targetKur) {
      return NextResponse.json({ success: true, data: { mkGroups: [], kurList, kurikulumActive: null } });
    }

    // MKs in this kurikulum
    const { data: kurMk } = await admin
      .from('kurikulum_mk')
      .select('id_mata_kuliah')
      .eq('id_kurikulum', targetKur.id_kurikulum);

    const mkIds = (kurMk ?? []).map((r) => r.id_mata_kuliah);

    if (mkIds.length === 0) {
      return NextResponse.json({ success: true, data: { mkGroups: [], kurList, kurikulumActive: targetKur } });
    }

    // Mata kuliah details
    const { data: mkRows } = await admin
      .from('mata_kuliah')
      .select('id_mata_kuliah, kode_mk, nama_mk, singkatan')
      .in('id_mata_kuliah', mkIds)
      .order('kode_mk');

    // CPMK for these MKs
    const { data: cpmkRows, error: cpmkErr } = await admin
      .from('cpmk')
      .select('id_cpmk, kode_cpmk, deskripsi_id, id_mata_kuliah, urutan')
      .in('id_mata_kuliah', mkIds)
      .order('urutan')
      .order('kode_cpmk');
    if (cpmkErr) throw cpmkErr;

    const cpmkIds = (cpmkRows ?? []).map((c) => c.id_cpmk);

    // Current mappings: mapping_media_cpmk → komponen_nilai (to get kode_media)
    const { data: mappingRows } = cpmkIds.length
      ? await admin
          .from('mapping_media_cpmk')
          .select('id_cpmk, komponen:id_komponen( id_komponen, kode_media )')
          .in('id_cpmk', cpmkIds)
      : { data: [] as any[] };

    // id_cpmk -> first kode_media found
    const asesmenByCpmk = new Map<number, string>();
    for (const m of mappingRows ?? []) {
      const idCpmk = (m as any).id_cpmk as number;
      const kode = (m as any).komponen?.kode_media as string | undefined;
      if (kode && !asesmenByCpmk.has(idCpmk)) {
        asesmenByCpmk.set(idCpmk, kode);
      }
    }

    // Group CPMK by MK
    const cpmkByMk = new Map<number, typeof cpmkRows>();
    for (const c of cpmkRows ?? []) {
      if (!cpmkByMk.has(c.id_mata_kuliah)) cpmkByMk.set(c.id_mata_kuliah, []);
      cpmkByMk.get(c.id_mata_kuliah)!.push(c);
    }

    const mkGroups = (mkRows ?? []).map((mk) => ({
      id_mata_kuliah: mk.id_mata_kuliah,
      kode_mk: mk.kode_mk,
      nama_mk: mk.nama_mk,
      singkatan: mk.singkatan,
      cpmk: (cpmkByMk.get(mk.id_mata_kuliah) ?? []).map((c) => ({
        id_cpmk: c.id_cpmk,
        kode_cpmk: c.kode_cpmk,
        deskripsi_id: c.deskripsi_id,
        kode_asesmen: asesmenByCpmk.get(c.id_cpmk) ?? '',
      })),
    }));

    return NextResponse.json({ success: true, data: { mkGroups, kurList, kurikulumActive: targetKur } });
  } catch (err) {
    const a = handleAuthError(err);
    if (a) return a;
    console.error('[GET /api/admin/mapping-asesmen-cpmk]', err);
    return serverError('Gagal memuat mapping asesmen.');
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const { id_mata_kuliah, rows } = body;

    const mkId = Number(id_mata_kuliah);
    if (!Number.isInteger(mkId) || mkId <= 0) {
      return NextResponse.json({ success: false, message: 'id_mata_kuliah tidak valid.' }, { status: 400 });
    }
    if (!Array.isArray(rows)) {
      return NextResponse.json({ success: false, message: 'rows harus berupa array.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const rowErrors: string[] = [];

    for (const row of rows) {
      const idCpmk = Number(row.id_cpmk);
      const kodeAsesmen = typeof row.kode_asesmen === 'string' ? row.kode_asesmen.trim() : '';

      if (!Number.isInteger(idCpmk) || idCpmk <= 0) continue;

      // Replace existing mapping for this CPMK
      const { error: delErr } = await admin.from('mapping_media_cpmk').delete().eq('id_cpmk', idCpmk);
      if (delErr) { rowErrors.push(`id_cpmk ${idCpmk}: ${delErr.message}`); continue; }

      if (kodeAsesmen) {
        // Find or create komponen_nilai for this MK + kode_media
        const { data: existing } = await admin
          .from('komponen_nilai')
          .select('id_komponen')
          .eq('id_mata_kuliah', mkId)
          .eq('kode_media', kodeAsesmen)
          .maybeSingle();

        let idKomponen: number | null = existing?.id_komponen ?? null;

        if (!idKomponen) {
          const { data: newKomp } = await admin
            .from('komponen_nilai')
            .insert({
              id_mata_kuliah: mkId,
              kode_media: kodeAsesmen,
              nama_media: kodeAsesmen,
              bobot_terhadap_mk: 0,
              urutan: Number(kodeAsesmen.replace(/\D/g, '')) || 0,
            })
            .select('id_komponen')
            .single();
          idKomponen = newKomp?.id_komponen ?? null;
        }

        if (idKomponen) {
          const { error: insErr } = await admin.from('mapping_media_cpmk').insert({
            id_komponen: idKomponen,
            id_cpmk: idCpmk,
            bobot_persen: 0,
          });
          if (insErr) rowErrors.push(`id_cpmk ${idCpmk}: ${insErr.message}`);
        }
      }
    }

    if (rowErrors.length > 0) {
      return NextResponse.json({ success: false, message: `Sebagian baris gagal: ${rowErrors.join('; ')}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Mapping asesmen berhasil disimpan.' });
  } catch (err) {
    const a = handleAuthError(err);
    if (a) return a;
    console.error('[PUT /api/admin/mapping-asesmen-cpmk]', err);
    return serverError('Gagal menyimpan mapping asesmen.');
  }
}
