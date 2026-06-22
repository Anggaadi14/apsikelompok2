import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/bobot-ik-cpl
     GET  ?kur=K24    -> matriks bobot IK->CPL semua CPL pada satu kurikulum.
     PUT              -> simpan bobot per-CPL (validasi sum = 100).
        body: { rows: [{ id_cpl, id_ik, bobot_persen }] }
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface IkRow {
  id_ik: number;
  id_cpl: number;
  kode_ik: string;
  deskripsi: string;
  urutan: number;
  bobot_persen: number;
}
interface CplGroup {
  id_cpl: number;
  kode_cpl: string;
  singkatan: string;
  domain: string;
  deskripsi_id: string;
  sum_bobot: number;
  ik: IkRow[];
}

async function resolveIdKurikulum(admin: ReturnType<typeof createSupabaseAdminClient>, kur: string): Promise<number | null> {
  if (kur) {
    const { data } = await admin.from('kurikulum').select('id_kurikulum').or(`kode.eq.${kur},id_kurikulum.eq.${Number(kur) || 0}`).maybeSingle();
    if (data) return data.id_kurikulum;
  }
  const { data: def } = await admin.from('kurikulum').select('id_kurikulum').eq('is_active', true).order('tahun_mulai', { ascending: false }).limit(1).maybeSingle();
  return def?.id_kurikulum ?? null;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';
    const admin = createSupabaseAdminClient();
    const id_kurikulum = await resolveIdKurikulum(admin, kur);
    if (!id_kurikulum) {
      return NextResponse.json({ success: true, data: { id_kurikulum: null, kode_kurikulum: null, groups: [] } });
    }

    const { data: kRow } = await admin.from('kurikulum').select('kode').eq('id_kurikulum', id_kurikulum).maybeSingle();

    const { data: cpls, error: cplErr } = await admin
      .from('cpl')
      .select('id_cpl, kode_cpl, singkatan, domain, deskripsi_id, urutan')
      .eq('id_kurikulum', id_kurikulum)
      .order('urutan')
      .order('kode_cpl');
    if (cplErr) throw cplErr;

    const cplIds = (cpls ?? []).map((c) => c.id_cpl);
    const { data: iks, error: ikErr } = cplIds.length
      ? await admin
          .from('indikator_kinerja')
          .select('id_ik, id_cpl, kode_ik, deskripsi, urutan')
          .in('id_cpl', cplIds)
          .order('urutan')
          .order('kode_ik')
      : { data: [] as any[], error: null };
    if (ikErr) throw ikErr;

    const ikIds = (iks ?? []).map((r) => r.id_ik);
    const { data: bobotRows, error: bobotErr } = ikIds.length
      ? await admin.from('mapping_ik_cpl').select('id_ik, id_cpl, bobot_persen').in('id_ik', ikIds)
      : { data: [] as any[], error: null };
    if (bobotErr) throw bobotErr;
    const bobotMap = new Map((bobotRows ?? []).map((b) => [`${b.id_ik}::${b.id_cpl}`, Number(b.bobot_persen)]));

    const groups: CplGroup[] = (cpls ?? []).map((c) => {
      const ikList: IkRow[] = (iks ?? [])
        .filter((r: any) => r.id_cpl === c.id_cpl)
        .map((r: any) => ({
          id_ik: r.id_ik,
          id_cpl: c.id_cpl,
          kode_ik: r.kode_ik,
          deskripsi: r.deskripsi,
          urutan: r.urutan,
          bobot_persen: bobotMap.get(`${r.id_ik}::${c.id_cpl}`) ?? 0,
        }));
      const sum_bobot = ikList.reduce((acc, r) => acc + r.bobot_persen, 0);
      return {
        id_cpl: c.id_cpl,
        kode_cpl: c.kode_cpl,
        singkatan: c.singkatan,
        domain: c.domain,
        deskripsi_id: c.deskripsi_id,
        sum_bobot: Math.round(sum_bobot * 1000) / 1000,
        ik: ikList,
      };
    });

    return NextResponse.json({ success: true, data: { id_kurikulum, kode_kurikulum: kRow?.kode ?? null, groups } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/bobot-ik-cpl]', err);
    return serverError('Gagal memuat bobot IK→CPL.');
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const rowsRaw = Array.isArray(body?.rows) ? body.rows : [];
    if (rowsRaw.length === 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'rows kosong.' }, { status: 400 });
    }

    type R = { id_ik: number; id_cpl: number; bobot_persen: number };
    const rows: R[] = [];
    for (const r of rowsRaw) {
      const id_ik = Number(r?.id_ik);
      const id_cpl = Number(r?.id_cpl);
      const bobot = Number(r?.bobot_persen);
      if (!Number.isInteger(id_ik) || id_ik <= 0) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
      }
      if (!Number.isInteger(id_cpl) || id_cpl <= 0) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpl tidak valid.' }, { status: 400 });
      }
      if (!Number.isFinite(bobot) || bobot < 0 || bobot > 100) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'bobot_persen harus 0..100.' }, { status: 400 });
      }
      rows.push({ id_ik, id_cpl, bobot_persen: Math.round(bobot * 1000) / 1000 });
    }

    const sumPerCpl = new Map<number, number>();
    for (const r of rows) sumPerCpl.set(r.id_cpl, (sumPerCpl.get(r.id_cpl) ?? 0) + r.bobot_persen);
    const invalid: Array<{ id_cpl: number; sum: number }> = [];
    for (const [id_cpl, s] of sumPerCpl) {
      if (Math.abs(s - 100) > 0.01) invalid.push({ id_cpl, sum: Math.round(s * 1000) / 1000 });
    }
    if (invalid.length > 0) {
      return NextResponse.json(
        { success: false, error: 'SUM_NOT_100', message: `Total bobot per CPL harus 100. ${invalid.map((x) => `CPL #${x.id_cpl} = ${x.sum}`).join(', ')}.`, invalid },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const ikIds = Array.from(new Set(rows.map((r) => r.id_ik)));
    const { data: ikRows, error: ikErr } = await admin.from('indikator_kinerja').select('id_ik, id_cpl').in('id_ik', ikIds);
    if (ikErr) throw ikErr;
    const ikParent = new Map((ikRows ?? []).map((x) => [x.id_ik, x.id_cpl]));
    for (const r of rows) {
      if (ikParent.get(r.id_ik) !== r.id_cpl) {
        return NextResponse.json({ success: false, error: 'IK_CPL_MISMATCH', message: `IK ${r.id_ik} bukan turunan CPL ${r.id_cpl}.` }, { status: 400 });
      }
    }

    const { error: upErr } = await admin
      .from('mapping_ik_cpl')
      .upsert(rows, { onConflict: 'id_ik,id_cpl' });
    if (upErr) throw upErr;

    return NextResponse.json({ success: true, message: `Bobot tersimpan (${rows.length} IK).` });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PUT /api/admin/bobot-ik-cpl]', err);
    return serverError('Gagal menyimpan bobot IK→CPL.');
  }
}
