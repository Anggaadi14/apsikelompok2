import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '@/app/lib/db';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ success: false, message: 'No credential provided' }, { status: 400 });
    }

    let payload;
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else {
      // Fallback for development if GOOGLE_CLIENT_ID is not set
      console.warn("⚠️ GOOGLE_CLIENT_ID is not configured. Bypassing signature verification.");
      payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
    }

    if (!payload || !payload.email) {
      return NextResponse.json({ success: false, message: 'Invalid token payload' }, { status: 401 });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];

    // Determine role from email
    let role: string | null = null;
    let tableTarget: 'mahasiswa' | 'staff' | null = null;

    if (email === 'kaprodi@kaprodi.uns.ac.id') {
      role = 'kaprodi'; tableTarget = 'staff';
    } else if (email === 'admin@admin.uns.ac.id') {
      role = 'admin'; tableTarget = 'staff';
    } else if (email === 'jamu@jamu.uns.ac.id') {
      role = 'jamu'; tableTarget = 'staff';
    } else if (email.endsWith('@student.uns.ac.id')) {
      role = 'mahasiswa'; tableTarget = 'mahasiswa';
    } else if (email.endsWith('@staff.uns.ac.id')) {
      role = 'dosen'; tableTarget = 'staff';
    } else {
      return NextResponse.json({ success: false, message: 'Email tidak diizinkan. Gunakan email UNS.' }, { status: 403 });
    }

    const db = getDb();
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // Check if user exists
      const [userRows] = await conn.query<any[]>(
        `SELECT
           u.id_user, u.email, u.role, u.status, u.id_mahasiswa, u.id_staff,
           m.nim, m.nama_mahasiswa,
           s.nip_nidn_nik, s.nama_lengkap
         FROM user u
         LEFT JOIN mahasiswa m ON u.id_mahasiswa = m.id_mahasiswa
         LEFT JOIN staff s ON u.id_staff = s.id_staff
         WHERE u.email = ? LIMIT 1`,
        [email]
      );

      let user = userRows[0];
      const identifierStr = email.split('@')[0];

      if (!user) {
        // Create user
        let id_mahasiswa = null;
        let id_staff = null;

        if (tableTarget === 'mahasiswa') {
          const [mhs] = await conn.query<any[]>(`SELECT id_mahasiswa FROM mahasiswa WHERE nim = ? OR email_sso = ? LIMIT 1`, [identifierStr, email]);
          if (mhs.length > 0) {
            id_mahasiswa = mhs[0].id_mahasiswa;
          } else {
            const [mhsRes] = await conn.query<any>(
              `INSERT INTO mahasiswa (nim, nama_mahasiswa, email_sso, status_mahasiswa) VALUES (?, ?, ?, 'Aktif')`,
              [identifierStr, name, email]
            );
            id_mahasiswa = mhsRes.insertId;
          }
        } else if (tableTarget === 'staff') {
          const [stf] = await conn.query<any[]>(`SELECT id_staff FROM staff WHERE nip_nidn_nik = ? OR email_sso = ? LIMIT 1`, [identifierStr, email]);
          if (stf.length > 0) {
            id_staff = stf[0].id_staff;
          } else {
            const [stfRes] = await conn.query<any>(
              `INSERT INTO staff (nip_nidn_nik, nama_lengkap, email_sso, peran, status_akun) VALUES (?, ?, ?, ?, 'aktif')`,
              [identifierStr, name, email, role]
            );
            id_staff = stfRes.insertId;
          }
        }

        const [usrRes] = await conn.query<any>(
          `INSERT INTO user (email, role, status, verified_at, id_mahasiswa, id_staff, nama_input) VALUES (?, ?, 'aktif', NOW(), ?, ?, ?)`,
          [email, role, id_mahasiswa, id_staff, name]
        );

        user = {
          id_user: usrRes.insertId,
          email,
          role,
          status: 'aktif',
          id_mahasiswa,
          id_staff,
          nim: tableTarget === 'mahasiswa' ? identifierStr : null,
          nama_mahasiswa: tableTarget === 'mahasiswa' ? name : null,
          nip_nidn_nik: tableTarget === 'staff' ? identifierStr : null,
          nama_lengkap: tableTarget === 'staff' ? name : null,
        };
      }

      await conn.commit();

      if (user.status !== 'aktif') {
        return NextResponse.json({ success: false, message: 'Akun nonaktif. Hubungi admin.' }, { status: 403 });
      }

      const isMahasiswa = user.role === 'mahasiswa' && !!user.id_mahasiswa;
      const legacyId = isMahasiswa ? `mhs_${user.id_mahasiswa}` : user.id_staff ? `staff_${user.id_staff}` : '';
      const displayName = isMahasiswa ? user.nama_mahasiswa : user.nama_lengkap || name;
      const identifierOut = isMahasiswa ? user.nim || '' : user.nip_nidn_nik || '';

      const initials = String(displayName || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

      const session = {
        id_user: user.id_user,
        email: user.email,
        role: user.role,
        id_mahasiswa: user.id_mahasiswa,
        id_staff: user.id_staff,
        id: legacyId,
        username: String(user.email).split('@')[0],
        name: displayName,
        identifier: identifierOut,
        initials,
        prodi: 'Prodi Teknik Industri UNS',
        force_password_change: 0 as 0 | 1,
      };

      return NextResponse.json({ success: true, data: session });

    } catch (dbErr) {
      await conn.rollback();
      throw dbErr;
    } finally {
      conn.release();
    }

  } catch (err: any) {
    console.error('[POST /api/auth/google]', err);
    return NextResponse.json({ success: false, message: err?.message || 'Internal server error' }, { status: 500 });
  }
}
