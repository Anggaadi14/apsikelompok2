import 'dotenv/config'
import * as path from 'path'
import { getDb } from '../app/lib/db'
import {
  readSheetAsObjects,
  cleanStr,
  upsertGetId,
  reportBermasalah,
  DATA_DIR,
  log,
} from '../app/lib/seedHelpers'

// Tahun akademik default — bisa di-override via env atau argument
const TAHUN_AKADEMIK = process.env.SEED_TAHUN_AKADEMIK ?? '2024/2025'
const SEMESTER: 'Ganjil' | 'Genap' = (process.env.SEED_SEMESTER as any) ?? 'Ganjil'

async function main() {
  log.step(`SEED 4: kelas_mk + mapping_dosen_kelas (TA ${TAHUN_AKADEMIK} ${SEMESTER})`)

  const db = getDb()
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    // Lookup id_kurikulum
    const [kurRows] = await conn.query<any[]>(
      `SELECT id_kurikulum FROM kurikulum WHERE kode = 'K24' LIMIT 1`
    )
    if (kurRows.length === 0) throw new Error('Kurikulum K24 belum ada')
    const idKurikulum = kurRows[0].id_kurikulum as number

    // Lookup MK by kode
    const [mkRows] = await conn.query<any[]>(`SELECT id_mata_kuliah, kode_mk FROM mata_kuliah`)
    const mkLookup = new Map<string, number>()
    for (const r of mkRows) mkLookup.set(cleanStr(r.kode_mk), r.id_mata_kuliah)

    // Lookup staff by nip_nidn_nik
    const [staffRows] = await conn.query<any[]>(`SELECT id_staff, nip_nidn_nik, nama_lengkap FROM staff`)
    const staffLookup = new Map<string, number>()
    for (const r of staffRows) {
      if (r.nip_nidn_nik) staffLookup.set(cleanStr(r.nip_nidn_nik).toUpperCase(), r.id_staff)
    }

    log.info('Read Data_Pengampu.xlsx...')
    const pengampuFile = path.join(DATA_DIR, 'Data Pengampu.xlsx')
    const rows = readSheetAsObjects(pengampuFile)

    let kelasInserted = 0
    let mappingInserted = 0
    let problems = 0

    for (const row of rows) {
      const kodeMk = cleanStr(row['Kode Mk'] ?? row['Kode MK'] ?? row['KODE MK'] ?? '')
      const namaDosenStr = cleanStr(row['Nama Dosen'] ?? row['Dosen'] ?? '')
      const kodeKelas = cleanStr(row['Kelas'] ?? 'A').toUpperCase().substring(0, 3)
      const kuotaRaw = row['Kuota Reguler'] ?? row['Kuota'] ?? null

      if (!kodeMk || !namaDosenStr) continue

      const idMk = mkLookup.get(kodeMk)
      if (!idMk) {
        await reportBermasalah(conn, 'kode_mk_tidak_terdaftar', 'mata_kuliah', kodeMk,
          { reason: 'MK di Data_Pengampu tidak ada di mata_kuliah', namaDosenStr, kodeKelas })
        problems++
        continue
      }

      // Insert kelas_mk
      const kuota = kuotaRaw && !isNaN(Number(kuotaRaw)) ? Number(kuotaRaw) : null
      const idKelas = await upsertGetId(
        conn,
        'kelas_mk',
        { id_mata_kuliah: idMk, tahun_akademik: TAHUN_AKADEMIK, semester: SEMESTER, kode_kelas: kodeKelas },
        {
          id_mata_kuliah: idMk,
          id_kurikulum: idKurikulum,
          tahun_akademik: TAHUN_AKADEMIK,
          semester: SEMESTER,
          kode_kelas: kodeKelas,
          kuota,
        },
        'id_kelas'
      )
      kelasInserted++

      // Parse dosen: format "JUM001 - Jumiyanto Widodo, FAH003 - Fahmi Ulin..." (multi-dosen comma-separated)
      const dosenEntries = namaDosenStr.split(/\s*,\s*/).filter(s => s.length > 0)
      let firstDosen = true
      for (const entry of dosenEntries) {
        // Format: "KODE - Nama" atau hanya "Nama"
        const match = entry.match(/^([A-Z]{2,5}\d{2,4})\s*[-–]?\s*(.+)$/)
        let kodeDosen: string | null = null
        if (match) kodeDosen = match[1].toUpperCase()

        let idStaff: number | undefined
        if (kodeDosen) {
          idStaff = staffLookup.get(kodeDosen)
        }
        if (!idStaff) {
          await reportBermasalah(conn, 'nim_tidak_terdaftar', 'staff', kodeDosen ?? entry,
            { reason: 'Dosen di Data_Pengampu tidak ada di staff', entry, kodeMk, kodeKelas })
          problems++
          continue
        }

        await conn.query(
          `INSERT IGNORE INTO mapping_dosen_kelas (id_kelas, id_staff, peran_di_kelas) VALUES (?, ?, ?)`,
          [idKelas, idStaff, firstDosen ? 'koordinator' : 'anggota']
        )
        mappingInserted++
        firstDosen = false
      }
    }

    log.ok(`Kelas ter-insert: ${kelasInserted}`)
    log.ok(`mapping_dosen_kelas ter-insert: ${mappingInserted}`)
    if (problems > 0) log.warn(`${problems} anomali di-queue ke data_bermasalah`)

    await conn.commit()
    log.ok('✅ Seed 4 selesai.')
  } catch (err) {
    await conn.rollback()
    log.err(`Seed 4 gagal: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  } finally {
    conn.release()
    await db.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })