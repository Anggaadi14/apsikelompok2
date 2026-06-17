import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, handleAuthError, serverError } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 * Mengembalikan profil lengkap user yang sedang login.
 * Data join: user + mahasiswa | staff.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const db = getDb();

    const [rows] = await db.query<any[]>(
      `SELECT
         u.id_user, u.email, u.role, u.status, u.force_password_change,
         u.verified_at, u.created_at, u.updated_at,
         u.nama_input, u.id_mahasiswa, u.id_staff,
         m.nim, m.nama_mahasiswa, m.email_sso AS mhs_email_sso, m.angkatan, m.status_mahasiswa,
         s.nip_nidn_nik, s.nama_lengkap, s.email_sso AS staff_email_sso, s.peran AS staff_peran, s.status_akun
       FROM user u
       LEFT JOIN mahasiswa m ON u.id_mahasiswa = m.id_mahasiswa
       LEFT JOIN staff s     ON u.id_staff     = s.id_staff
       WHERE u.id_user = ?
       LIMIT 1`,
      [session.id_user],
    );
    const user = (rows as any[])[0];
    if (!user) {
      return NextResponse.json({ success: false, error: 'USER_NOT_FOUND', message: 'User tidak ditemukan.' }, { status: 404 });
    }

    const isMahasiswa = user.role === 'mahasiswa' && !!user.id_mahasiswa;
    const displayName = isMahasiswa ? user.nama_mahasiswa : (user.nama_lengkap || user.nama_input || user.email);
    const identifier = isMahasiswa ? (user.nim || '') : (user.nip_nidn_nik || '');
    const ssoEmail = isMahasiswa ? user.mhs_email_sso : user.staff_email_sso;

    return NextResponse.json({
      success: true,
      data: {
        id_user: user.id_user,
        email: user.email,
        email_sso: ssoEmail || null,
        role: user.role,
        status: user.status,
        force_password_change: Number(user.force_password_change) === 1 ? 1 : 0,
        name: displayName,
        identifier,
        verified_at: user.verified_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        mahasiswa: isMahasiswa ? {
          id_mahasiswa: user.id_mahasiswa, nim: user.nim, angkatan: user.angkatan, status_mahasiswa: user.status_mahasiswa,
        } : null,
        staff: !isMahasiswa && user.id_staff ? {
          id_staff: user.id_staff, nip_nidn_nik: user.nip_nidn_nik, peran: user.staff_peran, status_akun: user.status_akun,
        } : null,
      },
    });
  } catch (err: any) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/auth/me]', err);
    return serverError(err?.message || 'Gagal memuat profil.');
  }
}