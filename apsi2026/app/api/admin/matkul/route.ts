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

    const admin = createSupabaseAdminClient();

    const { data: mkRows, error } = await admin
      .from('mata_kuliah')
      .select('id_mata_kuliah, kode_mk, nama_mk, nama_mk_en, sks, singkatan')
      .order('kode_mk');
    if (error) throw error;

    const { data: linkRows, error: linkErr } = await admin
      .from('kurikulum_mk')
      .select('id_mata_kuliah, id_kurikulum, is_wajib, semester_default, kurikulum:id_kurikulum ( kode, tahun_mulai )');
    if (linkErr) throw linkErr;

    const { data: kurList, error: kurErr } = await admin
      .from('kurikulum')
      .select('id_kurikulum, kode, nama, is_active')
      .order('tahun_mulai', { ascending: false });
    if (kurErr) throw kurErr;

    let mkIdsInKur: Set<number> | null = null;
    if (kur) {
      mkIdsInKur = new Set(
        (linkRows ?? [])
          .filter((r: any) => r.kurikulum?.kode === kur || String(r.id_kurikulum) === kur)
          .map((r: any) => r.id_mata_kuliah),
      );
    }

    const cpmkCounts = new Map<number, number>();
    const { data: cpmkRows } = await admin.from('cpmk').select('id_mata_kuliah');
    for (const c of cpmkRows ?? []) cpmkCounts.set(c.id_mata_kuliah, (cpmkCounts.get(c.id_mata_kuliah) ?? 0) + 1);
    const kurCounts = new Map<number, number>();
    for (const l of linkRows ?? []) kurCounts.set(l.id_mata_kuliah, (kurCounts.get(l.id_mata_kuliah) ?? 0) + 1);

    let mkList = (mkRows ?? []).map((mk) => ({
      ...mk,
      jumlah_kurikulum: kurCounts.get(mk.id_mata_kuliah) ?? 0,
      jumlah_cpmk: cpmkCounts.get(mk.id_mata_kuliah) ?? 0,
    }));
    if (mkIdsInKur) mkList = mkList.filter((mk) => mkIdsInKur!.has(mk.id_mata_kuliah));

    const links = (linkRows ?? [])
      .map((r: any) => ({
        id_mata_kuliah: r.id_mata_kuliah,
        id_kurikulum: r.id_kurikulum,
        is_wajib: r.is_wajib,
        semester_default: r.semester_default,
        kode_kurikulum: r.kurikulum?.kode,
        _tahun: r.kurikulum?.tahun_mulai ?? 0,
      }))
      .sort((a: any, b: any) => b._tahun - a._tahun || (a.kode_kurikulum ?? '').localeCompare(b.kode_kurikulum ?? ''))
      .map(({ _tahun, ...rest }: any) => rest);

    return NextResponse.json({ success: true, data: { mkList, links, kurList } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/matkul]', err);
    return serverError('Gagal memuat mata kuliah.');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const kode_mk = String(body?.kode_mk || '').trim();
    const nama_mk = String(body?.nama_mk || '').trim();
    const nama_mk_en = body?.nama_mk_en ? String(body.nama_mk_en).trim() : null;
    const singkatan = body?.singkatan ? String(body.singkatan).trim() : null;
    const sks = Number(body?.sks);
    const links: Array<{ id_kurikulum: number; is_wajib?: number | boolean; semester_default?: number | null }> = Array.isArray(body?.links) ? body.links : [];

    if (!kode_mk || kode_mk.length > 30) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode MK wajib (maks 30).' }, { status: 400 });
    }
    if (!nama_mk) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Nama MK wajib.' }, { status: 400 });
    }
    if (!Number.isFinite(sks) || sks < 0 || sks > 99) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'SKS harus 0..99.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: dup } = await admin.from('mata_kuliah').select('id_mata_kuliah').eq('kode_mk', kode_mk).maybeSingle();
    if (dup) {
      return NextResponse.json({ success: false, error: 'DUPLICATE', message: `Kode MK '${kode_mk}' sudah ada.` }, { status: 409 });
    }

    const { data: ins, error: insErr } = await admin
      .from('mata_kuliah')
      .insert({ kode_mk, nama_mk, nama_mk_en, sks, singkatan })
      .select('id_mata_kuliah')
      .single();
    if (insErr) throw insErr;
    const id_mata_kuliah = ins.id_mata_kuliah;

    const linkRows = links
      .map((lk) => ({
        id_kurikulum: Number(lk?.id_kurikulum),
        id_mata_kuliah,
        is_wajib: !(lk?.is_wajib === false || lk?.is_wajib === 0),
        semester_default: lk?.semester_default != null && lk.semester_default !== ('' as unknown) ? Number(lk.semester_default) : null,
      }))
      .filter((lk) => Number.isInteger(lk.id_kurikulum) && lk.id_kurikulum > 0);
    if (linkRows.length > 0) {
      const { error: linkErr } = await admin.from('kurikulum_mk').insert(linkRows);
      if (linkErr) throw linkErr;
    }

    return NextResponse.json({ success: true, message: `MK ${kode_mk} berhasil ditambahkan.`, data: { id_mata_kuliah } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/matkul]', err);
    return serverError('Gagal menambah mata kuliah.');
  }
}
