import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { getConnection, query } from '@/app/lib/db';
import { generateRandomPassword } from '@/app/lib/passwordGen';

/* ============================================================
   /api/admin/users
     GET  -> list semua user (+ join staff/mahasiswa)
     POST -> create user baru. Auto-buat row staff/mahasiswa kalau
             linkage_mode='create_new'. Password random + flag
             force_password_change=1.
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'mahasiswa' | 'dosen' | 'kaprodi' | 'jamu' | 'admin';
type Status = 'pending_verification' | 'aktif' | 'nonaktif';

export interface UserRow {
  id_user: number;
  email: string;
  role: Role;
  status: Status;
  force_password_change: 0 | 1;
  id_mahasiswa: number | null;
  id_staff: number | null;
  nama_input: string | null;
  nama_resolved: string;
  identifier: string | null; // NIM atau NIP/NIDN/NIK
  created_at: string;
  updated_at: string;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const rows = (await query(
      `SELECT
         u.id_user, u.email, u.role, u.status, u.force_password_change,
         u.id_mahasiswa, u.id_staff, u.nama_input,
         u.created_at, u.updated_at,
         COALESCE(m.nama_mahasiswa, s.nama_lengkap, u.nama_input, u.email) AS nama_resolved,
         COALESCE(m.nim, s.nip_nidn_nik)                                   AS identifier
       FROM user u
       LEFT JOIN mahasiswa m ON u.id_mahasiswa = m.id_mahasiswa
       LEFT JOIN staff     s ON u.id_staff     = s.id_staff
       ORDER BY u.created_at DESC, u.id_user DESC`,
    )) as UserRow[];

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/users]', err);
    return serverError('Gagal memuat daftar user.');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));

    const role = String(body.role || '').trim() as Role;
    const email = String(body.email || '').trim().toLowerCase();
    const nama  = String(body.nama  || '').trim();
    const linkage_mode = (body.linkage_mode === 'existing' ? 'existing' : 'create_new') as
      'existing' | 'create_new';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
    if (!nama)
      return NextResponse.json({ success: false, message: 'Nama wajib diisi.' }, { status: 400 });
    if (!['mahasiswa', 'dosen', 'kaprodi', 'jamu', 'admin'].includes(role))
      return NextResponse.json({ success: false, message: 'Role tidak valid.' }, { status: 400 });

    // Cek email unik di user
    const dup = (await query(
      `SELECT id_user FROM user WHERE email = ? LIMIT 1`,
      [email],
    )) as Array<{ id_user: number }>;
    if (dup.length)
      return NextResponse.json({ success: false, message: 'Email sudah terdaftar.' }, { status: 409 });

    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      let id_mahasiswa: number | null = null;
      let id_staff: number | null = null;

      if (role === 'mahasiswa') {
        if (linkage_mode === 'existing') {
          const idIn = Number(body.id_mahasiswa);
          if (!Number.isFinite(idIn) || idIn <= 0)
            throw new Error('id_mahasiswa wajib untuk linkage existing.');
          const [chk] = (await conn.query(
            `SELECT id_mahasiswa FROM mahasiswa WHERE id_mahasiswa = ? LIMIT 1`,
            [idIn],
          )) as [Array<{ id_mahasiswa: number }>, unknown];
          if (!chk.length) throw new Error('Mahasiswa tidak ditemukan.');
          id_mahasiswa = idIn;
        } else {
          const nim = String(body.nim || '').trim();
          const angkatan = Number(body.angkatan);
          if (!nim || !/^[A-Za-z0-9_-]{4,15}$/.test(nim))
            throw new Error('NIM wajib (4-15 char alfanumerik).');
          if (!Number.isFinite(angkatan) || angkatan < 1990 || angkatan > 2100)
            throw new Error('Angkatan tidak valid.');
          const [ins] = (await conn.query(
            `INSERT INTO mahasiswa (nim, nama_mahasiswa, email_sso, angkatan)
             VALUES (?, ?, ?, ?)`,
            [nim, nama, email, angkatan],
          )) as [{ insertId: number }, unknown];
          id_mahasiswa = ins.insertId;
        }
      } else {
        // Role: dosen / kaprodi / jamu / admin -> linkage ke staff
        if (linkage_mode === 'existing') {
          const idIn = Number(body.id_staff);
          if (!Number.isFinite(idIn) || idIn <= 0)
            throw new Error('id_staff wajib untuk linkage existing.');
          const [chk] = (await conn.query(
            `SELECT id_staff FROM staff WHERE id_staff = ? LIMIT 1`,
            [idIn],
          )) as [Array<{ id_staff: number }>, unknown];
          if (!chk.length) throw new Error('Staff tidak ditemukan.');
          id_staff = idIn;
        } else {
          const nip = String(body.nip_nidn_nik || '').trim();
          if (!nip || nip.length < 4 || nip.length > 20)
            throw new Error('NIP/NIDN/NIK wajib (4-20 char).');
          const peran = role === 'admin' ? 'admin'
                      : role === 'kaprodi' ? 'kaprodi'
                      : role === 'jamu' ? 'jamu' : 'dosen';
          const [ins] = (await conn.query(
            `INSERT INTO staff (nip_nidn_nik, nama_lengkap, email_sso, peran)
             VALUES (?, ?, ?, ?)`,
            [nip, nama, email, peran],
          )) as [{ insertId: number }, unknown];
          id_staff = ins.insertId;
        }
      }

      const plainPassword = generateRandomPassword(10);
      const hash = await bcrypt.hash(plainPassword, 10);

      const [ins] = (await conn.query(
        `INSERT INTO user (email, sandi_hash, role, status, force_password_change,
                           id_mahasiswa, id_staff, nama_input, verified_at)
         VALUES (?, ?, ?, 'aktif', 1, ?, ?, ?, NOW())`,
        [email, hash, role, id_mahasiswa, id_staff, nama],
      )) as [{ insertId: number }, unknown];

      await conn.commit();

      return NextResponse.json({
        success: true,
        data: {
          id_user: ins.insertId,
          email,
          role,
          nama,
          id_mahasiswa,
          id_staff,
          // PLAINTEXT password dikembalikan SEKALI biar admin bisa kasih ke user.
          // Setelah ini tidak akan pernah bisa dilihat lagi.
          generated_password: plainPassword,
          force_password_change: 1,
        },
      });
    } catch (e) {
      await conn.rollback();
      const msg = e instanceof Error ? e.message : 'Gagal membuat user.';
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    } finally {
      conn.release();
    }
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/users]', err);
    return serverError('Gagal membuat user.');
  }
}