/**
 * Script sekali jalan: hash semua password literal di tabel mahasiswa & staff
 * jadi bcrypt. Aman dijalankan berulang — yang sudah ber-prefix '$2' akan diskip.
 *
 * Jalankan: npx tsx scripts/migrate-passwords.ts
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const ROUNDS = 10

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'db_monitoring_cpl',
  })

  console.log('🔐 Migrating mahasiswa.sandi_hash ...')
  const [mhsRows] = await conn.execute(
    'SELECT id_mahasiswa, sandi_hash FROM mahasiswa',
  )
  let mhsUpdated = 0
  for (const row of mhsRows as any[]) {
    const cur: string = row.sandi_hash ?? ''
    if (cur.startsWith('$2')) continue
    const plain = cur || 'password123'
    const hashed = await bcrypt.hash(plain, ROUNDS)
    await conn.execute(
      'UPDATE mahasiswa SET sandi_hash = ? WHERE id_mahasiswa = ?',
      [hashed, row.id_mahasiswa],
    )
    mhsUpdated++
  }
  console.log(`   ✅ ${mhsUpdated} mahasiswa di-hash`)

  console.log('🔐 Migrating staff.sandi_hash ...')
  const [stfRows] = await conn.execute(
    'SELECT id_staff, sandi_hash FROM staff',
  )
  let stfUpdated = 0
  for (const row of stfRows as any[]) {
    const cur: string = row.sandi_hash ?? ''
    if (cur.startsWith('$2')) continue
    const plain = cur || 'password123'
    const hashed = await bcrypt.hash(plain, ROUNDS)
    await conn.execute(
      'UPDATE staff SET sandi_hash = ? WHERE id_staff = ?',
      [hashed, row.id_staff],
    )
    stfUpdated++
  }
  console.log(`   ✅ ${stfUpdated} staff di-hash`)

  await conn.end()
  console.log('✨ Selesai. Password awal tetap sama, hanya tersimpan sebagai bcrypt sekarang.')
}

main().catch((err) => {
  console.error('❌ Migrasi gagal:', err)
  process.exit(1)
})