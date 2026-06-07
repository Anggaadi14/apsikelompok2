/**
 * Seed 6 akun pre-verified untuk role yang TIDAK boleh sign up
 * (kaprodi, jamu, admin) — sesuai notul: "yang perlu sign up cuma mahasiswa sama dosen"
 * 
 * 2 akun per role × 3 role = 6 akun.
 * Default password: 'demo123' (ubah di production)
 * 
 * Idempotent: skip kalau staff atau user sudah ada.
 * Run: pnpm tsx scripts/seed-users.ts
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { getDb } from '../app/lib/db'

const DEFAULT_PASSWORD = 'demo123'
const BCRYPT_ROUNDS = 10

type Seed = {
  email: string
  nama: string
  nip: string
  role: 'kaprodi' | 'jamu' | 'admin'
}

const SEEDS: Seed[] = [
  // Kaprodi × 2
  { email: 'kaprodi1@sicpl.test', nama: 'Dr. Kaprodi Satu, S.T., M.T.', nip: 'KP001', role: 'kaprodi' },
  { email: 'kaprodi2@sicpl.test', nama: 'Dr. Kaprodi Dua, S.T., M.T.',  nip: 'KP002', role: 'kaprodi' },
  // Tim Jamu (Jaminan Mutu) × 2
  { email: 'jamu1@sicpl.test',    nama: 'Tim Jamu Satu, S.T., M.T.',     nip: 'JM001', role: 'jamu' },
  { email: 'jamu2@sicpl.test',    nama: 'Tim Jamu Dua, S.T., M.T.',      nip: 'JM002', role: 'jamu' },
  // Admin Prodi × 2
  { email: 'admin1@sicpl.test',   nama: 'Admin Prodi Satu',              nip: 'AD001', role: 'admin' },
  { email: 'admin2@sicpl.test',   nama: 'Admin Prodi Dua',               nip: 'AD002', role: 'admin' },
]

async function main() {
  const db = getDb()
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS)

  for (const s of SEEDS) {
    // 1) Cek/insert staff
    const [staffRows] = await db.query<any[]>(
      `SELECT id_staff FROM staff WHERE email_sso = ? OR nip_nidn_nik = ? LIMIT 1`,
      [s.email, s.nip]
    )

    let idStaff: number
    if ((staffRows as any[]).length > 0) {
      idStaff = (staffRows as any[])[0].id_staff
      console.log(`[staff] ${s.email} exists (id=${idStaff})`)
    } else {
      const [ins] = await db.query<any>(
        `INSERT INTO staff (nip_nidn_nik, nama_lengkap, email_sso, peran, status_akun)
         VALUES (?, ?, ?, ?, 'aktif')`,
        [s.nip, s.nama, s.email, s.role]
      )
      idStaff = (ins as any).insertId
      console.log(`[staff] ${s.email} inserted (id=${idStaff})`)
    }

    // 2) Cek/insert user
    const [userRows] = await db.query<any[]>(
      `SELECT id_user FROM user WHERE email = ? OR id_staff = ? LIMIT 1`,
      [s.email, idStaff]
    )
    if ((userRows as any[]).length > 0) {
      console.log(`[user]  ${s.email} already exists, skip`)
      continue
    }

    await db.query(
      `INSERT INTO user (email, sandi_hash, role, status, verified_at, id_staff, nama_input)
       VALUES (?, ?, ?, 'aktif', NOW(), ?, ?)`,
      [s.email, hash, s.role, idStaff, s.nama]
    )
    console.log(`[user]  ${s.email} inserted (password='${DEFAULT_PASSWORD}')`)
  }

  console.log('\n✅ Seed complete.')
  console.log(`Default password untuk semua akun seeded: '${DEFAULT_PASSWORD}'`)
  console.log('Akun yang dibuat:')
  for (const s of SEEDS) console.log(`  - ${s.email}  (role=${s.role})`)

  await db.end()
  process.exit(0)
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})