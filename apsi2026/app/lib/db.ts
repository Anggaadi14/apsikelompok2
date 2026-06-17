// app/lib/db.ts
//
// KONEKSI DATABASE — MySQL (db_monitoring_cpl)
//
// File ini hanya dibuat SATU KALI dan tidak perlu diubah-ubah.
// Semua file API akan import getDb() dari sini.

import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export async function getConnection() {
  const db = getDb();
  return await db.getConnection();
}

export function getDb(): mysql.Pool {
  if (!pool) {
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
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });

    console.log(`[DB] Pool dibuat → ${process.env.DB_HOST}/${process.env.DB_NAME}`);
  }

  return pool;
}

/**
 * Helper query — mengembalikan ROWS LANGSUNG (bukan tuple [rows, fields]).
 *
 * Contoh penggunaan untuk SELECT:
 *   const users = await query<{ id: number; name: string }[]>(
 *     'SELECT id, name FROM users WHERE active = ?', [1]
 *   );
 *   users.forEach(u => console.log(u.name));
 *
 * Untuk INSERT/UPDATE/DELETE, cast hasil ke ResultSetHeader:
 *   const r = await query<ResultSetHeader>('INSERT INTO ... VALUES (?)', [x]);
 *   console.log(r.insertId, r.affectedRows);
 */
export async function query<T = RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const db = getDb();
  const [rows] = (await db.query(sql, params)) as unknown as [T, FieldPacket[]];
  return rows;
}

// Re-export tipe yang sering dipakai
export type { RowDataPacket, ResultSetHeader, FieldPacket };

// ─────────────────────────────────────────────
// CONTOH ISI FILE .env.local (taruh di root project):
// ─────────────────────────────────────────────
// DB_HOST=localhost
// DB_PORT=3306
// DB_USER=root
// DB_PASSWORD=passwordmu
// DB_NAME=db_monitoring_cpl
// ─────────────────────────────────────────────