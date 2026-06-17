import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

/* ============================================================
   /api/admin/kurikulum
     GET -> list semua kurikulum (urut: aktif dulu, lalu terbaru).
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'kaprodi', 'jamu']);
    const rows = await query(
      `SELECT id_kurikulum, kode, nama, tahun_mulai, tahun_selesai, is_active
       FROM kurikulum
       ORDER BY is_active DESC, tahun_mulai DESC`,
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/kurikulum]', err);
    return serverError('Gagal memuat daftar kurikulum.');
  }
}