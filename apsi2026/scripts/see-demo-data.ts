/**
 * Idempotent — aman dijalankan berulang.
 *
 * Yang di-seed:
 *  - 1 MK demo (kalau tabel mata_kuliah kosong)
 *  - 2 CPMK untuk MK tsb
 *  - Mapping CPMK → IK (memakai IK existing dari mapping_ik_cpl)
 *  - 4 komponen_nilai (Tugas/UTS/UAS/Praktikum, sum bobot = 100)
 *  - Mapping komponen → CPMK (sum bobot_media_asesmen per CPMK = 100)
 *  - nilai_detail untuk 4 mahasiswa × 4 komponen (random 55-95)
 *
 * Jalankan: npx tsx scripts/seed-demo-data.ts
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'

const TAHUN = '2024/2025'
const SEMESTER = 'ganjil'

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'db_monitoring_cpl',
  })

  console.log('🌱 Mulai seed demo data...')

  // ── 1. Cari 1 dosen aktif ───────────────────────────────────
  const [dsnRows] = await conn.execute(
    "SELECT id_staff, nama_lengkap FROM staff WHERE peran = 'dosen' AND status_akun = 'aktif' LIMIT 1",
  )
  if ((dsnRows as any[]).length === 0) {
    throw new Error('Tidak ada dosen aktif di tabel staff. Tambahkan dulu via SQL atau login endpoint.')
  }
  const idDosen = (dsnRows as any[])[0].id_staff as number
  console.log(`   👨‍🏫 Dosen: ${(dsnRows as any[])[0].nama_lengkap} (id_staff=${idDosen})`)

  // ── 2. Cari atau buat MK ────────────────────────────────────
  let idMk: number
  const [mkRows] = await conn.execute('SELECT id_mk, kode_mk, nama_mk FROM mata_kuliah LIMIT 1')
  if ((mkRows as any[]).length > 0) {
    idMk = (mkRows as any[])[0].id_mk
    console.log(`   📚 MK: ${(mkRows as any[])[0].kode_mk} - ${(mkRows as any[])[0].nama_mk} (id_mk=${idMk})`)
  } else {
    const [ins] = await conn.execute(
      "INSERT INTO mata_kuliah (kode_mk, nama_mk, sks, sifat_mk, plot_semester) VALUES ('TI001', 'Analisis Sistem Industri', 3, 'wajib', 6)",
    )
    idMk = (ins as any).insertId
    console.log(`   📚 MK dibuat: TI001 - Analisis Sistem Industri (id_mk=${idMk})`)
  }

  // ── 3. Cari atau buat CPMK untuk MK ─────────────────────────
  let cpmkIds: number[] = []
  const [cpmkRows] = await conn.execute('SELECT id_cpmk, kode_cpmk FROM cpmk WHERE id_mk = ? ORDER BY id_cpmk', [idMk])
  cpmkIds = (cpmkRows as any[]).map((r) => r.id_cpmk)
  if (cpmkIds.length === 0) {
    const cpmks = [
      { kode: 'CPMK-1', deskripsi: 'Mampu menganalisis sistem industri kompleks.' },
      { kode: 'CPMK-2', deskripsi: 'Mampu menerapkan metode kuantitatif dalam analisis sistem.' },
    ]
    for (const c of cpmks) {
      let ins: any
      try {
        ;[ins] = await conn.execute(
          'INSERT INTO cpmk (id_mk, kode_cpmk, deskripsi) VALUES (?, ?, ?)',
          [idMk, c.kode, c.deskripsi],
        )
      } catch {
        // Kolom deskripsi mungkin belum ada → coba tanpa
        ;[ins] = await conn.execute('INSERT INTO cpmk (id_mk, kode_cpmk) VALUES (?, ?)', [idMk, c.kode])
      }
      cpmkIds.push(ins.insertId)
    }
    console.log(`   🎯 ${cpmkIds.length} CPMK dibuat`)
  } else {
    console.log(`   🎯 ${cpmkIds.length} CPMK sudah ada`)
  }

  // ── 4. Mapping CPMK → IK (pakai IK existing) ────────────────
  const [ikRows] = await conn.execute('SELECT id_ik FROM mapping_ik_cpl ORDER BY id_ik')
  const ikIds = (ikRows as any[]).map((r) => r.id_ik) as number[]
  if (ikIds.length === 0) {
    console.warn('   ⚠️  mapping_ik_cpl kosong — skip mapping_cpmk_ik')
  } else {
    for (let i = 0; i < cpmkIds.length; i++) {
      const idIk = ikIds[i % ikIds.length]
      // Cek apakah mapping sudah ada
      const [existing] = await conn.execute(
        'SELECT id_map FROM mapping_cpmk_ik WHERE id_cpmk = ? AND id_ik = ?',
        [cpmkIds[i], idIk],
      )
      if ((existing as any[]).length === 0) {
        await conn.execute(
          'INSERT INTO mapping_cpmk_ik (id_cpmk, id_ik, bobot_cpmk_persen) VALUES (?, ?, ?)',
          [cpmkIds[i], idIk, 100],
        )
      }
    }
    console.log(`   🔗 mapping_cpmk_ik diperiksa (${cpmkIds.length} mapping)`)
  }

  // ── 5. Komponen_nilai (sum bobot_non_cpmk = 100) ────────────
  let kompIds: number[] = []
  const [kompRows] = await conn.execute(
    'SELECT id_komponen FROM komponen_nilai WHERE id_mk = ? AND id_staff = ? ORDER BY id_komponen',
    [idMk, idDosen],
  )
  kompIds = (kompRows as any[]).map((r) => r.id_komponen)
  if (kompIds.length === 0) {
    const komps = [
      { nama: 'Tugas', bobot: 20 },
      { nama: 'UTS', bobot: 30 },
      { nama: 'UAS', bobot: 40 },
      { nama: 'Praktikum', bobot: 10 },
    ]
    for (const k of komps) {
      const [ins] = await conn.execute(
        'INSERT INTO komponen_nilai (id_mk, id_staff, nama_komponen, bobot_non_cpmk) VALUES (?, ?, ?, ?)',
        [idMk, idDosen, k.nama, k.bobot],
      )
      kompIds.push((ins as any).insertId)
    }
    console.log(`   📝 ${kompIds.length} komponen_nilai dibuat (sum bobot = 100)`)
  } else {
    console.log(`   📝 ${kompIds.length} komponen_nilai sudah ada`)
  }

  // ── 6. Mapping komponen → CPMK (sum per CPMK = 100) ─────────
  // Strategi: setiap CPMK dibobotkan rata oleh semua komponen
  const perKomp = Math.floor(100 / kompIds.length)
  const sisa = 100 - perKomp * kompIds.length
  for (const idCpmk of cpmkIds) {
    for (let i = 0; i < kompIds.length; i++) {
      const idKomp = kompIds[i]
      const bobot = i === 0 ? perKomp + sisa : perKomp
      const [existing] = await conn.execute(
        'SELECT id_map_komponen FROM mapping_komponen_cpmk WHERE id_komponen = ? AND id_cpmk = ?',
        [idKomp, idCpmk],
      )
      if ((existing as any[]).length === 0) {
        await conn.execute(
          'INSERT INTO mapping_komponen_cpmk (id_komponen, id_cpmk, bobot_media_asesmen) VALUES (?, ?, ?)',
          [idKomp, idCpmk, bobot],
        )
      }
    }
  }
  console.log(`   🔀 mapping_komponen_cpmk diperiksa (${kompIds.length * cpmkIds.length} mapping)`)

  // ── 7. Ambil daftar mahasiswa untuk seed nilai ──────────────
  const [mhsRows] = await conn.execute(
    "SELECT id_mahasiswa, nim, nama_mahasiswa FROM mahasiswa WHERE status_akun = 'aktif' ORDER BY id_mahasiswa LIMIT 4",
  )
  const mhsList = mhsRows as any[]
  if (mhsList.length === 0) {
    throw new Error('Tidak ada mahasiswa aktif. Tambahkan minimal 1 via SQL atau login endpoint.')
  }
  console.log(`   👥 ${mhsList.length} mahasiswa akan di-seed`)

  // ── 8. nilai_detail (random 55-95) ──────────────────────────
  let nilaiInserted = 0
  for (const mhs of mhsList) {
    for (const idKomp of kompIds) {
      const [existing] = await conn.execute(
        `SELECT id_nilai FROM nilai_detail
         WHERE id_mahasiswa = ? AND id_komponen = ? AND tahun_akademik = ? AND semester = ?`,
        [mhs.id_mahasiswa, idKomp, TAHUN, SEMESTER],
      )
      if ((existing as any[]).length === 0) {
        const nilai = Math.floor(55 + Math.random() * 41) // 55..95
        await conn.execute(
          `INSERT INTO nilai_detail
           (id_mahasiswa, id_komponen, nilai_asli, tahun_akademik, semester)
           VALUES (?, ?, ?, ?, ?)`,
          [mhs.id_mahasiswa, idKomp, nilai, TAHUN, SEMESTER],
        )
        nilaiInserted++
      }
    }
  }
  console.log(`   🎲 ${nilaiInserted} nilai_detail baru di-insert`)

  await conn.end()
  console.log('✨ Seed selesai. Coba refresh dashboard mahasiswa — CPL & Riwayat sekarang harus tidak pakai fallback dummy.')
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})