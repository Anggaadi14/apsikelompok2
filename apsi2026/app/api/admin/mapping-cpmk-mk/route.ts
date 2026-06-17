import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';
import type { PoolConnection } from 'mysql2/promise';

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

    const kurList = (await query(
      `SELECT id_kurikulum, kode, nama, is_active FROM kurikulum ORDER BY tahun_mulai DESC`,
    )) as Array<{ id_kurikulum:number; kode:string; nama:string; is_active:number }>;

    const targetKur = kurList.find((k) => k.kode === kur) || kurList.find((k) => k.is_active === 1) || kurList[0];
    if (!targetKur) {
      return NextResponse.json({ success: true, data: { ikList: [], kurList, kurikulumActive: null } });
    }

    if (idIkParam) {
      const id_ik = Number(idIkParam);
      if (!Number.isInteger(id_ik) || id_ik <= 0) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
      }
      const ikRow = (await query(
        `SELECT ik.id_ik, ik.kode_ik, ik.deskripsi, ik.id_cpl, c.kode_cpl, c.singkatan AS singkatan_cpl, c.id_kurikulum, k.kode AS kode_kurikulum
         FROM indikator_kinerja ik JOIN cpl c ON c.id_cpl = ik.id_cpl JOIN kurikulum k ON k.id_kurikulum = c.id_kurikulum
         WHERE ik.id_ik = ? LIMIT 1`,
        [id_ik],
      )) as Array<{ id_ik:number; kode_ik:string; deskripsi:string; id_cpl:number; kode_cpl:string; singkatan_cpl:string; id_kurikulum:number; kode_kurikulum:string }>;
      if (!ikRow[0]) return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'IK tidak ditemukan.' }, { status: 404 });

      const cpmkList = (await query(
        `SELECT cpmk.id_cpmk, cpmk.kode_cpmk, cpmk.deskripsi_id, cpmk.id_mata_kuliah, mk.kode_mk, mk.nama_mk, mk.singkatan AS singkatan_mk,
                COALESCE(mci.bobot_persen, 0) AS bobot_persen
         FROM cpmk
         JOIN mata_kuliah mk ON mk.id_mata_kuliah = cpmk.id_mata_kuliah
         JOIN kurikulum_mk km ON km.id_mata_kuliah = mk.id_mata_kuliah AND km.id_kurikulum = ?
         LEFT JOIN mapping_cpmk_ik mci ON mci.id_cpmk = cpmk.id_cpmk AND mci.id_ik = ?
         ORDER BY mk.kode_mk, cpmk.urutan, cpmk.kode_cpmk`,
        [ikRow[0].id_kurikulum, id_ik],
      )) as Array<{ id_cpmk:number; kode_cpmk:string; deskripsi_id:string; id_mata_kuliah:number; kode_mk:string; nama_mk:string; singkatan_mk:string|null; bobot_persen:string|number }>;

      return NextResponse.json({ success: true, data: {
        ik: ikRow[0],
        cpmkList: cpmkList.map((c) => ({ ...c, bobot_persen: Number(c.bobot_persen) })),
      }});
    }

    const ikList = (await query(
      `SELECT ik.id_ik, ik.kode_ik, ik.deskripsi, c.kode_cpl, c.singkatan AS singkatan_cpl,
              c.id_kurikulum, k.kode AS kode_kurikulum,
              COALESCE((SELECT SUM(bobot_persen) FROM mapping_cpmk_ik WHERE id_ik = ik.id_ik), 0) AS sum_bobot,
              (SELECT COUNT(*) FROM mapping_cpmk_ik WHERE id_ik = ik.id_ik AND bobot_persen > 0) AS jumlah_cpmk
       FROM indikator_kinerja ik
       JOIN cpl c ON c.id_cpl = ik.id_cpl
       JOIN kurikulum k ON k.id_kurikulum = c.id_kurikulum
       WHERE c.id_kurikulum = ?
       ORDER BY c.urutan, c.kode_cpl, ik.urutan, ik.kode_ik`,
      [targetKur.id_kurikulum],
    )) as Array<{ id_ik:number; kode_ik:string; deskripsi:string; kode_cpl:string; singkatan_cpl:string; id_kurikulum:number; kode_kurikulum:string; sum_bobot:string|number; jumlah_cpmk:number }>;

    return NextResponse.json({ success: true, data: {
      ikList: ikList.map((r) => ({ ...r, sum_bobot: Number(r.sum_bobot), jumlah_cpmk: Number(r.jumlah_cpmk) })),
      kurList,
      kurikulumActive: targetKur,
    }});
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/mapping-cpmk-ik]', err);
    return serverError('Gagal memuat mapping.');
  }
}
export async function PUT(req: NextRequest) {
  let conn: PoolConnection | null = null;
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const id_ik = Number(body?.id_ik);
    const items: Array<{ id_cpmk:number; bobot_persen:number }> = Array.isArray(body?.items) ? body.items : [];
    if (!Number.isInteger(id_ik) || id_ik <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_ik tidak valid.' }, { status: 400 });
    }

    const cleaned: Array<{ id_cpmk:number; bobot_persen:number }> = [];
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
      return NextResponse.json({
        success: false, error: 'BOBOT_NOT_100',
        message: `Total bobot CPMK untuk IK ini = ${sum.toFixed(3)}% (harus 100%).`,
      }, { status: 400 });
    }

    conn = await getConnection();
    await conn.beginTransaction();
    await conn.query(`DELETE FROM mapping_cpmk_ik WHERE id_ik = ?`, [id_ik]);
    for (const it of cleaned) {
      await conn.query(
        `INSERT INTO mapping_cpmk_ik (id_cpmk, id_ik, bobot_persen) VALUES (?,?,?)`,
        [it.id_cpmk, id_ik, it.bobot_persen],
      );
    }
    await conn.commit();
    return NextResponse.json({ success: true, message: cleaned.length === 0 ? 'Semua mapping CPMK->IK untuk indikator ini telah dihapus.' : `Tersimpan: ${cleaned.length} CPMK (total ${sum.toFixed(3)}%).` });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    const a = handleAuthError(err); if (a) return a;
    console.error('[PUT /api/admin/mapping-cpmk-ik]', err);
    return serverError('Gagal menyimpan mapping.');
  } finally { if (conn) conn.release(); }
}