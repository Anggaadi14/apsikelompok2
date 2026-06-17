import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const idMk = url.searchParams.get('id_mk');
    const kur = url.searchParams.get('kur') || '';

    const where: string[] = [];
    const params: unknown[] = [];
    if (idMk) { where.push('cpmk.id_mata_kuliah = ?'); params.push(Number(idMk)); }
    if (kur) {
      where.push('cpmk.id_mata_kuliah IN (SELECT km.id_mata_kuliah FROM kurikulum_mk km JOIN kurikulum k ON k.id_kurikulum = km.id_kurikulum WHERE k.kode = ? OR k.id_kurikulum = ?)');
      params.push(kur, Number(kur) || 0);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = (await query(
      `SELECT cpmk.id_cpmk, cpmk.id_mata_kuliah, cpmk.kode_cpmk, cpmk.deskripsi_id, cpmk.deskripsi_en, cpmk.urutan,
              mk.kode_mk, mk.nama_mk, mk.singkatan AS singkatan_mk
       FROM cpmk
       JOIN mata_kuliah mk ON mk.id_mata_kuliah = cpmk.id_mata_kuliah
       ${whereSql}
       ORDER BY mk.kode_mk, cpmk.urutan, cpmk.kode_cpmk`,
      params,
    )) as Array<{ id_cpmk:number; id_mata_kuliah:number; kode_cpmk:string; deskripsi_id:string; deskripsi_en:string|null; urutan:number; kode_mk:string; nama_mk:string; singkatan_mk:string|null }>;

    const mkList = (await query(
      `SELECT mk.id_mata_kuliah, mk.kode_mk, mk.nama_mk, mk.singkatan, mk.sks
       FROM mata_kuliah mk
       ORDER BY mk.kode_mk`,
    )) as Array<{ id_mata_kuliah:number; kode_mk:string; nama_mk:string; singkatan:string|null; sks:number }>;

    return NextResponse.json({ success: true, data: { cpmkList: rows, mkList } });
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
    if (!deskripsi_id) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi (ID) wajib.' }, { status: 400 });
    }

    const dup = (await query(`SELECT id_cpmk FROM cpmk WHERE id_mata_kuliah=? AND kode_cpmk=? LIMIT 1`, [id_mata_kuliah, kode_cpmk])) as Array<{id_cpmk:number}>;
    if (dup.length) {
      return NextResponse.json({ success: false, error: 'DUPLICATE', message: `Kode CPMK '${kode_cpmk}' sudah ada di MK ini.` }, { status: 409 });
    }

    const result = (await query(
      `INSERT INTO cpmk (id_mata_kuliah, kode_cpmk, deskripsi_id, deskripsi_en, urutan) VALUES (?,?,?,?,?)`,
      [id_mata_kuliah, kode_cpmk, deskripsi_id, deskripsi_en, urutan],
    )) as unknown as { insertId: number };

    return NextResponse.json({ success: true, message: `CPMK ${kode_cpmk} berhasil ditambahkan.`, data: { id_cpmk: result.insertId } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/cpmk]', err);
    return serverError('Gagal menambah CPMK.');
  }
}