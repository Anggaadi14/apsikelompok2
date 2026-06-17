import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

/* ============================================================
   /api/admin/dashboard-activity
     GET ?limit=10
     -> Feed aktivitas sistem akademik dari beberapa sumber:
        - upload_log_nilai (upload nilai oleh dosen)
        - user (akun baru dibuat / verified)
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

    // 1. Upload nilai (latest N)
    const uploads = (await query(
      `SELECT ul.id, ul.status, ul.nama_file, ul.jumlah_berhasil, ul.jumlah_gagal, ul.uploaded_at,
              km.kode_kelas, mk.kode_mk, mk.nama_mk,
              s.nama_lengkap AS uploader_nama
       FROM upload_log_nilai ul
       LEFT JOIN kelas_mk km     ON km.id_kelas = ul.id_kelas
       LEFT JOIN mata_kuliah mk  ON mk.id_mata_kuliah = km.id_mata_kuliah
       LEFT JOIN staff s         ON s.id_staff = ul.id_staff_uploader
       ORDER BY ul.uploaded_at DESC
       LIMIT ?`,
      [limit],
    )) as Array<{
      id: number; status: 'processing' | 'success' | 'partial' | 'failed';
      nama_file: string; jumlah_berhasil: number | null; jumlah_gagal: number | null;
      uploaded_at: string; kode_kelas: string | null; kode_mk: string | null;
      nama_mk: string | null; uploader_nama: string | null;
    }>;

    const uploadItems: ActivityItem[] = uploads.map((u) => {
      const level: Level = u.status === 'success' ? 'SUCCESS'
                       : u.status === 'failed'  ? 'ERROR'
                       : u.status === 'partial' ? 'WARNING' : 'INFO';
      const mkLabel = u.kode_mk ? `${u.kode_mk} (${u.kode_kelas ?? '-'})` : 'kelas tidak diketahui';
      const uploader = u.uploader_nama ?? 'Dosen';
      const msg =
        u.status === 'success' ? `${uploader} upload nilai MK ${mkLabel}${u.jumlah_berhasil ? ` (${u.jumlah_berhasil} baris)` : ''}`
      : u.status === 'partial' ? `${uploader} upload nilai MK ${mkLabel} dengan ${u.jumlah_gagal ?? 0} baris gagal`
      : u.status === 'failed'  ? `Upload nilai ${u.nama_file} ditolak (gagal validasi)`
      :                          `Upload nilai ${u.nama_file} sedang diproses`;
      return {
        id: `upload-${u.id}`,
        timestamp: u.uploaded_at,
        level,
        message: msg,
        source: 'upload_nilai',
      };
    });

    // 2. User baru dibuat
    const users = (await query(
      `SELECT u.id_user, u.email, u.role, u.nama_input, u.created_at,
              COALESCE(m.nama_mahasiswa, s.nama_lengkap, u.nama_input, u.email) AS nama_resolved
       FROM user u
       LEFT JOIN mahasiswa m ON u.id_mahasiswa = m.id_mahasiswa
       LEFT JOIN staff     s ON u.id_staff     = s.id_staff
       ORDER BY u.created_at DESC
       LIMIT ?`,
      [limit],
    )) as Array<{ id_user: number; email: string; role: string; nama_input: string | null; created_at: string; nama_resolved: string }>;

    const userItems: ActivityItem[] = users.map((u) => ({
      id: `user-${u.id_user}`,
      timestamp: u.created_at,
      level: 'INFO',
      message: `Akun baru dibuat: ${u.nama_resolved} (${u.role})`,
      source: 'user',
    }));

    // Gabung + sort desc by timestamp + ambil top N
    const merged = [...uploadItems, ...userItems]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, limit);

    return NextResponse.json({ success: true, data: merged });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/dashboard-activity]', err);
    return serverError('Gagal memuat aktivitas.');
  }
}