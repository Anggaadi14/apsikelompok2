import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

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

    // Resolve id_kurikulum (kalau kur diberikan), else default kurikulum aktif.
    let id_kurikulum: number | null = null;
    if (kur) {
      const rows = (await query(
        `SELECT id_kurikulum FROM kurikulum WHERE kode = ? OR id_kurikulum = ? LIMIT 1`,
        [kur, Number(kur) || 0],
      )) as Array<{ id_kurikulum: number }>;
      if (rows.length) id_kurikulum = rows[0].id_kurikulum;
    }
    if (!id_kurikulum) {
      const rows = (await query(
        `SELECT id_kurikulum FROM kurikulum WHERE is_active = 1 ORDER BY tahun_mulai DESC LIMIT 1`,
      )) as Array<{ id_kurikulum: number }>;
      if (rows.length) id_kurikulum = rows[0].id_kurikulum;
    }

    // 1. Mahasiswa total
    const [mhsRow] = (await query(
      `SELECT COUNT(*) AS n FROM mahasiswa`,
    )) as Array<{ n: number }>;

    // 2. Dosen total (peran dosen / kaprodi, tidak ngitung admin/jamu)
    const [dosRow] = (await query(
      `SELECT COUNT(*) AS n FROM staff WHERE peran IN ('dosen','kaprodi')`,
    )) as Array<{ n: number }>;

    // 3. CPL + IK + CPMK total (filter id_kurikulum kalau ada)
    let cplCount = 0, ikCount = 0, cpmkCount = 0;
    if (id_kurikulum) {
      const [c1] = (await query(`SELECT COUNT(*) AS n FROM cpl WHERE id_kurikulum = ?`, [id_kurikulum])) as Array<{n:number}>;
      cplCount = c1.n;
      const [c2] = (await query(
        `SELECT COUNT(*) AS n FROM indikator_kinerja ik
         JOIN cpl c ON c.id_cpl = ik.id_cpl WHERE c.id_kurikulum = ?`,
        [id_kurikulum],
      )) as Array<{n:number}>;
      ikCount = c2.n;
      const [c3] = (await query(
        `SELECT COUNT(DISTINCT cpmk.id_cpmk) AS n
         FROM cpmk
         JOIN kurikulum_mk km ON km.id_mata_kuliah = cpmk.id_mata_kuliah
         WHERE km.id_kurikulum = ?`,
        [id_kurikulum],
      )) as Array<{n:number}>;
      cpmkCount = c3.n;
    } else {
      const [c1] = (await query(`SELECT COUNT(*) AS n FROM cpl`)) as Array<{n:number}>;
      cplCount = c1.n;
      const [c2] = (await query(`SELECT COUNT(*) AS n FROM indikator_kinerja`)) as Array<{n:number}>;
      ikCount = c2.n;
      const [c3] = (await query(`SELECT COUNT(*) AS n FROM cpmk`)) as Array<{n:number}>;
      cpmkCount = c3.n;
    }
    const obeTotal = cplCount + ikCount + cpmkCount;

    // 4. MK Tayang (kelas_mk) untuk TA+sem filter
    const kelasWhere: string[] = [];
    const kelasArgs: unknown[] = [];
    if (ta)  { kelasWhere.push('km.tahun_akademik = ?'); kelasArgs.push(ta); }
    if (sem) { kelasWhere.push('km.semester = ?');       kelasArgs.push(sem); }
    if (id_kurikulum) { kelasWhere.push('km.id_kurikulum = ?'); kelasArgs.push(id_kurikulum); }
    const whereSql = kelasWhere.length ? `WHERE ${kelasWhere.join(' AND ')}` : '';

    const [mkRow] = (await query(
      `SELECT COUNT(*) AS n FROM kelas_mk km ${whereSql}`,
      kelasArgs,
    )) as Array<{n:number}>;
    const mkTayang = mkRow.n;

    // 5. Upload Nilai Masuk: distinct id_kelas yang sukses upload nilai (filter ke kelas TA tsb)
    const [upRow] = (await query(
      `SELECT COUNT(DISTINCT ul.id_kelas) AS n
       FROM upload_log_nilai ul
       JOIN kelas_mk km ON km.id_kelas = ul.id_kelas
       ${whereSql}
       ${whereSql ? 'AND' : 'WHERE'} ul.status = 'success'`,
      kelasArgs,
    )) as Array<{n:number}>;
    const uploadMasuk = upRow.n;

    // 6. Data Belum Lengkap = MK Tayang - Upload Nilai Masuk (kelas yang belum ada upload sukses)
    const dataBelumLengkap = Math.max(0, mkTayang - uploadMasuk);

    return NextResponse.json({
      success: true,
      data: {
        mahasiswa: mhsRow.n,
        dosen: dosRow.n,
        cpl: cplCount,
        ik: ikCount,
        cpmk: cpmkCount,
        obe_total: obeTotal,
        mk_tayang: mkTayang,
        upload_masuk: uploadMasuk,
        upload_total: mkTayang,
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