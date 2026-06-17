import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError } from '@/app/lib/auth';
import { getDb, getConnection } from '@/app/lib/db';
import type { PoolConnection } from 'mysql2/promise';

/* ============================================================
   /api/admin/tahun-akademik
   GET   -> list semua TA (urut terbaru -> lama)
   POST  -> tambah TA baru   { tahun_mulai, semester, label?, set_active? }
   PATCH -> ubah TA          { id_tahun_akademik, label?, set_active? }
   Catatan: kalau set_active = true, otomatis non-aktifkan TA lain (1 berjalan).
   ============================================================ */

const SEMESTERS = ['Ganjil', 'Genap', 'Pendek'] as const;
type SemesterVal = typeof SEMESTERS[number];

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const db = getDb();
    const [rows] = await db.query(
      `SELECT id_tahun_akademik, kode, tahun_mulai, tahun_selesai, semester, label, is_active, created_at
       FROM tahun_akademik
       ORDER BY tahun_mulai DESC, FIELD(semester,'Ganjil','Genap','Pendek')`,
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[API] GET /api/admin/tahun-akademik', err);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal memuat Tahun Akademik.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let conn: PoolConnection | null = null;
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const tahunMulai = Number(body.tahun_mulai);
    const semester = String(body.semester ?? '') as SemesterVal;
    const label = body.label ? String(body.label).trim() : null;
    const setActive = !!body.set_active;
    if (!Number.isInteger(tahunMulai) || tahunMulai < 2000 || tahunMulai > 2100) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'tahun_mulai harus tahun yang valid (2000-2100).' },
        { status: 400 },
      );
    }
    if (!SEMESTERS.includes(semester)) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'semester harus Ganjil/Genap/Pendek.' },
        { status: 400 },
      );
    }
    const tahunSelesai = tahunMulai + 1;
    const kode = `${tahunMulai}/${tahunSelesai}-${semester}`;
    conn = await getConnection();
    await conn.beginTransaction();
    if (setActive) await conn.query(`UPDATE tahun_akademik SET is_active = 0 WHERE is_active = 1`);
    await conn.query(
      `INSERT INTO tahun_akademik (kode, tahun_mulai, tahun_selesai, semester, label, is_active)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE label = COALESCE(VALUES(label), label),
         is_active = GREATEST(VALUES(is_active), is_active)`,
      [kode, tahunMulai, tahunSelesai, semester, label, setActive ? 1 : 0],
    );
    await conn.commit();
    return NextResponse.json({ success: true, message: 'Tahun Akademik tersimpan.', data: { kode } });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    const a = handleAuthError(err); if (a) return a;
    console.error('[API] POST /api/admin/tahun-akademik', err);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal menyimpan Tahun Akademik.' },
      { status: 500 },
    );
  } finally { if (conn) conn.release(); }
}

export async function PATCH(req: NextRequest) {
  let conn: PoolConnection | null = null;
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id_tahun_akademik);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'id_tahun_akademik tidak valid.' },
        { status: 400 },
      );
    }
    const hasLabel = Object.prototype.hasOwnProperty.call(body, 'label');
    const label: string | null = hasLabel ? (body.label === null ? null : String(body.label).trim()) : null;
    const setActive: boolean | undefined = body.set_active === undefined ? undefined : !!body.set_active;

    conn = await getConnection();
    await conn.beginTransaction();
    if (setActive === true) {
      await conn.query(`UPDATE tahun_akademik SET is_active = 0 WHERE is_active = 1 AND id_tahun_akademik <> ?`, [id]);
      await conn.query(`UPDATE tahun_akademik SET is_active = 1 WHERE id_tahun_akademik = ?`, [id]);
    } else if (setActive === false) {
      await conn.query(`UPDATE tahun_akademik SET is_active = 0 WHERE id_tahun_akademik = ?`, [id]);
    }
    if (hasLabel) {
      await conn.query(`UPDATE tahun_akademik SET label = ? WHERE id_tahun_akademik = ?`, [label, id]);
    }
    await conn.commit();
    return NextResponse.json({ success: true, message: 'Tahun Akademik diperbarui.' });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    const a = handleAuthError(err); if (a) return a;
    console.error('[API] PATCH /api/admin/tahun-akademik', err);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal memperbarui Tahun Akademik.' },
      { status: 500 },
    );
  } finally { if (conn) conn.release(); }
}