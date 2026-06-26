import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const idMk = url.searchParams.get('id_mk');
    const kur = url.searchParams.get('kur') || '';

    const admin = createSupabaseAdminClient();

    let kurMkIds: Set<number> | null = null;
    if (kur) {
      const { data: kurMk } = await admin
        .from('kurikulum_mk')
        .select('id_mata_kuliah, kurikulum:id_kurikulum ( id_kurikulum, kode )');
      kurMkIds = new Set(
        (kurMk ?? [])
          .filter((r: any) => r.kurikulum?.kode === kur || String(r.kurikulum?.id_kurikulum) === kur)
          .map((r: any) => r.id_mata_kuliah),
      );
    }

    // Fetch CPMK without is_evaluator in join (column may not exist in all DB versions)
    const { data: rows, error } = await admin
      .from('cpmk')
      .select(
        `id_cpmk, id_mata_kuliah, kode_cpmk, deskripsi_id, deskripsi_en, urutan,
         mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk, singkatan )`,
      );
    if (error) throw error;

    // Fetch mkList with is_evaluator separately; fall back gracefully if column missing
    const { data: mkListRaw } = await admin
      .from('mata_kuliah')
      .select('id_mata_kuliah, kode_mk, nama_mk, singkatan, sks, is_evaluator')
      .order('kode_mk');
    // Build evaluator lookup map (is_evaluator may be undefined if column doesn't exist)
    const evalMap = new Map<number, boolean>();
    for (const m of mkListRaw ?? []) {
      evalMap.set(m.id_mata_kuliah, m.is_evaluator === true);
    }

    let cpmkList = (rows ?? []).map((r: any) => ({
      id_cpmk: r.id_cpmk,
      id_mata_kuliah: r.id_mata_kuliah,
      kode_cpmk: r.kode_cpmk,
      deskripsi_id: r.deskripsi_id,
      deskripsi_en: r.deskripsi_en ?? null,
      urutan: r.urutan,
      kode_mk: r.mata_kuliah?.kode_mk,
      nama_mk: r.mata_kuliah?.nama_mk,
      singkatan_mk: r.mata_kuliah?.singkatan ?? null,
      is_evaluator_mk: evalMap.get(r.id_mata_kuliah) ?? false,
    }));
    if (idMk) cpmkList = cpmkList.filter((r) => r.id_mata_kuliah === Number(idMk));
    if (kurMkIds) cpmkList = cpmkList.filter((r) => kurMkIds!.has(r.id_mata_kuliah));
    cpmkList.sort((a, b) => (a.kode_mk ?? '').localeCompare(b.kode_mk ?? '') || a.urutan - b.urutan || a.kode_cpmk.localeCompare(b.kode_cpmk));

    // mkList for dropdown (strip is_evaluator — not needed on frontend mkList)
    const mkList = (mkListRaw ?? []).map(({ is_evaluator: _ie, ...m }: any) => m);

    return NextResponse.json({ success: true, data: { cpmkList, mkList } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/cpmk]', err);
    return serverError('Gagal memuat CPMK.');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const id_mata_kuliah = Number(body?.id_mata_kuliah);
    const kode_cpmk = String(body?.kode_cpmk || '').trim();
    const deskripsi_id = String(body?.deskripsi_id || '').trim();
    const deskripsi_en = body?.deskripsi_en ? String(body.deskripsi_en).trim() : null;
    const urutan = Number.isFinite(Number(body?.urutan)) ? Number(body.urutan) : 0;

    if (!Number.isInteger(id_mata_kuliah) || id_mata_kuliah <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Mata kuliah induk wajib dipilih.' }, { status: 400 });
    }
    if (!kode_cpmk || kode_cpmk.length > 30) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode CPMK wajib (maks 30).' }, { status: 400 });
    }
    if (!/^[A-Za-z]+-[0-9]+$/.test(kode_cpmk)) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Format Kode CPMK harus huruf-angka, contoh: MO-1.' }, { status: 400 });
    }
    if (!deskripsi_id) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi (ID) wajib.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: dup } = await admin.from('cpmk').select('id_cpmk').eq('id_mata_kuliah', id_mata_kuliah).eq('kode_cpmk', kode_cpmk).maybeSingle();
    if (dup) {
      return NextResponse.json({ success: false, error: 'DUPLICATE', message: `Kode CPMK '${kode_cpmk}' sudah ada di MK ini.` }, { status: 409 });
    }

    const { data: ins, error: insErr } = await admin
      .from('cpmk')
      .insert({ id_mata_kuliah, kode_cpmk, deskripsi_id, deskripsi_en, urutan })
      .select('id_cpmk')
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ success: true, message: `CPMK ${kode_cpmk} berhasil ditambahkan.`, data: { id_cpmk: ins.id_cpmk } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/cpmk]', err);
    return serverError('Gagal menambah CPMK.');
  }
}
