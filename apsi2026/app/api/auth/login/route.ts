// app/api/auth/login/route.ts
//
// ENDPOINT: POST /api/auth/login
//
// Memvalidasi kredensial user langsung dari database MySQL.
// File ini MENGGANTIKAN logika validasi di client (usersSeeder di page.tsx).
//
// ── IDENTITAS LOGIN ──────────────────────────────────────────────────────────
//   Mahasiswa          → username = NIM         (contoh: I0320045)
//   Dosen/Kaprodi/Admin → username = NIP/NIDN/NIK (contoh: 198203152008122001)
//
// ── ALUR ─────────────────────────────────────────────────────────────────────
//   1. Terima { username, password } dari request body
//   2. Cari di tabel mahasiswa (WHERE nim = username)
//   3. Jika tidak ketemu → cari di tabel staff (WHERE nip_nidn_nik = username)
//   4. Verifikasi password terhadap sandi_hash
//   5. Kembalikan UserSession (struktur sama persis dengan usersSeeder)
//
// ── VERIFIKASI PASSWORD ───────────────────────────────────────────────────────
//   - Jika sandi_hash diawali '$2' → bcrypt compare (production)
//   - Selain itu → plain text compare (untuk development & testing)
//   - bcryptjs bersifat opsional: hanya dipakai kalau hash memang bcrypt
//
// ── STRUKTUR SESSION YANG DIKEMBALIKAN ───────────────────────────────────────
//   {
//     id: string          // "mhs_{id_mahasiswa}" atau "staff_{id_staff}"
//     username: string    // NIM atau NIP/NIDN/NIK
//     name: string        // nama_mahasiswa atau nama_lengkap
//     role: UserRole      // 'mahasiswa' | 'dosen' | 'kaprodi' | 'admin'
//     identifier: string  // sama dengan username (NIM/NIP)
//     initials: string    // inisial dari nama (contoh: "AF" dari "Ahmad Fadli")
//     prodi: string       // hardcode "Prodi Teknik Industri UNS"
//   }

import { NextRequest } from 'next/server';
import { getDb } from '@/app/lib/db';
import type mysql from 'mysql2/promise';

// ─────────────────────────────────────────────
// Tipe baris dari database
// ─────────────────────────────────────────────

interface MahasiswaLoginRow {
  id_mahasiswa: number;
  nim: string;
  nama_mahasiswa: string;
  angkatan: number;
  sandi_hash: string;
}

interface StaffLoginRow {
  id_staff: number;
  nip_nidn_nik: string;
  nama_lengkap: string;
  peran: string;
  sandi_hash: string;
}

// ─────────────────────────────────────────────
// Konstanta role yang valid untuk staff
// Nilai ini harus cocok dengan kolom `peran` di tabel staff
// ─────────────────────────────────────────────
const VALID_STAFF_ROLES = ['dosen', 'kaprodi', 'admin'] as const;
type StaffRole = (typeof VALID_STAFF_ROLES)[number];

function isValidStaffRole(peran: string): peran is StaffRole {
  return VALID_STAFF_ROLES.includes(peran.toLowerCase() as StaffRole);
}

// ─────────────────────────────────────────────
// Helper: Generate inisial dari nama lengkap
//
// Cara kerja:
//   - Hapus gelar akademik umum (Prof, Dr, Ir, dst)
//   - Ambil huruf pertama kata pertama dan kata terakhir
//
// Contoh:
//   "Ahmad Fadli"                         → "AF"
//   "Prof. Dr. Ir. Budi Santoso, M.T."   → "BS"
//   "Siti"                                → "SI"
// ─────────────────────────────────────────────
function generateInitials(fullName: string): string {
  const cleaned = fullName
    // Hapus gelar akademik umum sebelum nama (Prof., Dr., Ir., dll)
    .replace(/\b(Prof|Dr|Ir|S\.T|M\.T|M\.Sc|Ph\.D|S\.Kom|M\.Kom|S\.E|M\.E|M\.M|M\.Si|S\.Si|M\.Cs)\b\.?/gi, '')
    // Hapus koma dan gelar setelah nama yang ada koma
    .replace(/,.*$/, '')
    .trim();

  const words = cleaned.split(/\s+/).filter((w) => w.length > 1);

  if (words.length === 0) return fullName.substring(0, 2).toUpperCase();
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

  // Inisial = huruf pertama kata pertama + huruf pertama kata terakhir
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ─────────────────────────────────────────────
// Helper: Verifikasi password
//
// Mendukung dua mode:
//   1. bcrypt hash (diawali '$2a' atau '$2b') — untuk production
//      Membutuhkan: npm install bcryptjs
//   2. Plain text — untuk development dan testing
//      Tidak membutuhkan package tambahan
//
// Cara sistem memilih mode:
//   - Cek prefix sandi_hash dari database
//   - Jika '$2...' → coba bcrypt (kalau bcryptjs belum install, login gagal + warning)
//   - Selain itu → plain text compare
// ─────────────────────────────────────────────
async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  // Mode 1: bcrypt hash
  if (storedHash.startsWith('$2')) {
    try {
      // Dynamic import — aman walau bcryptjs belum terinstall
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcrypt = await import('bcryptjs');
      return await bcrypt.compare(inputPassword, storedHash);
    } catch {
      // bcryptjs belum terinstall — tampilkan peringatan di server log
      console.warn(
        '\n[Auth] ⚠️  Password di database adalah bcrypt hash, tapi bcryptjs belum terinstall.\n' +
          '  Solusi A (development): UPDATE sandi_hash ke plain text di database.\n' +
          '  Solusi B (production):  npm install bcryptjs\n'
      );
      return false;
    }
  }

  // Mode 2: plain text — untuk development
  // PERINGATAN: Jangan digunakan di production dengan data nyata!
  return inputPassword === storedHash;
}

// ─────────────────────────────────────────────
// HANDLER UTAMA
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Parse body request ────────────────────────────────────────────────
  let body: { username?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Format request tidak valid.',
      },
      { status: 400 }
    );
  }

  // Trim whitespace, tapi JANGAN lowercase — NIM bisa mengandung huruf kapital (I0320045)
  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password) {
    return Response.json(
      {
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Username dan password wajib diisi.',
      },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    // ── LANGKAH 1: Cari di tabel mahasiswa ──────────────────────────────
    // Mahasiswa login menggunakan NIM sebagai username
    const [mhsRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_mahasiswa, nim, nama_mahasiswa, angkatan, sandi_hash
       FROM mahasiswa
       WHERE nim = ?
       LIMIT 1`,
      [username]
    );

    if (mhsRows.length > 0) {
      const mhs = mhsRows[0] as MahasiswaLoginRow;

      // Verifikasi password
      const passwordValid = await verifyPassword(password, mhs.sandi_hash);

      if (!passwordValid) {
        // Gunakan pesan yang sama untuk username salah maupun password salah
        // (security: jangan beri tahu user mana yang salah)
        return Response.json(
          {
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: 'Username atau password yang Anda masukkan tidak valid.',
          },
          { status: 401 }
        );
      }

      // ── Build session mahasiswa ────────────────────────────────────────
      // Struktur harus sama persis dengan UserSession di app/data/users.ts
      const sessionData = {
        id:         `mhs_${mhs.id_mahasiswa}`,
        username:   mhs.nim,                          // NIM sebagai username
        name:       mhs.nama_mahasiswa,
        role:       'mahasiswa' as const,
        identifier: mhs.nim,                          // identifier = NIM
        initials:   generateInitials(mhs.nama_mahasiswa),
        prodi:      'Prodi Teknik Industri UNS',
      };

      return Response.json({ success: true, user: sessionData });
    }

    // ── LANGKAH 2: Cari di tabel staff ──────────────────────────────────
    // Dosen/Kaprodi/Admin login menggunakan NIP/NIDN/NIK sebagai username
    const [staffRows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT id_staff, nip_nidn_nik, nama_lengkap, peran, sandi_hash
       FROM staff
       WHERE nip_nidn_nik = ?
       LIMIT 1`,
      [username]
    );

    if (staffRows.length > 0) {
      const staff = staffRows[0] as StaffLoginRow;

      // Verifikasi password
      const passwordValid = await verifyPassword(password, staff.sandi_hash);

      if (!passwordValid) {
        return Response.json(
          {
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: 'Username atau password yang Anda masukkan tidak valid.',
          },
          { status: 401 }
        );
      }

      // Validasi nilai kolom `peran` — harus salah satu dari valid roles
      const peran = staff.peran?.toLowerCase();

      if (!peran || !isValidStaffRole(peran)) {
        console.error(
          `[Auth] Peran tidak dikenali: "${staff.peran}" untuk NIP ${staff.nip_nidn_nik}`
        );
        return Response.json(
          {
            success: false,
            error: 'UNKNOWN_ROLE',
            message: `Peran "${staff.peran}" tidak dikenali oleh sistem. Hubungi administrator.`,
          },
          { status: 403 }
        );
      }

      // ── Build session staff ────────────────────────────────────────────
      const sessionData = {
        id:         `staff_${staff.id_staff}`,
        username:   staff.nip_nidn_nik,
        name:       staff.nama_lengkap,
        role:       peran as StaffRole,
        identifier: staff.nip_nidn_nik,               // identifier = NIP/NIDN/NIK
        initials:   generateInitials(staff.nama_lengkap),
        prodi:      'Prodi Teknik Industri UNS',
      };

      return Response.json({ success: true, user: sessionData });
    }

    // ── Tidak ditemukan di kedua tabel ───────────────────────────────────
    return Response.json(
      {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Username atau password yang Anda masukkan tidak valid.',
      },
      { status: 401 }
    );

  } catch (error) {
    console.error('[API] POST /auth/login error:', error);
    return Response.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan di server. Coba lagi nanti.',
        // Detail error hanya ditampilkan di development
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
