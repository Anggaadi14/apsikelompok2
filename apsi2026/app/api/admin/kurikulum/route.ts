import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/kurikulum
     GET -> list semua kurikulum (urut: aktif dulu, lalu terbaru).
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'kaprodi', 'jamu']);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('kurikulum')
      .select('id_kurikulum, kode, nama, tahun_mulai, tahun_selesai, is_active')
      .order('is_active', { ascending: false })
      .order('tahun_mulai', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/kurikulum]', err);
    return serverError('Gagal memuat daftar kurikulum.');
  }
}
