import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mapping CPMK -> IK dengan bobot_persen.
 * Rule: SUM(bobot_persen) per id_ik HARUS = 100 (toleransi 0.01).
 *
 * GET  ?kur=K24                  -> { ikList, kurList, kurikulumActive }
 * GET  ?kur=K24&id_ik=12         -> { ik, cpmkList }
 * PUT  body { id_ik, items: [{ id_cpmk, bobot_persen }] } -> validasi sum=100
 */

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';
    const idIkParam = url.searchParams.get('id_ik');

    const admin = createSupabaseAdminClient();

    const { data: kurList, error: kurErr } = await admin
      .from('kurikulum')
      .select('id_kurikulum, kode, nama, is_active')
      .order('tahun_mulai', { ascending: false });
    if (kurErr) throw kurErr;

    const targetKur = (kurList ?? []).find((k) => k.kode === kur) || (kurList ?? []).find((k) => k.is_active) || (kurList ?? [])[0];
    if (!targetKur) {
      return NextResponse.json({ success: true, data: { ikList: [], kurList, kurikulumActive: null } });
    }

    if (idIkParam) {
      const id_ik = Number(idIkParam);
      if (!Number.isInteger(id_ik) || id_ik <= 0) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
      }
      const { data: ikRow, error: ikErr } = await admin
        .from('indikator_kinerja')
        .select('id_ik, kode_ik, deskripsi, id_cpl, cpl:id_cpl ( kode_cpl, singkatan, id_kurikulum, kurikulum:id_kurikulum ( kode ) )')
        .eq('id_ik', id_ik)
        .maybeSingle();
      if (ikErr) throw ikErr;
      if (!ikRow) return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'IK tidak ditemukan.' }, { status: 404 });

      const idKurikulum = (ikRow as any).cpl?.id_kurikulum;
      const { data: kurMk } = await admin.from('kurikulum_mk').select('id_mata_kuliah').eq('id_kurikulum', idKurikulum);
      const mkIds = (kurMk ?? []).map((r) => r.id_mata_kuliah);

      const { data: cpmkRows, error: cpmkErr } = mkIds.length
        ? await admin
            .from('cpmk')
            .select('id_cpmk, kode_cpmk, deskripsi_id, id_mata_kuliah, urutan, mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk, singkatan )')
            .in('id_mata_kuliah', mkIds)
            .order('urutan')
            .order('kode_cpmk')
        : { data: [] as any[], error: null };
      if (cpmkErr) throw cpmkErr;

      const cpmkIds = (cpmkRows ?? []).map((c) => c.id_cpmk);
      const { data: bobotRows } = cpmkIds.length
        ? await admin.from('mapping_cpmk_ik').select('id_cpmk, bobot_persen').eq('id_ik', id_ik).in('id_cpmk', cpmkIds)
        : { data: [] as any[] };
      const bobotMap = new Map((bobotRows ?? []).map((b) => [b.id_cpmk, Number(b.bobot_persen)]));

      const cpmkList = (cpmkRows ?? [])
        .map((c: any) => ({
          id_cpmk: c.id_cpmk,
          kode_cpmk: c.kode_cpmk,
          deskripsi_id: c.deskripsi_id,
          id_mata_kuliah: c.id_mata_kuliah,
          kode_mk: c.mata_kuliah?.kode_mk,
          nama_mk: c.mata_kuliah?.nama_mk,
          singkatan_mk: c.mata_kuliah?.singkatan,
          bobot_persen: bobotMap.get(c.id_cpmk) ?? 0,
        }))
        .sort((a: any, b: any) => (a.kode_mk ?? '').localeCompare(b.kode_mk ?? ''));

      return NextResponse.json({ success: true, data: { ik: ikRow, cpmkList } });
    }

    const { data: cpls, error: cplErr } = await admin
      .from('cpl')
      .select('id_cpl, kode_cpl, singkatan, urutan')
      .eq('id_kurikulum', targetKur.id_kurikulum);
    if (cplErr) throw cplErr;
    const cplIds = (cpls ?? []).map((c) => c.id_cpl);
    const cplById = new Map((cpls ?? []).map((c) => [c.id_cpl, c]));

    const { data: ikRows, error: ikListErr } = cplIds.length
      ? await admin.from('indikator_kinerja').select('id_ik, kode_ik, deskripsi, id_cpl, urutan').in('id_cpl', cplIds)
      : { data: [] as any[], error: null };
    if (ikListErr) throw ikListErr;

    const ikIds = (ikRows ?? []).map((r) => r.id_ik);
    const { data: bobotAll } = ikIds.length
      ? await admin.from('mapping_cpmk_ik').select('id_ik, bobot_persen').in('id_ik', ikIds)
      : { data: [] as any[] };
    const sumByIk = new Map<number, number>();
    const countByIk = new Map<number, number>();
    for (const b of bobotAll ?? []) {
      sumByIk.set(b.id_ik, (sumByIk.get(b.id_ik) ?? 0) + Number(b.bobot_persen));
      if (Number(b.bobot_persen) > 0) countByIk.set(b.id_ik, (countByIk.get(b.id_ik) ?? 0) + 1);
    }

    const ikList = (ikRows ?? [])
      .map((r) => {
        const cpl = cplById.get(r.id_cpl);
        return {
          id_ik: r.id_ik,
          kode_ik: r.kode_ik,
          deskripsi: r.deskripsi,
          kode_cpl: cpl?.kode_cpl,
          singkatan_cpl: cpl?.singkatan,
          id_kurikulum: targetKur.id_kurikulum,
          kode_kurikulum: targetKur.kode,
          sum_bobot: Number(sumByIk.get(r.id_ik) ?? 0),
          jumlah_cpmk: countByIk.get(r.id_ik) ?? 0,
          _urutanCpl: cpl?.urutan ?? 0,
          urutan: r.urutan,
        };
      })
      .sort((a, b) => a._urutanCpl - b._urutanCpl || (a.kode_cpl ?? '').localeCompare(b.kode_cpl ?? '') || a.urutan - b.urutan || a.kode_ik.localeCompare(b.kode_ik))
      .map(({ _urutanCpl, ...rest }) => rest);

    return NextResponse.json({ success: true, data: { ikList, kurList, kurikulumActive: targetKur } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/mapping-cpmk-ik]', err);
    return serverError('Gagal memuat mapping.');
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const id_ik = Number(body?.id_ik);
    const items: Array<{ id_cpmk: number; bobot_persen: number }> = Array.isArray(body?.items) ? body.items : [];
    if (!Number.isInteger(id_ik) || id_ik <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
    }

    const cleaned: Array<{ id_cpmk: number; bobot_persen: number }> = [];
    for (const it of items) {
      const idC = Number(it?.id_cpmk);
      const bb = Number(it?.bobot_persen);
      if (!Number.isInteger(idC) || idC <= 0) continue;
      if (!Number.isFinite(bb) || bb < 0 || bb > 100) {
        return NextResponse.json({ success: false, error: 'BAD_BOBOT', message: `Bobot CPMK id=${idC} harus 0..100.` }, { status: 400 });
      }
      if (bb > 0) cleaned.push({ id_cpmk: idC, bobot_persen: Number(bb.toFixed(3)) });
    }

    const sum = cleaned.reduce((a, b) => a + b.bobot_persen, 0);
    if (cleaned.length > 0 && Math.abs(sum - 100) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'BOBOT_NOT_100', message: `Total bobot CPMK untuk IK ini = ${sum.toFixed(3)}% (harus 100%).` },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    await admin.from('mapping_cpmk_ik').delete().eq('id_ik', id_ik);
    if (cleaned.length > 0) {
      const { error: insErr } = await admin.from('mapping_cpmk_ik').insert(cleaned.map((it) => ({ id_cpmk: it.id_cpmk, id_ik, bobot_persen: it.bobot_persen })));
      if (insErr) throw insErr;
    }

    return NextResponse.json({
      success: true,
      message: cleaned.length === 0 ? 'Semua mapping CPMK->IK untuk indikator ini telah dihapus.' : `Tersimpan: ${cleaned.length} CPMK (total ${sum.toFixed(3)}%).`,
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PUT /api/admin/mapping-cpmk-ik]', err);
    return serverError('Gagal menyimpan mapping.');
  }
}
