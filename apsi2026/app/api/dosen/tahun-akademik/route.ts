import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/dosen/tahun-akademik
   GET -> daftar semua TA (id, kode, semester, label, is_active)
          dipakai sbg sumber dropdown saat dosen upload nilai.
   ============================================================ */

const SEMESTER_ORDER: Record<string, number> = { Ganjil: 0, Genap: 1, Pendek: 2 };

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['dosen']);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('tahun_akademik')
      .select('id_tahun_akademik, kode, tahun_mulai, tahun_selesai, semester, label, is_active');
    if (error) throw error;

    const rows = (data ?? []).sort((a, b) => b.tahun_mulai - a.tahun_mulai || SEMESTER_ORDER[a.semester] - SEMESTER_ORDER[b.semester]);
    const active = rows.find((r) => r.is_active) ?? null;
    return NextResponse.json({ success: true, data: { items: rows, active } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/dosen/tahun-akademik]', err);
    return serverError('Gagal memuat Tahun Akademik.');
  }
}
