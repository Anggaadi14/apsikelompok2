/**
 * Migrasi data: pindah kredensial dari mahasiswa.{email_sso,sandi_hash,status_akun}
 * dan staff.{email_sso,sandi_hash,status_akun,peran} ke tabel user.
 * 
 * Idempotent: skip kalau user untuk entitas itu sudah ada.
 * Run: pnpm tsx scripts/migrate-to-user-table.ts
 */

import 'dotenv/config'
import { getDb } from '../app/lib/db'

async function main() {
  const db = getDb()

  // ===== Mahasiswa =====
  let mhsInserted = 0
  let mhsSkipped = 0
  const [mhsRows] = await db.query<any[]>(
    `SELECT id_mahasiswa, email_sso, sandi_hash, status_akun, nama_mahasiswa
     FROM mahasiswa
     WHERE email_sso IS NOT NULL AND email_sso <> ''`
  )

  for (const m of mhsRows as any[]) {
    const [exist] = await db.query<any[]>(
      `SELECT id_user FROM user WHERE id_mahasiswa = ? OR email = ? LIMIT 1`,
      [m.id_mahasiswa, m.email_sso]
    )
    if ((exist as any[]).length > 0) {
      mhsSkipped++
      continue
    }

    const status = m.status_akun === 'aktif' ? 'aktif' : 'nonaktif'

    await db.query(
      `INSERT INTO user (email, sandi_hash, role, status, verified_at, id_mahasiswa, nama_input)
       VALUES (?, ?, 'mahasiswa', ?, NOW(), ?, ?)`,
      [m.email_sso, m.sandi_hash, status, m.id_mahasiswa, m.nama_mahasiswa]
    )
    mhsInserted++
  }
  console.log(`[mahasiswa] inserted=${mhsInserted} skipped=${mhsSkipped}`)

  // ===== Staff =====
  let staffInserted = 0
  let staffSkipped = 0
  const [staffRows] = await db.query<any[]>(
    `SELECT id_staff, email_sso, sandi_hash, status_akun, peran, nama_lengkap
     FROM staff
     WHERE email_sso IS NOT NULL AND email_sso <> ''`
  )

  for (const s of staffRows as any[]) {
    const [exist] = await db.query<any[]>(
      `SELECT id_user FROM user WHERE id_staff = ? OR email = ? LIMIT 1`,
      [s.id_staff, s.email_sso]
    )
    if ((exist as any[]).length > 0) {
      staffSkipped++
      continue
    }

    const status = s.status_akun === 'aktif' ? 'aktif' : 'nonaktif'
    const role = ['admin', 'dosen', 'kaprodi', 'jamu'].includes(s.peran)
      ? s.peran
      : 'dosen'

    await db.query(
      `INSERT INTO user (email, sandi_hash, role, status, verified_at, id_staff, nama_input)
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      [s.email_sso, s.sandi_hash, role, status, s.id_staff, s.nama_lengkap]
    )
    staffInserted++
  }
  console.log(`[staff] inserted=${staffInserted} skipped=${staffSkipped}`)

  console.log('\n✅ Migration complete.')
  console.log('Verify dengan:')
  console.log('  SELECT role, status, COUNT(*) FROM user GROUP BY role, status;')

  await db.end()
  process.exit(0)
}

main().catch((e) => {
  console.error('❌ Migration failed:', e)
  process.exit(1)
})