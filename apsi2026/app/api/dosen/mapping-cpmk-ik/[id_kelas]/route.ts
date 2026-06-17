import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';
import type { PoolConnection } from 'mysql2/promise';

/* ============================================================
   /api/dosen/mapping-cpmk-ik/[id_kelas]

   GET  -> data lengkap untuk panel mapping:
           - kelas/MK info + apakah evaluator
           - daftar CPMK MK ybs
           - daftar IK dikelompokkan per CPL (dari kurikulum kelas)
           - existing mappings (pasangan id_cpmk + id_ik)

   PUT  -> simpan ulang mapping per CPMK:
           body: { items: [{ id_cpmk, id_ik_list: number[] }] }
           untuk setiap id_cpmk di payload -> DELETE existing rows lalu INSERT.
           bobot_persen di-set 0 (engine v_nilai_ik tidak memakai bobot).
   ============================================================ */

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id_kelas: string }> },
) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' },
        { status: 401 },
      );
    }

    const { id_kelas } = await ctx.params;
    const idKelas = Number(id_kelas);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' },
        { status: 400 },
      );
    }

    // 1) Ownership
    const own = (await query(
      `SELECT peran_di_kelas FROM mapping_dosen_kelas
       WHERE id_kelas = ? AND id_staff = ? LIMIT 1`,
      [idKelas, user.id_staff],
    )) as Array<{ peran_di_kelas: 'koordinator' | 'anggota' }>;
    if (own.length === 0) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' },
        { status: 403 },
      );
    }

    // 2) Kelas + MK + kurikulum
    const kInfo = (await query(
      `SELECT k.id_kelas, k.kode_kelas, k.tahun_akademik, k.semester,
              mk.id_mata_kuliah, mk.kode_mk, mk.nama_mk, mk.singkatan, mk.is_evaluator,
              kur.id_kurikulum, kur.kode AS kode_kurikulum, kur.nama AS nama_kurikulum
       FROM kelas_mk k
       JOIN mata_kuliah mk ON mk.id_mata_kuliah = k.id_mata_kuliah
       JOIN kurikulum kur ON kur.id_kurikulum = k.id_kurikulum
       WHERE k.id_kelas = ? LIMIT 1`,
      [idKelas],
    )) as Array<Record<string, unknown>>;
    if (kInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' },
        { status: 404 },
      );
    }
    const kelas = kInfo[0];
    const idMk = Number(kelas.id_mata_kuliah);
    const idKurikulum = Number(kelas.id_kurikulum);

    // 3) CPMK MK ini
    const cpmk = (await query(
      `SELECT id_cpmk, kode_cpmk, deskripsi_id, deskripsi_en, urutan
       FROM cpmk WHERE id_mata_kuliah = ?
       ORDER BY urutan, kode_cpmk`,
      [idMk],
    )) as Array<Record<string, unknown>>;

    // 4) CPL+IK dari kurikulum kelas
    const cpl = (await query(
      `SELECT id_cpl, kode_cpl, singkatan, domain, deskripsi_id, deskripsi_en, urutan
       FROM cpl WHERE id_kurikulum = ?
       ORDER BY urutan, kode_cpl`,
      [idKurikulum],
    )) as Array<Record<string, unknown>>;
    const ik = (await query(
      `SELECT ik.id_ik, ik.id_cpl, ik.kode_ik, ik.deskripsi, ik.deskripsi_en, ik.urutan
       FROM indikator_kinerja ik
       JOIN cpl c ON c.id_cpl = ik.id_cpl
       WHERE c.id_kurikulum = ?
       ORDER BY ik.urutan, ik.kode_ik`,
      [idKurikulum],
    )) as Array<Record<string, unknown>>;

    // 5) Existing mappings untuk CPMK MK ini
    const idCpmkList = cpmk.map((c) => Number(c.id_cpmk));
    let mappings: Array<{ id_cpmk: number; id_ik: number }> = [];
    if (idCpmkList.length > 0) {
      mappings = (await query(
        `SELECT id_cpmk, id_ik FROM mapping_cpmk_ik WHERE id_cpmk IN (?)`,
        [idCpmkList],
      )) as Array<{ id_cpmk: number; id_ik: number }>;
    }

    return NextResponse.json({
      success: true,
      data: {
        kelas,
        is_evaluator: Number(kelas.is_evaluator) === 1,
        peran_dosen_login: own[0].peran_di_kelas,
        cpmk_list: cpmk,
        cpl_list: cpl,
        ik_list: ik,
        existing_mappings: mappings,
      },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/dosen/mapping-cpmk-ik/[id_kelas]]', err);
    return serverError('Gagal memuat data mapping CPMK-IK.');
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id_kelas: string }> },
) {
  let conn: PoolConnection | null = null;
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' },
        { status: 401 },
      );
    }

    const { id_kelas } = await ctx.params;
    const idKelas = Number(id_kelas);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' },
        { status: 400 },
      );
    }

    // Ownership
    const own = (await query(
      `SELECT 1 FROM mapping_dosen_kelas WHERE id_kelas = ? AND id_staff = ? LIMIT 1`,
      [idKelas, user.id_staff],
    )) as Array<unknown>;
    if (own.length === 0) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Body "items" wajib berupa array.' },
        { status: 400 },
      );
    }

    // Ambil id_mata_kuliah kelas (untuk pagari CPMK yang boleh disentuh dosen ini)
    const kInfo = (await query(
      `SELECT mk.id_mata_kuliah, kur.id_kurikulum
       FROM kelas_mk k
       JOIN mata_kuliah mk ON mk.id_mata_kuliah = k.id_mata_kuliah
       JOIN kurikulum kur ON kur.id_kurikulum = k.id_kurikulum
       WHERE k.id_kelas = ? LIMIT 1`,
      [idKelas],
    )) as Array<{ id_mata_kuliah: number; id_kurikulum: number }>;
    if (kInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' },
        { status: 404 },
      );
    }
    const idMk = kInfo[0].id_mata_kuliah;
    const idKur = kInfo[0].id_kurikulum;

    // Whitelist id_cpmk milik MK ini
    const cpmkRows = (await query(
      `SELECT id_cpmk FROM cpmk WHERE id_mata_kuliah = ?`,
      [idMk],
    )) as Array<{ id_cpmk: number }>;
    const allowedCpmk = new Set(cpmkRows.map((r) => Number(r.id_cpmk)));

    // Whitelist id_ik dari kurikulum kelas
    const ikRows = (await query(
      `SELECT ik.id_ik FROM indikator_kinerja ik
       JOIN cpl c ON c.id_cpl = ik.id_cpl
       WHERE c.id_kurikulum = ?`,
      [idKur],
    )) as Array<{ id_ik: number }>;
    const allowedIk = new Set(ikRows.map((r) => Number(r.id_ik)));

    conn = await getConnection();
    await conn.beginTransaction();

    let totalDeleted = 0;
    let totalInserted = 0;
    const skipped: Array<{ id_cpmk: number; alasan: string }> = [];

    for (const it of items) {
      const idCpmk = Number(it?.id_cpmk);
      const ikListRaw = Array.isArray(it?.id_ik_list) ? it.id_ik_list : [];
      if (!Number.isInteger(idCpmk) || !allowedCpmk.has(idCpmk)) {
        skipped.push({ id_cpmk: idCpmk, alasan: 'CPMK bukan milik MK kelas ini' });
        continue;
      }
      // Filter id_ik valid
      const ikValid: number[] = [];
      for (const v of ikListRaw) {
        const n = Number(v);
        if (Number.isInteger(n) && allowedIk.has(n) && !ikValid.includes(n)) ikValid.push(n);
      }
      // Replace-set semantics
      const [delRes] = await conn.query(
        `DELETE FROM mapping_cpmk_ik WHERE id_cpmk = ?`,
        [idCpmk],
      );
      totalDeleted += Number((delRes as { affectedRows?: number })?.affectedRows ?? 0);
      if (ikValid.length > 0) {
        const values = ikValid.map(() => '(?, ?, 0)').join(',');
        const params: Array<number> = [];
        ikValid.forEach((v) => { params.push(idCpmk, v); });
        const [insRes] = await conn.query(
          `INSERT INTO mapping_cpmk_ik (id_cpmk, id_ik, bobot_persen) VALUES ${values}
           ON DUPLICATE KEY UPDATE bobot_persen = 0`,
          params,
        );
        totalInserted += Number((insRes as { affectedRows?: number })?.affectedRows ?? 0);
      }
    }

    await conn.commit();
    return NextResponse.json({
      success: true,
      message: 'Mapping CPMK-IK tersimpan.',
      data: { jumlah_hapus_lama: totalDeleted, jumlah_simpan_baru: totalInserted, lewat: skipped },
    });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    const a = handleAuthError(err); if (a) return a;
    console.error('[PUT /api/dosen/mapping-cpmk-ik/[id_kelas]]', err);
    return serverError('Gagal menyimpan mapping CPMK-IK.');
  } finally { if (conn) conn.release(); }
}