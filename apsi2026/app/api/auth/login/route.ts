// app/api/auth/login/route.ts
//
// ENDPOINT: POST /api/auth/login
//
// Menggantikan validasi usersSeeder di client (app/page.tsx).
// Sekarang login divalidasi ke database MySQL, bukan array hardcoded.
//
// ─────────────────────────────────────────────────────────────────────────────
// ALUR KERJA:
//
//   1. Client mengirim POST dengan body { username, password }
//   2. Endpoint cari user di tabel mahasiswa (cocokkan email_sso ATAU nim)
//   3. Kalau tidak ketemu di mahasiswa, cari di tabel staff (email_sso ATAU nip_nidn_nik)
//   4. Kalau ketemu, bandingkan password dengan bcrypt.compare()
//   5. Kalau cocok, kembalikan session object (format sama persis dengan usersSeeder)
//   6. Kalau tidak cocok, kembalikan 401
//
// ─────────────────────────────────────────────────────────────────────────────
// KOLOM YANG DIPAKAI:
//
//   Tabel mahasiswa:
//     nim          → identifier (dipakai sebagai "NIM" di ProfileCard)
//     nama_mahasiswa → name
//     email_sso    → bisa dipakai sebagai username login
//     sandi_hash   → password yang sudah di-hash bcrypt
//     status_akun  → harus 'aktif' agar bisa login
//
//   Tabel staff:
//     nip_nidn_nik → identifier (dipakai sebagai "NIP" di dashboard dosen/kaprodi)
//     nama_lengkap → name
//     email_sso    → bisa dipakai sebagai username login
//     sandi_hash   → password yang sudah di-hash bcrypt
//     peran        → ENUM('admin', 'dosen', 'kaprodi') → langsung jadi role
//     status_akun  → harus 'aktif' agar bisa login
//
// ─────────────────────────────────────────────────────────────────────────────
// FORMAT SESSION YANG DIKEMBALIKAN (harus sama persis dengan users.ts):
//
//   {
//     id:         string   // "mhs_<id_mahasiswa>" atau "staff_<id_staff>"
//     username:   string   // email_sso yang dipakai login
//     name:       string   // nama lengkap
//     role:       string   // 'mahasiswa' | 'dosen' | 'kaprodi' | 'admin'
//     identifier: string   // NIM untuk mahasiswa, nip_nidn_nik untuk staff
//     initials:   string   // 2 huruf dari nama depan + belakang
//     prodi:      string   // hardcoded per konteks prodi
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/app/lib/db';
import { serverError } from '@/app/lib/auth';
import type mysql from 'mysql2/promise';

// ─────────────────────────────────────────────
// Tipe hasil query dari database
// ─────────────────────────────────────────────

interface MahasiswaLoginRow {
  id_mahasiswa: number;
  nim: string;
  nama_mahasiswa: string;
  email_sso: string;
  sandi_hash: string;
  status_akun: string;
}

interface StaffLoginRow {
  id_staff: number;
  nip_nidn_nik: string;
  nama_lengkap: string;
  email_sso: string;
  sandi_hash: string;
  peran: 'admin' | 'dosen' | 'kaprodi';
  status_akun: string;
}

// ─────────────────────────────────────────────
// Helper: Buat inisial dari nama lengkap
//
// Contoh:
//   "Ahmad Fadli"           → "AF"
//   "Siti Nurhaliza Indah"  → "SI"
//   "Budi"                  → "BU"
// ─────────────────────────────────────────────
function buatInisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/);
  if (bagian.length === 1) {
    // Nama satu kata: ambil 2 huruf pertama
    return bagian[0].substring(0, 2).toUpperCase();
  }
  // Nama lebih dari satu kata: huruf pertama kata pertama + huruf pertama kata terakhir
  return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
}

// ─────────────────────────────────────────────
// HANDLER UTAMA — POST /api/auth/login
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // ── LANGKAH 1: Parse body request ────────────────────────────────────
  let username: string;
  let password: string;

  try {
    const body = await request.json();
    username = (body.username ?? '').trim().toLowerCase();
    password = body.password ?? '';
  } catch {
    return Response.json(
      {
        success: false,
        error: 'BAD_REQUEST',
        message: 'Format request tidak valid.',
      },
      { status: 400 }
    );
  }

  // Validasi: username dan password tidak boleh kosong
  if (!username || !password) {
    return Response.json(
      {
        success: false,
        error: 'BAD_REQUEST',
        message: 'Username dan password harus diisi.',
      },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    // ── LANGKAH 2: Cari di tabel mahasiswa ────────────────────────────
    //
    // Strategi: cocokkan input ke email_sso ATAU nim
    // Ini memungkinkan mahasiswa login dengan email SSO atau NIM mereka
    //
    // Catatan WHERE:
    //   LOWER(email_sso) = ?  → case-insensitive email match
    //   nim = ?               → NIM biasanya case-sensitive (huruf kapital)
    //
    const [mhsRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_mahasiswa, nim, nama_mahasiswa, email_sso, sandi_hash, status_akun
       FROM mahasiswa
       WHERE LOWER(email_sso) = ? OR nim = ?
       LIMIT 1`,
      [username, username.toUpperCase()] // NIM biasanya kapital, email lowercase
    );

    // Kalau ketemu di tabel mahasiswa
    if (mhsRows.length > 0) {
      const mhs = mhsRows[0] as MahasiswaLoginRow;

      // Cek status akun dulu sebelum compare password (lebih efisien)
      if (mhs.status_akun !== 'aktif') {
        return Response.json(
          {
            success: false,
            error: 'ACCOUNT_INACTIVE',
            message: 'Akun Anda tidak aktif. Hubungi administrator.',
          },
          { status: 403 }
        );
      }

      // Bandingkan password input dengan hash di database
      const passwordCocok = await bcrypt.compare(password, mhs.sandi_hash);

      if (!passwordCocok) {
        // Password salah — kembalikan pesan generik (jangan bilang "password salah" vs "user tidak ada")
        return invalidCredentials();
      }

      // ✅ Login berhasil — susun session object
      const sessionData = {
        id:         `mhs_${mhs.id_mahasiswa}`,
        username:   mhs.email_sso,
        name:       mhs.nama_mahasiswa,
        role:       'mahasiswa' as const,
        identifier: mhs.nim,          // NIM dipakai oleh endpoint profile/cpl/semester
        initials:   buatInisial(mhs.nama_mahasiswa),
        prodi:      'Prodi Teknik Industri UNS', // TODO: tambah relasi ke tabel prodi kalau schema diperluas
      };

      return Response.json({ success: true, data: sessionData });
    }

    // ── LANGKAH 3: Tidak ketemu di mahasiswa → cari di tabel staff ────
    //
    // Staff bisa login dengan email_sso ATAU nip_nidn_nik
    //
    const [staffRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_staff, nip_nidn_nik, nama_lengkap, email_sso, sandi_hash, peran, status_akun
       FROM staff
       WHERE LOWER(email_sso) = ? OR nip_nidn_nik = ?
       LIMIT 1`,
      [username, username] // NIP tidak perlu diubah case-nya
    );

    // Kalau tidak ketemu di staff juga → user tidak ada
    if (staffRows.length === 0) {
      return invalidCredentials();
    }

    const staff = staffRows[0] as StaffLoginRow;

    // Cek status akun
    if (staff.status_akun !== 'aktif') {
      return Response.json(
        {
          success: false,
          error: 'ACCOUNT_INACTIVE',
          message: 'Akun Anda tidak aktif. Hubungi administrator.',
        },
        { status: 403 }
      );
    }

    // Bandingkan password
    const passwordCocok = await bcrypt.compare(password, staff.sandi_hash);

    if (!passwordCocok) {
      return invalidCredentials();
    }

    // ✅ Login berhasil — susun session object untuk staff
    const sessionData = {
      id:         `staff_${staff.id_staff}`,
      username:   staff.email_sso,
      name:       staff.nama_lengkap,
      role:       staff.peran,          // 'admin' | 'dosen' | 'kaprodi' — langsung dari DB
      identifier: staff.nip_nidn_nik,   // NIP dipakai di dashboard dosen/kaprodi
      initials:   buatInisial(staff.nama_lengkap),
      prodi:      'Prodi Teknik Industri UNS',
    };

    return Response.json({ success: true, data: sessionData });

  } catch (error) {
    console.error('[API] POST /auth/login error:', error);
    return serverError(error instanceof Error ? error.message : String(error));
  }
}

// ─────────────────────────────────────────────
// Helper: Response 401 generik
//
// Selalu pakai pesan yang sama untuk user-tidak-ada
// maupun password-salah. Ini mencegah "user enumeration attack"
// (penyerang tidak bisa tahu apakah username ada atau tidak)
// ─────────────────────────────────────────────
function invalidCredentials() {
  return Response.json(
    {
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Username atau Password yang Anda masukkan tidak valid.',
    },
    { status: 401 }
  );
}
