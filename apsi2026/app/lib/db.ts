// app/lib/db.ts
//
// KONEKSI DATABASE — MySQL (db_monitoring_cpl)
//
// File ini hanya dibuat SATU KALI dan tidak perlu diubah-ubah.
// Semua file API akan import getDb() dari sini.
//
// Cara kerja:
//   - Menggunakan "connection pool" = sekumpulan koneksi yang siap pakai
//   - Pool dibuat sekali saat server start, tidak dibuat ulang tiap request
//   - Setiap query mengambil satu koneksi dari pool, lalu mengembalikannya
//
// SETUP SEBELUM PAKAI:
//   1. npm install mysql2
//   2. Buat file .env.local di root project (JANGAN di-commit ke git!)
//   3. Isi .env.local sesuai contoh di bawah

import mysql from 'mysql2/promise';

// Tipe untuk pool — supaya TypeScript tidak bingung
let pool: mysql.Pool | null = null;

/**
 * Mengembalikan connection pool MySQL.
 * Pool dibuat sekali, kemudian di-reuse.
 *
 * Contoh penggunaan di file API:
 *   const db = getDb();
 *   const [rows] = await db.query('SELECT ...', [param]);
 */

export async function getConnection() {
  // Pastikan pool sudah ter-inisialisasi sebelum ambil koneksi
  const db = getDb();
  return await db.getConnection();
}

export function getDb(): mysql.Pool {
  // Kalau pool belum ada, buat baru
  if (!pool) {
    // Pastikan semua env variable sudah diset
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      throw new Error(
        '[DB] Variabel environment database belum diset. ' +
        'Buat file .env.local dan isi DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.'
      );
    }

    pool = mysql.createPool({
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT ?? 3306),
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME,

      // Pool settings — aman untuk development
      connectionLimit: 10,      // maksimal 10 koneksi bersamaan
      waitForConnections: true, // kalau pool penuh, tunggu dulu
      queueLimit: 0,            // antrian tidak dibatasi
    });

    console.log(`[DB] Pool dibuat → ${process.env.DB_HOST}/${process.env.DB_NAME}`);
  }

  return pool;
}

export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<[T, mysql.FieldPacket[]]> {
  const db = getDb();
  return db.query(sql, params) as unknown as Promise<[T, mysql.FieldPacket[]]>;
}

// ─────────────────────────────────────────────
// CONTOH ISI FILE .env.local (taruh di root project):
// ─────────────────────────────────────────────
// DB_HOST=localhost
// DB_PORT=3306
// DB_USER=root
// DB_PASSWORD=passwordmu
// DB_NAME=db_monitoring_cpl
// ─────────────────────────────────────────────
