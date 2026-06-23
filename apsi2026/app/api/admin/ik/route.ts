import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';
    const idCplFilter = url.searchParams.get('id_cpl');

    const admin = createSupabaseAdminClient();

    const { data: rows, error } = await admin
      .from('indikator_kinerja')
      .select(
        `id_ik, id_cpl, kode_ik, deskripsi, deskripsi_en, urutan,
         cpl:id_cpl ( kode_cpl, singkatan, id_kurikulum,
           kurikulum:id_kurikulum ( id_kurikulum, kode, tahun_mulai ) )`,
      );
    if (error) throw error;

    let ikList = (rows ?? []).map((r: any) => ({
      id_ik: r.id_ik,
      id_cpl: r.id_cpl,
      kode_ik: r.kode_ik,
      deskripsi: r.deskripsi,
      deskripsi_en: r.deskripsi_en,
      urutan: r.urutan,
      kode_cpl: r.cpl?.kode_cpl,
      singkatan_cpl: r.cpl?.singkatan,
      id_kurikulum: r.cpl?.id_kurikulum,
      kode_kurikulum: r.cpl?.kurikulum?.kode,
      _tahun: r.cpl?.kurikulum?.tahun_mulai ?? 0,
    }));

    if (kur) {
      ikList = ikList.filter((r) => r.kode_kurikulum === kur || String(r.id_kurikulum) === kur);
    }
    if (idCplFilter) {
      ikList = ikList.filter((r) => r.id_cpl === Number(idCplFilter));
    }
    ikList.sort((a, b) => b._tahun - a._tahun || (a.kode_cpl ?? '').localeCompare(b.kode_cpl ?? '') || a.urutan - b.urutan || a.kode_ik.localeCompare(b.kode_ik));
    const ikOut = ikList.map(({ _tahun, ...rest }) => rest);

    const { data: cplRows, error: cplErr } = await admin
      .from('cpl')
      .select('id_cpl, id_kurikulum, kode_cpl, singkatan, domain, kurikulum:id_kurikulum ( kode, is_active, tahun_mulai )');
    if (cplErr) throw cplErr;
    const cplList = (cplRows ?? [])
      .map((c: any) => ({
        id_cpl: c.id_cpl,
        id_kurikulum: c.id_kurikulum,
        kode_cpl: c.kode_cpl,
        singkatan: c.singkatan,
        domain: c.domain,
        kode_kurikulum: c.kurikulum?.kode,
        kurikulum_active: c.kurikulum?.is_active,
        _tahun: c.kurikulum?.tahun_mulai ?? 0,
      }))
      .sort((a, b) => b._tahun - a._tahun || (a.kode_cpl ?? '').localeCompare(b.kode_cpl ?? ''))
      .map(({ _tahun, ...rest }) => rest);

    return NextResponse.json({ success: true, data: { ikList: ikOut, cplList } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/ik]', err);
    return serverError('Gagal memuat IK.');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const id_cpl = Number(body?.id_cpl);
    const kode_ik = String(body?.kode_ik || '').trim();
    const deskripsi = String(body?.deskripsi || '').trim();
    const deskripsi_en = body?.deskripsi_en ? String(body.deskripsi_en).trim() : null;
    const urutan = Number.isFinite(Number(body?.urutan)) ? Number(body.urutan) : 0;

    if (!Number.isInteger(id_cpl) || id_cpl <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'CPL induk wajib dipilih.' }, { status: 400 });
    }
    if (!kode_ik || kode_ik.length > 20) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode IK wajib (maks 20 karakter).' }, { status: 400 });
    }
    if (!/^[A-Za-z]+-[0-9]+$/.test(kode_ik)) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Format Kode IK harus huruf-angka, contoh: IK-1.' }, { status: 400 });
    }
    if (!deskripsi) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi IK wajib diisi.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: dup } = await admin.from('indikator_kinerja').select('id_ik').eq('id_cpl', id_cpl).eq('kode_ik', kode_ik).maybeSingle();
    if (dup) {
      return NextResponse.json({ success: false, error: 'DUPLICATE', message: `Kode IK '${kode_ik}' sudah ada di CPL ini.` }, { status: 409 });
    }

    const { data: ins, error: insErr } = await admin
      .from('indikator_kinerja')
      .insert({ id_cpl, kode_ik, deskripsi, deskripsi_en, urutan })
      .select('id_ik')
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ success: true, message: `IK ${kode_ik} berhasil ditambahkan.`, data: { id_ik: ins.id_ik } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/ik]', err);
    return serverError('Gagal menambah IK.');
  }
}
