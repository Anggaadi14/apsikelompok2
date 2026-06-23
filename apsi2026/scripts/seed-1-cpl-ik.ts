import 'dotenv/config'
import * as path from 'path'
import { getDb } from '../app/lib/db'
import {
  readSheetAsObjects,
  cleanStr,
  nonEmpty,
  deriveDomain,
  upsertGetId,
  DATA_DIR,
  log,
} from '../app/lib/seedHelpers'

async function main() {
  log.step('SEED 1: Kurikulum + CPL + IK + mapping_ik_cpl')
  const db = getDb()
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    // ------------------------------------------------------------------------
    // 1. Insert kurikulum K24
    // ------------------------------------------------------------------------
    log.info('Insert kurikulum K24...')
    const idKurikulum = await upsertGetId(
      conn,
      'kurikulum',
      { kode: 'K24' },
      {
        kode: 'K24',
        nama: 'Kurikulum 2024 — Program Studi Sarjana Teknik Industri OBE',
        tahun_mulai: 2024,
        tahun_selesai: null,
        is_active: 1,
        deskripsi: 'Kurikulum aktif berbasis Outcome-Based Education',
      },
      'id_kurikulum'
    )
    log.ok(`Kurikulum K24 → id_kurikulum = ${idKurikulum}`)

    // ------------------------------------------------------------------------
    // 2. Insert CPL dari CPL_I061.xlsx
    // ------------------------------------------------------------------------
    log.info('Read CPL_I061.xlsx...')
    const cplFile = path.join(DATA_DIR, 'CPL_I061.xlsx')
    // File memiliki struktur: Kode | Singkatan | Domain | Deskripsi ID | Deskripsi EN ...
    // Header ada di row 2 (1-indexed). Kita baca raw, lalu pakai row pertama sebagai header.
    const rows = readSheetAsObjects(cplFile)

    // Filter hanya CPL K24 (10 baris pertama: P1-P1, KK1-KK4, KU1-KU3, S1-S2)
    // CPL_I061 punya 10 CPL K24 + 14 CPL legacy K-lama. Kita ambil semua kalau ada urutan,
    // tapi yang K24 di-map ke kurikulum K24.
    // Heuristic: 10 CPL pertama = K24. Sisanya = K-lama (di-skip untuk sekarang).
    const cplK24 = rows.slice(0, 10)

    const cplIdMap: Record<string, number> = {}  // kode_cpl → id_cpl
    let urutan = 1
    for (const row of cplK24) {
      // Adaptable: cari kolom-kolom dgn nama beda-beda
      const kodeCpl = cleanStr(row['Kode CPL'] ?? row['Kode'] ?? row['No'] ?? row['CPL'] ?? urutan)
      const singkatan = cleanStr(row['Singkatan'] ?? row['Kode Singkat'] ?? row['Code'] ?? '')
      const deskripsiId = cleanStr(row['Deskripsi (Indonesia)'] ?? row['Deskripsi ID'] ?? row['Deskripsi'] ?? row['CPL'] ?? '')
      const deskripsiEn = nonEmpty(row['Deskripsi (English)'] ?? row['Deskripsi EN'] ?? row['Description'] ?? null)

      if (!singkatan || !deskripsiId) {
        log.warn(`Skip baris CPL kosong: ${JSON.stringify(row)}`)
        continue
      }

      const domain = deriveDomain(singkatan)
      const kodeCplNorm = cleanStr(kodeCpl).replace(/[^0-9]/g, '') || String(urutan)

      const idCpl = await upsertGetId(
        conn,
        'cpl',
        { id_kurikulum: idKurikulum, kode_cpl: kodeCplNorm },
        {
          id_kurikulum: idKurikulum,
          kode_cpl: kodeCplNorm,
          singkatan,
          domain,
          deskripsi_id: deskripsiId,
          deskripsi_en: deskripsiEn,
          urutan,
        },
        'id_cpl'
      )
      cplIdMap[kodeCplNorm] = idCpl
      log.ok(`  CPL ${kodeCplNorm} (${singkatan}) → id_cpl = ${idCpl}`)
      urutan++
    }
    log.info(`Total CPL ter-insert: ${Object.keys(cplIdMap).length}`)

    // ------------------------------------------------------------------------
    // 3. Insert IK dari Performance_Indicators_PSTI.xlsx sheet 'CPL- PI - CPMK'
    // ------------------------------------------------------------------------
    log.info('Read Performance_Indicators_PSTI.xlsx (sheet CPL- PI - CPMK)...')
    const piFile = path.join(DATA_DIR, 'Performance_Indicators_PSTI.xlsx')
    const piRows = readSheetAsObjects(piFile, 'CPL- PI - CPMK')

    // Cols: Kode CPL | CPL | Kode PI | PI | MK Evaluator | Kode CPMK | CPMK
    // 1 row = 1 mapping CPMK→IK→CPL. Kita seed dulu IK-nya (unique per CPL + Kode PI).
    const ikSeen = new Set<string>()  // "id_cpl|kode_ik"
    let ikUrutan: Record<number, number> = {}  // id_cpl → urutan counter
    let ikInsertedCount = 0
    let ikMappingCount = 0

    for (const row of piRows) {
      const kodeCpl = cleanStr(row['Kode CPL'] ?? row['Kode_CPL'] ?? '').replace(/[^0-9]/g, '')
      const kodePi = cleanStr(row['Kode PI'] ?? row['Kode_PI'] ?? '')
      const deskripsiPi = cleanStr(row['PI'] ?? row['Indikator Kinerja'] ?? '')

      if (!kodeCpl || !kodePi) continue
      const idCpl = cplIdMap[kodeCpl]
      if (!idCpl) {
        log.warn(`CPL ${kodeCpl} tidak ditemukan, skip IK ${kodePi}`)
        continue
      }

      const key = `${idCpl}|${kodePi}`
      if (ikSeen.has(key)) continue
      ikSeen.add(key)
      ikUrutan[idCpl] = (ikUrutan[idCpl] ?? 0) + 1

      const idIk = await upsertGetId(
        conn,
        'indikator_kinerja',
        { id_cpl: idCpl, kode_ik: kodePi },
        {
          id_cpl: idCpl,
          kode_ik: kodePi,
          deskripsi: deskripsiPi || `Indikator Kinerja ${kodePi}`,
          urutan: ikUrutan[idCpl],
        },
        'id_ik'
      )
      ikInsertedCount++

      // Insert mapping_ik_cpl dengan bobot=0 (jamu akan isi nanti via UI)
      await conn.query(
        `INSERT IGNORE INTO mapping_ik_cpl (id_ik, id_cpl, bobot_persen) VALUES (?, ?, 0)`,
        [idIk, idCpl]
      )
      ikMappingCount++
    }
    log.ok(`Total IK ter-insert: ${ikInsertedCount}`)
    log.ok(`Total mapping_ik_cpl: ${ikMappingCount} (semua bobot=0, jamu akan isi)`)

    await conn.commit()
    log.ok('✅ Seed 1 selesai. Commit transaksi.')
  } catch (err) {
    await conn.rollback()
    log.err(`Seed 1 gagal: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  } finally {
    conn.release()
    await db.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })