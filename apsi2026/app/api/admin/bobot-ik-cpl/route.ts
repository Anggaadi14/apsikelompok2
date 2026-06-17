import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';
import type { PoolConnection } from 'mysql2/promise';

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
  bobot_persen: number; // dari mapping_ik_cpl
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

async function resolveIdKurikulum(kur: string): Promise<number | null> {
  if (kur) {
    const rows = (await query(
      `SELECT id_kurikulum FROM kurikulum WHERE kode = ? OR id_kurikulum = ? LIMIT 1`,
      [kur, Number(kur) || 0],
    )) as Array<{ id_kurikulum: number }>;
    if (rows.length) return rows[0].id_kurikulum;
  }
  const def = (await query(
    `SELECT id_kurikulum FROM kurikulum WHERE is_active = 1 ORDER BY tahun_mulai DESC LIMIT 1`,
  )) as Array<{ id_kurikulum: number }>;
  return def.length ? def[0].id_kurikulum : null;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';
    const id_kurikulum = await resolveIdKurikulum(kur);
    if (!id_kurikulum) {
      return NextResponse.json({ success: true, data: { id_kurikulum: null, kode_kurikulum: null, groups: [] } });
    }

    // Ambil kode kurikulum (untuk header view)
    const [kRow] = (await query(`SELECT kode FROM kurikulum WHERE id_kurikulum = ?`, [id_kurikulum])) as Array<{kode:string}>;

    // Semua CPL pada kurikulum
    const cpls = (await query(
      `SELECT id_cpl, kode_cpl, singkatan, domain, deskripsi_id, urutan
       FROM cpl
       WHERE id_kurikulum = ?
       ORDER BY urutan, kode_cpl`,
      [id_kurikulum],
    )) as Array<{ id_cpl: number; kode_cpl: string; singkatan: string; domain: string; deskripsi_id: string; urutan: number }>;

    // Semua IK milik CPL pada kurikulum + bobot dari mapping_ik_cpl (LEFT JOIN, default 0)
    const iks = (await query(
      `SELECT ik.id_ik, ik.id_cpl AS parent_cpl, ik.kode_ik, ik.deskripsi, ik.urutan,
              COALESCE(mic.bobot_persen, 0) AS bobot_persen,
              mic.id_cpl AS map_cpl
       FROM indikator_kinerja ik
       JOIN cpl c             ON c.id_cpl = ik.id_cpl
       LEFT JOIN mapping_ik_cpl mic ON mic.id_ik = ik.id_ik AND mic.id_cpl = ik.id_cpl
       WHERE c.id_kurikulum = ?
       ORDER BY ik.urutan, ik.kode_ik`,
      [id_kurikulum],
    )) as Array<{ id_ik: number; parent_cpl: number; kode_ik: string; deskripsi: string; urutan: number; bobot_persen: string | number; map_cpl: number | null }>;

    const groups: CplGroup[] = cpls.map((c) => {
      const ikList: IkRow[] = iks
        .filter((r) => r.parent_cpl === c.id_cpl)
        .map((r) => ({
          id_ik: r.id_ik,
          id_cpl: c.id_cpl,
          kode_ik: r.kode_ik,
          deskripsi: r.deskripsi,
          urutan: r.urutan,
          bobot_persen: Number(r.bobot_persen) || 0,
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

    return NextResponse.json({
      success: true,
      data: { id_kurikulum, kode_kurikulum: kRow?.kode ?? null, groups },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/bobot-ik-cpl]', err);
    return serverError('Gagal memuat bobot IK→CPL.');
  }
}

export async function PUT(req: NextRequest) {
  let conn: PoolConnection | null = null;
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const rowsRaw = Array.isArray(body?.rows) ? body.rows : [];
    if (rowsRaw.length === 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'rows kosong.' }, { status: 400 });
    }

    // Normalisasi + grouping per id_cpl untuk validasi sum=100
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

    // Group sum per id_cpl & validasi == 100 (toleransi 0.01 untuk pembulatan)
    const sumPerCpl = new Map<number, number>();
    for (const r of rows) {
      sumPerCpl.set(r.id_cpl, (sumPerCpl.get(r.id_cpl) ?? 0) + r.bobot_persen);
    }
    const invalid: Array<{ id_cpl: number; sum: number }> = [];
    for (const [id_cpl, s] of sumPerCpl) {
      if (Math.abs(s - 100) > 0.01) invalid.push({ id_cpl, sum: Math.round(s * 1000) / 1000 });
    }
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'SUM_NOT_100',
          message: `Total bobot per CPL harus 100. ${invalid.map((x) => `CPL #${x.id_cpl} = ${x.sum}`).join(', ')}.`,
          invalid,
        },
        { status: 400 },
      );
    }

    // Validasi: pastikan setiap (id_ik, id_cpl) memang IK turunan CPL itu (id_cpl di IK == id_cpl di row)
    const ikIds = Array.from(new Set(rows.map((r) => r.id_ik)));
    const ikRows = (await query(
      `SELECT id_ik, id_cpl FROM indikator_kinerja WHERE id_ik IN (${ikIds.map(() => '?').join(',')})`,
      ikIds,
    )) as Array<{ id_ik: number; id_cpl: number }>;
    const ikParent = new Map<number, number>();
    for (const x of ikRows) ikParent.set(x.id_ik, x.id_cpl);
    for (const r of rows) {
      const parent = ikParent.get(r.id_ik);
      if (parent !== r.id_cpl) {
        return NextResponse.json(
          { success: false, error: 'IK_CPL_MISMATCH', message: `IK ${r.id_ik} bukan turunan CPL ${r.id_cpl}.` },
          { status: 400 },
        );
      }
    }

    conn = await getConnection();
    await conn.beginTransaction();
    for (const r of rows) {
      await conn.query(
        `INSERT INTO mapping_ik_cpl (id_ik, id_cpl, bobot_persen)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE bobot_persen = VALUES(bobot_persen)`,
        [r.id_ik, r.id_cpl, r.bobot_persen],
      );
    }
    await conn.commit();
    return NextResponse.json({ success: true, message: `Bobot tersimpan (${rows.length} IK).` });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    const a = handleAuthError(err); if (a) return a;
    console.error('[PUT /api/admin/bobot-ik-cpl]', err);
    return serverError('Gagal menyimpan bobot IK→CPL.');
  } finally { if (conn) conn.release(); }
}