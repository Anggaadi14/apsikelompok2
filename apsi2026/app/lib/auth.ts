// app/lib/auth.ts
//
// HELPER SESSION — Validasi sesi user di setiap endpoint API
//
// Masalah yang dipecahkan:
//   - Semua endpoint perlu tahu "siapa yang sedang request?"
//   - Kita tidak mau menulis kode validasi yang sama di 10 file berbeda
//   - Semua logika validasi dikumpulkan di sini
//
// Cara kerja saat ini:
//   - Client (browser) menyimpan data user di sessionStorage
//   - Setiap kali fetch ke API, client menyertakan data itu di header X-User-Session
//   - Backend membaca header itu dan mem-parse-nya
//
// Catatan untuk production nanti:
//   - Sistem ini sederhana dan cocok untuk development/demo
//   - Untuk production: ganti dengan JWT token + HTTP-only cookies

import { NextRequest } from 'next/server';

// Struktur data session — harus sama persis dengan yang ada di client (users.ts)
export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: 'mahasiswa' | 'kaprodi' | 'dosen' | 'admin';
  identifier: string; // NIM untuk mahasiswa, NIP untuk dosen/kaprodi
  initials: string;
  prodi: string;
}

/**
 * Baca dan validasi session dari header request.
 *
 * Mengembalikan UserSession jika valid, atau null jika tidak.
 *
 * Contoh penggunaan:
 *   const session = getSessionFromRequest(request);
 *   if (!session) return unauthorized();
 *   const nim = session.identifier; // NIM mahasiswa
 */
export function getSessionFromRequest(request: NextRequest): UserSession | null {
  // Ambil header X-User-Session yang dikirim oleh client
  const sessionHeader = request.headers.get('X-User-Session');

  if (!sessionHeader) {
    return null; // Header tidak ada = tidak login
  }

  try {
    const session = JSON.parse(sessionHeader) as UserSession;

    // Validasi: pastikan field penting ada dan tidak kosong
    if (!session.role || !session.identifier || !session.id) {
      return null;
    }

    return session;
  } catch {
    // JSON rusak / tidak bisa di-parse
    return null;
  }
}

// ─────────────────────────────────────────────
// Helper response standar — pakai ini supaya
// format error konsisten di semua endpoint
// ─────────────────────────────────────────────

/** Response 401: Belum login / sesi tidak valid */
export function unauthorized() {
  return Response.json(
    {
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Sesi tidak valid. Silakan login kembali.',
    },
    { status: 401 }
  );
}

/** Response 403: Sudah login tapi tidak punya akses */
export function forbidden() {
  return Response.json(
    {
      success: false,
      error: 'FORBIDDEN',
      message: 'Anda tidak memiliki akses ke resource ini.',
    },
    { status: 403 }
  );
}

/** Response 500: Error di server */
export function serverError(detail?: string) {
  return Response.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan di server. Coba lagi nanti.',
      detail: process.env.NODE_ENV === 'development' ? detail : undefined,
    },
    { status: 500 }
  );
}
