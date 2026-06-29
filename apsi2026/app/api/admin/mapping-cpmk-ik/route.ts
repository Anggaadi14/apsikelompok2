import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mapping CPMK -> IK (tanpa bobot — engine v_nilai_ik_per_mhs memakai rata-rata CPMK per IK).
 *
 * GET  ?kur=K24                  -> { ikList, kurList, kurikulumActive }
 * GET  ?kur=K24&id_ik=12         -> { ik, cpmkList }            (atur dari sisi IK)
 * GET  ?kur=K24&cpmk_list=1      -> { cpmkList }                (daftar CPMK per MK untuk wizard "Tambah Mapping")
 * GET  ?kur=K24&id_cpmk=34       -> { cpmk, ikList }             (atur dari sisi CPMK)
 * PUT  body { id_ik, id_cpmk_list: number[] } -> ganti mapping CPMK untuk IK ini
 * PUT  body { id_cpmk, id_ik_list: number[] } -> ganti mapping IK untuk CPMK ini
 */

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';
    const idIkParam = url.searchParams.get('id_ik');
    const idCpmkParam = url.searchParams.get('id_cpmk');
    const wantCpmkList = url.searchParams.get('cpmk_list') === '1';

    const admin = createSupabaseAdminClient();

    const { data: kurList, error: kurErr } = await admin
      .from('kurikulum')
      .select('id_kurikulum, kode, nama, is_active')
      .order('tahun_mulai', { ascending: false });
    if (kurErr) throw kurErr;

    const targetKur = (kurList ?? []).find((k) => k.kode === kur) || (kurList ?? []).find((k) => k.is_active) || (kurList ?? [])[0];
    if (!targetKur) {
      return NextResponse.json({ success: true, data: { ikList: [], cpmkList: [], kurList, kurikulumActive: null } });
    }

    if (wantCpmkList) {
      const { data: kurMk } = await admin.from('kurikulum_mk').select('id_mata_kuliah').eq('id_kurikulum', targetKur.id_kurikulum);
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

      const cpmkList = (cpmkRows ?? [])
        .map((c: any) => ({
          id_cpmk: c.id_cpmk,
          kode_cpmk: c.kode_cpmk,
          deskripsi_id: c.deskripsi_id,
          id_mata_kuliah: c.id_mata_kuliah,
          kode_mk: c.mata_kuliah?.kode_mk,
          nama_mk: c.mata_kuliah?.nama_mk,
          singkatan_mk: c.mata_kuliah?.singkatan,
        }))
        .sort((a: any, b: any) => (a.kode_mk ?? '').localeCompare(b.kode_mk ?? '') || a.kode_cpmk.localeCompare(b.kode_cpmk));

      return NextResponse.json({ success: true, data: { cpmkList } });
    }

    if (idCpmkParam) {
      const id_cpmk = Number(idCpmkParam);
      if (!Number.isInteger(id_cpmk) || id_cpmk <= 0) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpmk tidak valid.' }, { status: 400 });
      }
      const { data: cpmkRow, error: cpmkErr } = await admin
        .from('cpmk')
        .select('id_cpmk, kode_cpmk, deskripsi_id, id_mata_kuliah, mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk, singkatan )')
        .eq('id_cpmk', id_cpmk)
        .maybeSingle();
      if (cpmkErr) throw cpmkErr;
      if (!cpmkRow) return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'CPMK tidak ditemukan.' }, { status: 404 });

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

      const { data: mappedRows } = await admin.from('mapping_cpmk_ik').select('id_ik').eq('id_cpmk', id_cpmk);
      const mappedSet = new Set((mappedRows ?? []).map((m) => m.id_ik));

      const ikList = (ikRows ?? [])
        .map((r) => {
          const cpl = cplById.get(r.id_cpl);
          return {
            id_ik: r.id_ik,
            kode_ik: r.kode_ik,
            deskripsi: r.deskripsi,
            id_cpl: r.id_cpl,
            kode_cpl: cpl?.kode_cpl,
            singkatan_cpl: cpl?.singkatan,
            mapped: mappedSet.has(r.id_ik),
            _urutanCpl: cpl?.urutan ?? 0,
            urutan: r.urutan,
          };
        })
        .sort((a, b) => a._urutanCpl - b._urutanCpl || (a.kode_cpl ?? '').localeCompare(b.kode_cpl ?? '') || a.urutan - b.urutan || a.kode_ik.localeCompare(b.kode_ik))
        .map(({ _urutanCpl, ...rest }) => rest);

      const cpmk = {
        id_cpmk: cpmkRow.id_cpmk,
        kode_cpmk: cpmkRow.kode_cpmk,
        deskripsi_id: cpmkRow.deskripsi_id,
        kode_mk: (cpmkRow as any).mata_kuliah?.kode_mk,
        nama_mk: (cpmkRow as any).mata_kuliah?.nama_mk,
      };

      return NextResponse.json({ success: true, data: { cpmk, ikList } });
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
            .select('id_cpmk, kode_cpmk, deskripsi_id, id_mata_kuliah, urutan, mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk, singkatan, is_evaluator )')
            .in('id_mata_kuliah', mkIds)
            .order('urutan')
            .order('kode_cpmk')
        : { data: [] as any[], error: null };
      if (cpmkErr) throw cpmkErr;

      const cpmkIds = (cpmkRows ?? []).map((c) => c.id_cpmk);
      const { data: mappedRows } = cpmkIds.length
        ? await admin.from('mapping_cpmk_ik').select('id_cpmk').eq('id_ik', id_ik).in('id_cpmk', cpmkIds)
        : { data: [] as any[] };
      const mappedSet = new Set((mappedRows ?? []).map((b) => b.id_cpmk));

      const cpmkList = (cpmkRows ?? [])
        .map((c: any) => ({
          id_cpmk: c.id_cpmk,
          kode_cpmk: c.kode_cpmk,
          deskripsi_id: c.deskripsi_id,
          id_mata_kuliah: c.id_mata_kuliah,
          kode_mk: c.mata_kuliah?.kode_mk,
          nama_mk: c.mata_kuliah?.nama_mk,
          singkatan_mk: c.mata_kuliah?.singkatan,
          is_evaluator: c.mata_kuliah?.is_evaluator ?? false,
          mapped: mappedSet.has(c.id_cpmk),
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
    const { data: mappingAll } = ikIds.length
      ? await admin.from('mapping_cpmk_ik').select('id_ik').in('id_ik', ikIds)
      : { data: [] as any[] };
    const countByIk = new Map<number, number>();
    for (const m of mappingAll ?? []) {
      countByIk.set(m.id_ik, (countByIk.get(m.id_ik) ?? 0) + 1);
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
    const admin = createSupabaseAdminClient();

    if (body?.id_cpmk !== undefined) {
      const id_cpmk = Number(body.id_cpmk);
      if (!Number.isInteger(id_cpmk) || id_cpmk <= 0) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpmk tidak valid.' }, { status: 400 });
      }
      const idIkListRaw: unknown[] = Array.isArray(body?.id_ik_list) ? body.id_ik_list : [];
      const idIkList: number[] = [];
      for (const v of idIkListRaw) {
        const n = Number(v);
        if (Number.isInteger(n) && n > 0 && !idIkList.includes(n)) idIkList.push(n);
      }

      await admin.from('mapping_cpmk_ik').delete().eq('id_cpmk', id_cpmk);
      if (idIkList.length > 0) {
        const { error: insErr } = await admin.from('mapping_cpmk_ik').insert(idIkList.map((id_ik) => ({ id_cpmk, id_ik, bobot_persen: 0 })));
        if (insErr) throw insErr;
      }

      return NextResponse.json({
        success: true,
        message: idIkList.length === 0 ? 'Semua mapping CPMK->IK untuk CPMK ini telah dihapus.' : `Tersimpan: ${idIkList.length} IK dipetakan untuk CPMK ini.`,
      });
    }

    const id_ik = Number(body?.id_ik);
    const idCpmkListRaw: unknown[] = Array.isArray(body?.id_cpmk_list) ? body.id_cpmk_list : [];
    if (!Number.isInteger(id_ik) || id_ik <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
    }

    const idCpmkList: number[] = [];
    for (const v of idCpmkListRaw) {
      const n = Number(v);
      if (Number.isInteger(n) && n > 0 && !idCpmkList.includes(n)) idCpmkList.push(n);
    }

    await admin.from('mapping_cpmk_ik').delete().eq('id_ik', id_ik);
    if (idCpmkList.length > 0) {
      const { error: insErr } = await admin.from('mapping_cpmk_ik').insert(idCpmkList.map((id_cpmk) => ({ id_cpmk, id_ik, bobot_persen: 0 })));
      if (insErr) throw insErr;
    }

    return NextResponse.json({
      success: true,
      message: idCpmkList.length === 0 ? 'Semua mapping CPMK->IK untuk indikator ini telah dihapus.' : `Tersimpan: ${idCpmkList.length} CPMK dipetakan.`,
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PUT /api/admin/mapping-cpmk-ik]', err);
    return serverError('Gagal menyimpan mapping.');
  }
}
