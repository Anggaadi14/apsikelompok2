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

async function main() {
  log.step('SEED 3: CPMK + mapping_cpmk_ik')

  const db = getDb()
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    // Build lookup: kode_ik → {id_ik, id_cpl}
    const [ikRows] = await conn.query<any[]>(
      `SELECT ik.id_ik, ik.kode_ik, ik.id_cpl, c.kode_cpl
       FROM indikator_kinerja ik
       JOIN cpl c ON c.id_cpl = ik.id_cpl
       WHERE c.id_kurikulum = (SELECT id_kurikulum FROM kurikulum WHERE kode='K24' LIMIT 1)`
    )
    const ikLookup = new Map<string, { id_ik: number; id_cpl: number }>()
    for (const r of ikRows) {
      ikLookup.set(`${r.kode_cpl}|${r.kode_ik}`, { id_ik: r.id_ik, id_cpl: r.id_cpl })
    }

    // Build lookup MK by singkatan untuk match prefix kode_cpmk (mis 'MO-1' → MK Matematika Optimasi)
    const [mkRows] = await conn.query<any[]>(
      `SELECT id_mata_kuliah, kode_mk, nama_mk, singkatan FROM mata_kuliah`
    )
    const mkBySingkatan = new Map<string, number>()
    for (const r of mkRows) {
      if (r.singkatan) {
        // Multiple MK bisa punya singkatan sama; ambil yang pertama
        if (!mkBySingkatan.has(r.singkatan)) {
          mkBySingkatan.set(r.singkatan, r.id_mata_kuliah)
        }
      }
    }
    // Juga lookup by nama (fallback)
    const mkByNama = new Map<string, number>()
    for (const r of mkRows) {
      mkByNama.set(cleanStr(r.nama_mk).toUpperCase(), r.id_mata_kuliah)
    }

    log.info('Read Performance_Indicators_PSTI.xlsx sheet CPL- PI - CPMK...')
    const piFile = path.join(DATA_DIR, 'Performance_Indicators_PSTI.xlsx')
    const piRows = readSheetAsObjects(piFile, 'CPL- PI - CPMK')

    let cpmkInserted = 0
    let mappingInserted = 0
    let problems = 0
    const cpmkSeen = new Map<string, number>()  // "id_mk|kode_cpmk" → id_cpmk

    for (const row of piRows) {
      const kodeCpl = cleanStr(row['Kode CPL'] ?? '').replace(/[^0-9]/g, '')
      const kodePi = cleanStr(row['Kode PI'] ?? '')
      const mkEvaluator = cleanStr(row['MK Evaluator'] ?? '').toUpperCase()
      const kodeCpmk = cleanStr(row['Kode CPMK'] ?? '')
      const deskripsiCpmk = cleanStr(row['CPMK'] ?? '')

      if (!kodeCpl || !kodePi || !kodeCpmk) continue

      // Resolve IK
      const ikInfo = ikLookup.get(`${kodeCpl}|${kodePi}`)
      if (!ikInfo) {
        await reportBermasalah(conn, 'mapping_cpmk_ik_tidak_lengkap', 'indikator_kinerja',
          `${kodeCpl}|${kodePi}`,
          { reason: 'IK tidak ditemukan saat seed CPMK', kodeCpmk, mkEvaluator }
        )
        problems++
        continue
      }

      // Resolve MK: prioritas (1) match nama MK Evaluator, (2) prefix dari kode_cpmk (mis 'MO-1' → 'MO')
      let idMk: number | undefined
      if (mkEvaluator) {
        idMk = mkByNama.get(mkEvaluator)
      }
      if (!idMk) {
        const prefix = kodeCpmk.split('-')[0]
        idMk = mkBySingkatan.get(prefix)
      }
      if (!idMk) {
        await reportBermasalah(conn, 'kode_mk_tidak_terdaftar', 'mata_kuliah',
          mkEvaluator || kodeCpmk,
          { reason: 'MK Evaluator tidak match MK manapun', kodeCpmk, mkEvaluator, kodePi, kodeCpl }
        )
        problems++
        continue
      }

      // Insert CPMK (unique by id_mata_kuliah + kode_cpmk)
      const cpmkKey = `${idMk}|${kodeCpmk}`
      let idCpmk = cpmkSeen.get(cpmkKey)
      if (!idCpmk) {
        idCpmk = await upsertGetId(
          conn,
          'cpmk',
          { id_mata_kuliah: idMk, kode_cpmk: kodeCpmk },
          {
            id_mata_kuliah: idMk,
            kode_cpmk: kodeCpmk,
            deskripsi_id: deskripsiCpmk || `CPMK ${kodeCpmk}`,
            urutan: cpmkSeen.size + 1,
          },
          'id_cpmk'
        )
        cpmkSeen.set(cpmkKey, idCpmk)
        cpmkInserted++
      }

      // Insert mapping_cpmk_ik (bobot=0)
      await conn.query(
        `INSERT IGNORE INTO mapping_cpmk_ik (id_cpmk, id_ik, bobot_persen) VALUES (?, ?, 0)`,
        [idCpmk, ikInfo.id_ik]
      )
      mappingInserted++
    }

    log.ok(`CPMK ter-insert: ${cpmkInserted}`)
    log.ok(`mapping_cpmk_ik ter-insert: ${mappingInserted} (semua bobot=0)`)
    if (problems > 0) {
      log.warn(`Anomali ${problems} baris di-queue ke data_bermasalah`)
    }

    await conn.commit()
    log.ok('✅ Seed 3 selesai.')
  } catch (err) {
    await conn.rollback()
    log.err(`Seed 3 gagal: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  } finally {
    conn.release()
    await db.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })