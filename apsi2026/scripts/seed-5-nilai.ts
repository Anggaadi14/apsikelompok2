import 'dotenv/config'
import * as path from 'path'
import * as fs from 'fs'
import { getDb } from '../app/lib/db'
import {
  readSheetAsMatrix,
  cleanStr,
  upsertGetId,
  reportBermasalah,
  DATA_DIR,
  log,
} from '../app/lib/seedHelpers'

const NILAI_DIR = path.join(DATA_DIR, 'data_mhs_nilai')

// Mapping kode media → nama yang standar
const MEDIA_NAMES: Record<string, string> = {
  UK1: 'Tugas',
  UK2: 'UTS',
  UK3: 'UAS',
  UK4: 'Partisipatif (CM)',
  UK5: 'Hasil Proyek (TBP)',
}

async function processFile(conn: any, filePath: string) {
  const fileName = path.basename(filePath)
  log.info(`Processing ${fileName}...`)

  // Parse nama file: {KODE_MK}_{TAHUN}_{SEMESTER}_{KELAS}.xlsx
  const baseName = fileName.replace(/\.xlsx$/i, '')
  const parts = baseName.split('_')
  if (parts.length < 4) {
    log.warn(`Format nama file tidak dikenali: ${fileName}`)
    return
  }
  const kodeMkFromName = parts[0]
  const tahunFromName = parts[1]
  const semesterFromName = parts[2] as 'Ganjil' | 'Genap'
  const kelasFromName = parts.slice(3).join('_').toUpperCase()

  const matrix = readSheetAsMatrix(filePath)

  // Row 4-10 (0-indexed 3-9): metadata kursus
  // Row 11 (idx 10): token SIAKAD
  // Row 12-13 (idx 11-12): header
  // Row 14 (idx 13): bobot media
  // Row 15+ (idx 14+): data mahasiswa
  const tokenRow = matrix[10] ?? []
  const tokenSiakad = cleanStr(tokenRow.find((c: any) => c && String(c).length > 30) ?? '')

  const headerRow = matrix[12] ?? matrix[11] ?? []
  const bobotRow = matrix[13] ?? []

  // Cari kolom NIM, Mahasiswa, UK1..UK5
  // Header bisa di row 11 atau 12. Coba detect.
  let nimColIdx = -1
  let namaColIdx = -1
  const ukColIdx: Record<string, number> = {}

  // Cari header di range row 11-13
  for (let tryRow = 11; tryRow <= 13; tryRow++) {
    const r = matrix[tryRow] ?? []
    for (let i = 0; i < r.length; i++) {
      const cell = cleanStr(r[i]).toUpperCase()
      if (cell === 'NIM' && nimColIdx === -1) nimColIdx = i
      if ((cell === 'MAHASISWA' || cell === 'NAMA') && namaColIdx === -1) namaColIdx = i
      for (const uk of ['UK1', 'UK2', 'UK3', 'UK4', 'UK5']) {
        if (cell.startsWith(uk) && !(uk in ukColIdx)) ukColIdx[uk] = i
      }
    }
    if (nimColIdx >= 0 && Object.keys(ukColIdx).length > 0) break
  }

  if (nimColIdx < 0) {
    log.warn(`Tidak ditemukan kolom NIM di ${fileName}, skip`)
    return
  }

  // Lookup MK
  const [mkRows] = await conn.query(`SELECT id_mata_kuliah FROM mata_kuliah WHERE kode_mk = ? LIMIT 1`, [kodeMkFromName])
  if (mkRows.length === 0) {
    await reportBermasalah(conn, 'kode_mk_tidak_terdaftar', 'mata_kuliah', kodeMkFromName,
      { fileName, reason: 'Kode MK di nama file tidak match mata_kuliah' })
    return
  }
  const idMk = mkRows[0].id_mata_kuliah as number

  // Convert tahun: 2024 → '2024/2025'
  const tahun = parseInt(tahunFromName, 10)
  const tahunAkademik = `${tahun}/${tahun + 1}`

  // Lookup id_kelas
  const [kelasRows] = await conn.query(
    `SELECT id_kelas FROM kelas_mk WHERE id_mata_kuliah=? AND tahun_akademik=? AND semester=? AND kode_kelas=? LIMIT 1`,
    [idMk, tahunAkademik, semesterFromName, kelasFromName]
  )
  let idKelas: number
  if (kelasRows.length === 0) {
    // Auto-create kelas
    const [kurRows] = await conn.query(`SELECT id_kurikulum FROM kurikulum WHERE kode='K24' LIMIT 1`)
    const idKurikulum = kurRows[0].id_kurikulum
    const [insResult] = await conn.query(
      `INSERT INTO kelas_mk (id_mata_kuliah, id_kurikulum, tahun_akademik, semester, kode_kelas)
       VALUES (?, ?, ?, ?, ?)`,
      [idMk, idKurikulum, tahunAkademik, semesterFromName, kelasFromName]
    )
    idKelas = (insResult as any).insertId
    log.warn(`Auto-create kelas: ${kodeMkFromName} ${tahunAkademik} ${semesterFromName} ${kelasFromName} → id=${idKelas}`)
  } else {
    idKelas = kelasRows[0].id_kelas
  }

  // Create upload_log_nilai
  const [logResult] = await conn.query(
    `INSERT INTO upload_log_nilai (id_kelas, nama_file, token_siakad, token_valid, status)
     VALUES (?, ?, ?, ?, 'processing')`,
    [idKelas, fileName, tokenSiakad || null, tokenSiakad ? 1 : null]
  )
  const idLog = (logResult as any).insertId

  // Insert komponen_nilai dgn bobot dari row 14
  const idKomponenMap: Record<string, number> = {}
  let urutan = 1
  for (const uk of ['UK1', 'UK2', 'UK3', 'UK4', 'UK5']) {
    const colIdx = ukColIdx[uk]
    if (colIdx === undefined) continue
    const bobotRaw = bobotRow[colIdx]
    const bobot = bobotRaw === null || bobotRaw === '' ? 0 : Number(bobotRaw)
    if (isNaN(bobot)) continue

    const idKomponen = await upsertGetId(
      conn,
      'komponen_nilai',
      { id_mata_kuliah: idMk, kode_media: uk },
      {
        id_mata_kuliah: idMk,
        kode_media: uk,
        nama_media: MEDIA_NAMES[uk],
        bobot_terhadap_mk: bobot,
        urutan,
      },
      'id_komponen'
    )
    idKomponenMap[uk] = idKomponen
    urutan++
  }

  // Insert data mahasiswa & nilai
  let countMhs = 0
  let countNilai = 0
  let countFail = 0

  for (let i = 14; i < matrix.length; i++) {
    const row = matrix[i] ?? []
    const nim = cleanStr(row[nimColIdx])
    if (!nim || !/^I\d{7}$/.test(nim)) continue  // skip baris tidak valid

    const nama = namaColIdx >= 0 ? cleanStr(row[namaColIdx]) : ''

    // Resolve/create mahasiswa
    const [mhsRows] = await conn.query(`SELECT id_mahasiswa FROM mahasiswa WHERE nim=? LIMIT 1`, [nim])
    let idMhs: number
    if (mhsRows.length === 0) {
      // Auto-create dgn placeholder email
      const angkatan = parseInt(nim.substring(1, 5), 10)
      const placeholderEmail = `${nim.toLowerCase()}@placeholder.sicpl.local`
      const [insMhs] = await conn.query(
        `INSERT INTO mahasiswa (nim, nama, email_sso, sandi_hash, angkatan, status_akun)
         VALUES (?, ?, ?, '', ?, 'aktif')`,
        [nim, nama || `Mahasiswa ${nim}`, placeholderEmail, isNaN(angkatan) ? 2023 : angkatan]
      )
      idMhs = (insMhs as any).insertId
      countMhs++
    } else {
      idMhs = mhsRows[0].id_mahasiswa
    }

    // Enroll ke kelas
    await conn.query(
      `INSERT IGNORE INTO mahasiswa_kelas (id_kelas, id_mahasiswa) VALUES (?, ?)`,
      [idKelas, idMhs]
    )

    // Insert nilai per UK
    for (const uk of ['UK1', 'UK2', 'UK3', 'UK4', 'UK5']) {
      const colIdx = ukColIdx[uk]
      const idKomponen = idKomponenMap[uk]
      if (colIdx === undefined || !idKomponen) continue

      const nilaiRaw = row[colIdx]
      if (nilaiRaw === null || nilaiRaw === '' || nilaiRaw === undefined) continue
      const nilai = Number(nilaiRaw)
      if (isNaN(nilai)) continue

      try {
        await conn.query(
          `INSERT INTO nilai_detail (id_mahasiswa, id_komponen, id_kelas, nilai_asli)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE nilai_asli = VALUES(nilai_asli)`,
          [idMhs, idKomponen, idKelas, nilai]
        )
        countNilai++
      } catch (e) {
        countFail++
      }
    }
  }

  // Update upload_log
  await conn.query(
    `UPDATE upload_log_nilai SET status='success', jumlah_berhasil=?, jumlah_gagal=? WHERE id=?`,
    [countNilai, countFail, idLog]
  )

  log.ok(`  ${fileName}: ${countMhs} mhs baru, ${countNilai} nilai, ${countFail} gagal`)
}

async function main() {
  log.step('SEED 5: komponen_nilai + mahasiswa_kelas + nilai_detail (dari 11 file SIAKAD)')

  if (!fs.existsSync(NILAI_DIR)) {
    log.err(`Folder ${NILAI_DIR} tidak ada. Extract file ZIP ke folder tersebut dulu.`)
    process.exit(1)
  }

  const files = fs.readdirSync(NILAI_DIR).filter(f => f.endsWith('.xlsx') && !f.startsWith('~'))
  log.info(`Found ${files.length} file nilai`)

  const db = getDb()
  const conn = await db.getConnection()

  try {
    for (const f of files) {
      await conn.beginTransaction()
      try {
        await processFile(conn, path.join(NILAI_DIR, f))
        await conn.commit()
      } catch (e) {
        await conn.rollback()
        log.err(`File ${f} gagal: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    log.ok('✅ Seed 5 selesai.')
  } finally {
    conn.release()
    await db.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })