import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/dashboard-activity
     GET ?limit=10
     -> Feed aktivitas sistem akademik dari beberapa sumber:
        - upload_log_nilai (upload nilai oleh dosen)
        - app_user (akun baru dibuat / verified)
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Level = 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING';

interface ActivityItem {
  id: string;
  timestamp: string;
  level: Level;
  message: string;
  source: 'upload_nilai' | 'user';
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));

    const admin = createSupabaseAdminClient();

    const { data: uploads, error: upErr } = await admin
      .from('upload_log_nilai')
      .select(
        `id, status, nama_file, jumlah_berhasil, jumlah_gagal, uploaded_at,
         kelas:id_kelas ( kode_kelas, mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk ) ),
         staff:id_staff_uploader ( nama_lengkap )`,
      )
      .order('uploaded_at', { ascending: false })
      .limit(limit);
    if (upErr) throw upErr;

    const uploadItems: ActivityItem[] = (uploads ?? []).map((u: any) => {
      const level: Level = u.status === 'success' ? 'SUCCESS' : u.status === 'failed' ? 'ERROR' : u.status === 'partial' ? 'WARNING' : 'INFO';
      const kodeMk = u.kelas?.mata_kuliah?.kode_mk;
      const mkLabel = kodeMk ? `${kodeMk} (${u.kelas?.kode_kelas ?? '-'})` : 'kelas tidak diketahui';
      const uploader = u.staff?.nama_lengkap ?? 'Dosen';
      const msg =
        u.status === 'success' ? `${uploader} upload nilai MK ${mkLabel}${u.jumlah_berhasil ? ` (${u.jumlah_berhasil} baris)` : ''}`
        : u.status === 'partial' ? `${uploader} upload nilai MK ${mkLabel} dengan ${u.jumlah_gagal ?? 0} baris gagal`
        : u.status === 'failed' ? `Upload nilai ${u.nama_file} ditolak (gagal validasi)`
        : `Upload nilai ${u.nama_file} sedang diproses`;
      return { id: `upload-${u.id}`, timestamp: u.uploaded_at, level, message: msg, source: 'upload_nilai' };
    });

    const { data: users, error: userErr } = await admin
      .from('app_user')
      .select(
        `id_user, email, role, nama_input, created_at,
         mahasiswa:id_mahasiswa ( nama_mahasiswa ),
         staff:id_staff ( nama_lengkap )`,
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (userErr) throw userErr;

    const userItems: ActivityItem[] = (users ?? []).map((u: any) => {
      const namaResolved = u.mahasiswa?.nama_mahasiswa || u.staff?.nama_lengkap || u.nama_input || u.email;
      return { id: `user-${u.id_user}`, timestamp: u.created_at, level: 'INFO', message: `Akun baru dibuat: ${namaResolved} (${u.role})`, source: 'user' };
    });

    const merged = [...uploadItems, ...userItems].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit);

    return NextResponse.json({ success: true, data: merged });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/dashboard-activity]', err);
    return serverError('Gagal memuat aktivitas.');
  }
}
