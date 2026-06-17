import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface IkRowOut {
  id_ik: number;
  id_cpl: number;
  kode_ik: string;
  deskripsi: string;
  urutan: number;
  kode_cpl: string;
  singkatan_cpl: string;
  id_kurikulum: number;
  kode_kurikulum: string;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const kur = url.searchParams.get('kur') || '';
    const idCpl = url.searchParams.get('id_cpl');

    const where: string[] = [];
    const params: unknown[] = [];
    if (kur) { where.push('(k.kode = ? OR k.id_kurikulum = ?)'); params.push(kur, Number(kur) || 0); }
    if (idCpl) { where.push('ik.id_cpl = ?'); params.push(Number(idCpl)); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = (await query(
      `SELECT ik.id_ik, ik.id_cpl, ik.kode_ik, ik.deskripsi, ik.urutan,
              c.kode_cpl, c.singkatan AS singkatan_cpl,
              c.id_kurikulum, k.kode AS kode_kurikulum
       FROM indikator_kinerja ik
       JOIN cpl c ON c.id_cpl = ik.id_cpl
       JOIN kurikulum k ON k.id_kurikulum = c.id_kurikulum
       ${whereSql}
       ORDER BY k.tahun_mulai DESC, c.urutan, c.kode_cpl, ik.urutan, ik.kode_ik`,
      params,
    )) as IkRowOut[];

    const cplRows = (await query(
      `SELECT c.id_cpl, c.id_kurikulum, c.kode_cpl, c.singkatan, c.domain, k.kode AS kode_kurikulum, k.is_active AS kurikulum_active
       FROM cpl c JOIN kurikulum k ON k.id_kurikulum = c.id_kurikulum
       ORDER BY k.tahun_mulai DESC, c.urutan, c.kode_cpl`,
    )) as Array<{ id_cpl: number; id_kurikulum: number; kode_cpl: string; singkatan: string; domain: string; kode_kurikulum: string; kurikulum_active: number }>;

    return NextResponse.json({ success: true, data: { ikList: rows, cplList: cplRows } });
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
    const urutan = Number.isFinite(Number(body?.urutan)) ? Number(body.urutan) : 0;

    if (!Number.isInteger(id_cpl) || id_cpl <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'CPL induk wajib dipilih.' }, { status: 400 });
    }
    if (!kode_ik || kode_ik.length > 20) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode IK wajib (maks 20 karakter).' }, { status: 400 });
    }
    if (!deskripsi) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi IK wajib diisi.' }, { status: 400 });
    }

    const dup = (await query(`SELECT id_ik FROM indikator_kinerja WHERE id_cpl=? AND kode_ik=? LIMIT 1`, [id_cpl, kode_ik])) as Array<{id_ik:number}>;
    if (dup.length) {
      return NextResponse.json({ success: false, error: 'DUPLICATE', message: `Kode IK '${kode_ik}' sudah ada di CPL ini.` }, { status: 409 });
    }

    const result = (await query(
      `INSERT INTO indikator_kinerja (id_cpl, kode_ik, deskripsi, urutan) VALUES (?,?,?,?)`,
      [id_cpl, kode_ik, deskripsi, urutan],
    )) as unknown as { insertId: number };

    return NextResponse.json({ success: true, message: `IK ${kode_ik} berhasil ditambahkan.`, data: { id_ik: result.insertId } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/ik]', err);
    return serverError('Gagal menambah IK.');
  }
}