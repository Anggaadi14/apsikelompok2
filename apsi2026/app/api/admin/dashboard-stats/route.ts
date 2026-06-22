import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/dashboard-stats
     GET ?ta=2025/2026&sem=Ganjil&kur=K24
     -> 6 KPI cards untuk admin dashboard, real data dari DB.
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const ta = url.searchParams.get('ta') || '';
    const sem = url.searchParams.get('sem') || '';
    const kur = url.searchParams.get('kur') || '';

    const admin = createSupabaseAdminClient();

    let id_kurikulum: number | null = null;
    if (kur) {
      const { data } = await admin.from('kurikulum').select('id_kurikulum').or(`kode.eq.${kur},id_kurikulum.eq.${Number(kur) || 0}`).maybeSingle();
      if (data) id_kurikulum = data.id_kurikulum;
    }
    if (!id_kurikulum) {
      const { data } = await admin.from('kurikulum').select('id_kurikulum').eq('is_active', true).order('tahun_mulai', { ascending: false }).limit(1).maybeSingle();
      if (data) id_kurikulum = data.id_kurikulum;
    }

    const { count: mhsCount } = await admin.from('mahasiswa').select('id_mahasiswa', { count: 'exact', head: true });
    const { count: dosCount } = await admin.from('staff').select('id_staff', { count: 'exact', head: true }).in('peran', ['dosen', 'kaprodi']);

    let cplCount = 0, ikCount = 0, cpmkCount = 0;
    if (id_kurikulum) {
      const { count: c1 } = await admin.from('cpl').select('id_cpl', { count: 'exact', head: true }).eq('id_kurikulum', id_kurikulum);
      cplCount = c1 ?? 0;

      const { data: cplIds } = await admin.from('cpl').select('id_cpl').eq('id_kurikulum', id_kurikulum);
      const cplIdList = (cplIds ?? []).map((c) => c.id_cpl);
      if (cplIdList.length) {
        const { count: c2 } = await admin.from('indikator_kinerja').select('id_ik', { count: 'exact', head: true }).in('id_cpl', cplIdList);
        ikCount = c2 ?? 0;
      }

      const { data: mkIds } = await admin.from('kurikulum_mk').select('id_mata_kuliah').eq('id_kurikulum', id_kurikulum);
      const mkIdList = (mkIds ?? []).map((m) => m.id_mata_kuliah);
      if (mkIdList.length) {
        const { count: c3 } = await admin.from('cpmk').select('id_cpmk', { count: 'exact', head: true }).in('id_mata_kuliah', mkIdList);
        cpmkCount = c3 ?? 0;
      }
    } else {
      const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
        admin.from('cpl').select('id_cpl', { count: 'exact', head: true }),
        admin.from('indikator_kinerja').select('id_ik', { count: 'exact', head: true }),
        admin.from('cpmk').select('id_cpmk', { count: 'exact', head: true }),
      ]);
      cplCount = c1 ?? 0; ikCount = c2 ?? 0; cpmkCount = c3 ?? 0;
    }
    const obeTotal = cplCount + ikCount + cpmkCount;

    let kelasQuery = admin.from('kelas_mk').select('id_kelas', { count: 'exact', head: true });
    if (ta) kelasQuery = kelasQuery.eq('tahun_akademik', ta);
    if (sem) kelasQuery = kelasQuery.eq('semester', sem);
    if (id_kurikulum) kelasQuery = kelasQuery.eq('id_kurikulum', id_kurikulum);
    const { count: mkTayang } = await kelasQuery;

    let kelasIdsQuery = admin.from('kelas_mk').select('id_kelas');
    if (ta) kelasIdsQuery = kelasIdsQuery.eq('tahun_akademik', ta);
    if (sem) kelasIdsQuery = kelasIdsQuery.eq('semester', sem);
    if (id_kurikulum) kelasIdsQuery = kelasIdsQuery.eq('id_kurikulum', id_kurikulum);
    const { data: kelasIdsRows } = await kelasIdsQuery;
    const kelasIdList = (kelasIdsRows ?? []).map((k) => k.id_kelas);

    let uploadMasuk = 0;
    if (kelasIdList.length) {
      const { data: uploadRows } = await admin.from('upload_log_nilai').select('id_kelas').eq('status', 'success').in('id_kelas', kelasIdList);
      uploadMasuk = new Set((uploadRows ?? []).map((u) => u.id_kelas)).size;
    }

    const dataBelumLengkap = Math.max(0, (mkTayang ?? 0) - uploadMasuk);

    return NextResponse.json({
      success: true,
      data: {
        mahasiswa: mhsCount ?? 0,
        dosen: dosCount ?? 0,
        cpl: cplCount,
        ik: ikCount,
        cpmk: cpmkCount,
        obe_total: obeTotal,
        mk_tayang: mkTayang ?? 0,
        upload_masuk: uploadMasuk,
        upload_total: mkTayang ?? 0,
        data_belum_lengkap: dataBelumLengkap,
        filter: { ta, sem, kurikulum_kode: kur, id_kurikulum },
      },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/dashboard-stats]', err);
    return serverError('Gagal memuat statistik.');
  }
}
