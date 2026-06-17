import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';

    const where: string[] = [];
    const params: unknown[] = [];
    if (kur) {
      where.push('mk.id_mata_kuliah IN (SELECT km.id_mata_kuliah FROM kurikulum_mk km JOIN kurikulum k ON k.id_kurikulum = km.id_kurikulum WHERE k.kode = ? OR k.id_kurikulum = ?)');
      params.push(kur, Number(kur) || 0);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = (await query(
      `SELECT mk.id_mata_kuliah, mk.kode_mk, mk.nama_mk, mk.sks, mk.singkatan,
              (SELECT COUNT(*) FROM kurikulum_mk WHERE id_mata_kuliah = mk.id_mata_kuliah) AS jumlah_kurikulum,
              (SELECT COUNT(*) FROM cpmk WHERE id_mata_kuliah = mk.id_mata_kuliah) AS jumlah_cpmk
       FROM mata_kuliah mk
       ${whereSql}
       ORDER BY mk.kode_mk`,
      params,
    )) as Array<{ id_mata_kuliah:number; kode_mk:string; nama_mk:string; sks:number; singkatan:string|null; jumlah_kurikulum:number; jumlah_cpmk:number }>;

    const links = (await query(
      `SELECT km.id_mata_kuliah, km.id_kurikulum, km.is_wajib, km.semester_default,
              k.kode AS kode_kurikulum
       FROM kurikulum_mk km JOIN kurikulum k ON k.id_kurikulum = km.id_kurikulum
       ORDER BY k.tahun_mulai DESC, k.kode`,
    )) as Array<{ id_mata_kuliah:number; id_kurikulum:number; is_wajib:number; semester_default:number|null; kode_kurikulum:string }>;

    const kurList = (await query(
      `SELECT id_kurikulum, kode, nama, is_active FROM kurikulum ORDER BY tahun_mulai DESC`,
    )) as Array<{ id_kurikulum:number; kode:string; nama:string; is_active:number }>;

    return NextResponse.json({ success: true, data: { mkList: rows, links, kurList } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/matkul]', err);
    return serverError('Gagal memuat mata kuliah.');
  }
}

export async function POST(req: NextRequest) {
  let conn: PoolConnection | null = null;
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const kode_mk = String(body?.kode_mk || '').trim();
    const nama_mk = String(body?.nama_mk || '').trim();
    const singkatan = body?.singkatan ? String(body.singkatan).trim() : null;
    const sks = Number(body?.sks);
    const links: Array<{ id_kurikulum:number; is_wajib?:number|boolean; semester_default?:number|null }> = Array.isArray(body?.links) ? body.links : [];

    if (!kode_mk || kode_mk.length > 30) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode MK wajib (maks 30).' }, { status: 400 });
    }
    if (!nama_mk) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Nama MK wajib.' }, { status: 400 });
    }
    if (!Number.isFinite(sks) || sks < 0 || sks > 99) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'SKS harus 0..99.' }, { status: 400 });
    }

    const dup = (await query(`SELECT id_mata_kuliah FROM mata_kuliah WHERE kode_mk=? LIMIT 1`, [kode_mk])) as Array<{id_mata_kuliah:number}>;
    if (dup.length) {
      return NextResponse.json({ success: false, error: 'DUPLICATE', message: `Kode MK '${kode_mk}' sudah ada.` }, { status: 409 });
    }

    conn = await getConnection();
    await conn.beginTransaction();
    const [insertRes] = await conn.query(
      `INSERT INTO mata_kuliah (kode_mk, nama_mk, sks, singkatan) VALUES (?,?,?,?)`,
      [kode_mk, nama_mk, sks, singkatan],
    );
    const id_mata_kuliah = (insertRes as unknown as { insertId: number }).insertId;

    for (const lk of links) {
      const idK = Number(lk?.id_kurikulum);
      if (!Number.isInteger(idK) || idK <= 0) continue;
      const wajib = lk?.is_wajib === false || lk?.is_wajib === 0 ? 0 : 1;
      const sem = lk?.semester_default != null && lk.semester_default !== ('' as unknown) ? Number(lk.semester_default) : null;
      await conn.query(
        `INSERT INTO kurikulum_mk (id_kurikulum, id_mata_kuliah, is_wajib, semester_default) VALUES (?,?,?,?)`,
        [idK, id_mata_kuliah, wajib, sem],
      );
    }
    await conn.commit();
    return NextResponse.json({ success: true, message: `MK ${kode_mk} berhasil ditambahkan.`, data: { id_mata_kuliah } });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/matkul]', err);
    return serverError('Gagal menambah mata kuliah.');
  } finally { if (conn) conn.release(); }
}