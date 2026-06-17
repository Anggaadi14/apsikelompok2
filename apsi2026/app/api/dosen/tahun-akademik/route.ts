import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

/* ============================================================
   /api/dosen/tahun-akademik
   GET -> daftar semua TA (id, kode, semester, label, is_active)
          dipakai sbg sumber dropdown saat dosen upload nilai.
   ============================================================ */

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['dosen']);
    const rows = (await query(
      `SELECT id_tahun_akademik, kode, tahun_mulai, tahun_selesai, semester, label, is_active
       FROM tahun_akademik
       ORDER BY tahun_mulai DESC, FIELD(semester,'Ganjil','Genap','Pendek')`,
    )) as Array<Record<string, unknown>>;
    const active = rows.find((r) => Number(r.is_active) === 1) ?? null;
    return NextResponse.json({ success: true, data: { items: rows, active } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/dosen/tahun-akademik]', err);
    return serverError('Gagal memuat Tahun Akademik.');
  }
}