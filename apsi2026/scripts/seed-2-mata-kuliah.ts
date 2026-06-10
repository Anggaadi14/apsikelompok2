import 'dotenv/config'
import * as path from 'path'
import { getDb } from '../app/lib/db'
import {
  readSheetAsObjects,
  cleanStr,
  nonEmpty,
  deriveSingkatanMK,
  upsertGetId,
  DATA_DIR,
  log,
} from '../app/lib/seedHelpers'

async function main() {
  log.step('SEED 2: Mata Kuliah + kurikulum_mk')

  const db = getDb()
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    // Cari id_kurikulum K24
    const [kurRows] = await conn.query<any[]>(
      `SELECT id_kurikulum FROM kurikulum WHERE kode = 'K24' LIMIT 1`
    )
    if (kurRows.length === 0) throw new Error('Kurikulum K24 belum ada. Jalankan seed-1 dulu.')
    const idKurikulum = kurRows[0].id_kurikulum as number

    log.info('Read template-upload-mk-kurikulum.xlsx...')
    const mkFile = path.join(DATA_DIR, 'template-upload-mk-kurikulum.xlsx')
    const rows = readSheetAsObjects(mkFile)

    let inserted = 0
    let skipped = 0
    let inactive = 0

    for (const row of rows) {
      const kodeMk = cleanStr(
        row['KODE MK'] ?? row['Kode MK'] ?? row['kode_mk'] ?? row['Kode'] ?? ''
      )
      const namaMk = cleanStr(
        row['NAMA MK'] ?? row['Nama MK'] ?? row['nama_mk'] ?? row['Nama'] ?? ''
      )
      const sksRaw = row['SKS'] ?? row['sks'] ?? 0
      const semesterRaw = row['SEMESTER'] ?? row['Semester'] ?? row['semester'] ?? null
      const statusRaw = cleanStr(
        row['YA(1)/TIDAK'] ?? row['Status'] ?? row['Aktif'] ?? 'YA'
      ).toUpperCase()

      if (!kodeMk || !namaMk) {
        skipped++
        continue
      }

      const sks = typeof sksRaw === 'string' ? parseFloat(sksRaw) : Number(sksRaw)
      const semesterNum = Number(semesterRaw)
      const semester = semesterRaw === null || semesterRaw === '' || isNaN(semesterNum) ? null : semesterNum
      const singkatan = deriveSingkatanMK(namaMk)

      // Insert MK (unik per kode_mk)
      const idMk = await upsertGetId(
        conn,
        'mata_kuliah',
        { kode_mk: kodeMk },
        {
          kode_mk: kodeMk,
          nama_mk: namaMk,
          sks: isNaN(sks) ? 0 : sks,
          singkatan,
        },
        'id_mata_kuliah'
      )

      // Hanya tambah ke kurikulum_mk kalau status = YA atau '1' (MK aktif di K24)
      const isAktif = statusRaw === 'YA' || statusRaw === '1' || statusRaw === 'YES'
      if (isAktif) {
        await conn.query(
          `INSERT IGNORE INTO kurikulum_mk (id_kurikulum, id_mata_kuliah, is_wajib, semester_default)
           VALUES (?, ?, 1, ?)`,
          [idKurikulum, idMk, semester]
        )
        inserted++
      } else {
        inactive++
      }
    }

    log.ok(`MK ter-insert ke kurikulum_mk K24: ${inserted}`)
    log.info(`MK tidak aktif (status≠YA, skip kurikulum_mk): ${inactive}`)
    log.info(`Baris skipped (kode/nama kosong): ${skipped}`)

    await conn.commit()
    log.ok('✅ Seed 2 selesai.')
  } catch (err) {
    await conn.rollback()
    log.err(`Seed 2 gagal: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  } finally {
    conn.release()
    await db.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })