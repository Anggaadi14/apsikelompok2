// C:\Users\alyss\apsikelompok2\apsi2026\app\lib\obeValidation.ts

import { getDb } from '@/app/lib/db'
import type { RowDataPacket } from 'mysql2'

const BOBOT_TOLERANCE = 0.01  // toleransi floating-point untuk perbandingan Σ ≈ 100

export type ValidationResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
  detail?: {
    totalBobot?: number
    selisih?: number
    rows?: Array<{ id: number; bobot: number; label?: string }>
  }
}

export type ProposedBobotIK = { idIk: number; bobotPersen: number }
export type ProposedBobotCPMK = { idCpmk: number; bobotPersen: number }
export type ProposedBobotMediaCPMK = { idKomponen: number; idCpmk: number; bobotPersen: number }
export type ProposedBobotMediaMK = { idKomponen: number; bobotPersen: number }

// ============================================================================
// 1. Validasi bobot IK → CPL (Σ per CPL harus = 100%)
// ============================================================================
export async function validateBobotIkCpl(
  idCpl: number,
  proposed?: ProposedBobotIK[]
): Promise<ValidationResult> {
  const db = getDb()
  const errors: string[] = []
  const warnings: string[] = []

  let rows: Array<{ id_ik: number; bobot_persen: number; kode_ik?: string }>
  if (proposed) {
    rows = proposed.map(b => ({ id_ik: b.idIk, bobot_persen: b.bobotPersen }))
  } else {
    const [data] = await db.query<RowDataPacket[]>(
      `SELECT mic.id_ik, mic.bobot_persen, ik.kode_ik
       FROM mapping_ik_cpl mic
       JOIN indikator_kinerja ik ON ik.id_ik = mic.id_ik
       WHERE mic.id_cpl = ?`,
      [idCpl]
    )
    rows = data as any
  }

  if (rows.length === 0) {
    errors.push(`CPL ini belum punya Indikator Kinerja yang ter-mapping. Tambahkan minimal 1 IK terlebih dulu.`)
    return { ok: false, errors, warnings }
  }

  let totalBobot = 0
  rows.forEach(r => {
    const b = Number(r.bobot_persen)
    totalBobot += b
    if (b < 0 || b > 100) {
      errors.push(`Bobot IK ${r.kode_ik ?? `id=${r.id_ik}`} tidak valid (${b}%). Harus antara 0–100.`)
    }
  })

  const selisih = totalBobot - 100
  if (Math.abs(selisih) > BOBOT_TOLERANCE) {
    errors.push(
      `Total bobot IK → CPL = ${totalBobot.toFixed(3)}%, harus tepat 100%. ` +
      `Selisih ${selisih > 0 ? '+' : ''}${selisih.toFixed(3)}%.`
    )
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    detail: {
      totalBobot,
      selisih,
      rows: rows.map(r => ({ id: r.id_ik, bobot: Number(r.bobot_persen), label: r.kode_ik })),
    },
  }
}

// ============================================================================
// 2. Validasi bobot CPMK → IK (Σ per IK harus = 100%)
// ============================================================================
export async function validateBobotCpmkIk(
  idIk: number,
  proposed?: ProposedBobotCPMK[]
): Promise<ValidationResult> {
  const db = getDb()
  const errors: string[] = []
  const warnings: string[] = []

  let rows: Array<{ id_cpmk: number; bobot_persen: number; kode_cpmk?: string }>
  if (proposed) {
    rows = proposed.map(b => ({ id_cpmk: b.idCpmk, bobot_persen: b.bobotPersen }))
  } else {
    const [data] = await db.query<RowDataPacket[]>(
      `SELECT mci.id_cpmk, mci.bobot_persen, c.kode_cpmk
       FROM mapping_cpmk_ik mci
       JOIN cpmk c ON c.id_cpmk = mci.id_cpmk
       WHERE mci.id_ik = ?`,
      [idIk]
    )
    rows = data as any
  }

  if (rows.length === 0) {
    errors.push(`IK ini belum punya CPMK yang ter-mapping. Tambahkan minimal 1 CPMK terlebih dulu.`)
    return { ok: false, errors, warnings }
  }

  let totalBobot = 0
  rows.forEach(r => {
    const b = Number(r.bobot_persen)
    totalBobot += b
    if (b < 0 || b > 100) {
      errors.push(`Bobot CPMK ${r.kode_cpmk ?? `id=${r.id_cpmk}`} tidak valid (${b}%). Harus antara 0–100.`)
    }
  })

  const selisih = totalBobot - 100
  if (Math.abs(selisih) > BOBOT_TOLERANCE) {
    errors.push(
      `Total bobot CPMK → IK = ${totalBobot.toFixed(3)}%, harus tepat 100%. ` +
      `Selisih ${selisih > 0 ? '+' : ''}${selisih.toFixed(3)}%.`
    )
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    detail: {
      totalBobot,
      selisih,
      rows: rows.map(r => ({ id: r.id_cpmk, bobot: Number(r.bobot_persen), label: r.kode_cpmk })),
    },
  }
}

// ============================================================================
// 3. Validasi bobot media → MK (Σ komponen_nilai.bobot_terhadap_mk per MK = 100%)
// ============================================================================
export async function validateBobotMediaMk(
  idMataKuliah: number,
  proposed?: ProposedBobotMediaMK[]
): Promise<ValidationResult> {
  const db = getDb()
  const errors: string[] = []
  const warnings: string[] = []

  let rows: Array<{ id_komponen: number; bobot_terhadap_mk: number; kode_media?: string }>
  if (proposed) {
    rows = proposed.map(b => ({ id_komponen: b.idKomponen, bobot_terhadap_mk: b.bobotPersen }))
  } else {
    const [data] = await db.query<RowDataPacket[]>(
      `SELECT id_komponen, bobot_terhadap_mk, kode_media
       FROM komponen_nilai WHERE id_mata_kuliah = ?`,
      [idMataKuliah]
    )
    rows = data as any
  }

  if (rows.length === 0) {
    warnings.push(`Mata kuliah ini belum punya komponen nilai (UK1-UK5). Dosen perlu setup terlebih dulu.`)
    return { ok: false, errors, warnings }
  }

  let totalBobot = 0
  rows.forEach(r => {
    const b = Number(r.bobot_terhadap_mk)
    totalBobot += b
    if (b < 0 || b > 100) {
      errors.push(`Bobot media ${r.kode_media ?? `id=${r.id_komponen}`} tidak valid (${b}%). Harus antara 0–100.`)
    }
  })

  const selisih = totalBobot - 100
  if (Math.abs(selisih) > BOBOT_TOLERANCE) {
    errors.push(
      `Total bobot komponen nilai per MK = ${totalBobot.toFixed(3)}%, harus tepat 100%. ` +
      `Selisih ${selisih > 0 ? '+' : ''}${selisih.toFixed(3)}%.`
    )
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    detail: {
      totalBobot,
      selisih,
      rows: rows.map(r => ({ id: r.id_komponen, bobot: Number(r.bobot_terhadap_mk), label: r.kode_media })),
    },
  }
}

// ============================================================================
// 4. Validasi range bobot media → CPMK (0–100, tidak harus Σ=100 karena 1 media
//    bisa kontribusi parsial ke beberapa CPMK)
// ============================================================================
export async function validateBobotMediaCpmk(
  proposed: ProposedBobotMediaCPMK[]
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  proposed.forEach(p => {
    if (p.bobotPersen < 0 || p.bobotPersen > 100) {
      errors.push(`Bobot media→CPMK (komponen=${p.idKomponen}, cpmk=${p.idCpmk}) tidak valid (${p.bobotPersen}%). Harus 0–100.`)
    }
  })

  if (proposed.length === 0) {
    warnings.push(`Belum ada relasi media → CPMK yang di-input.`)
  }

  return { ok: errors.length === 0, errors, warnings }
}

// ============================================================================
// 5. Comprehensive completeness check untuk 1 mata kuliah
//    Dipanggil sebelum dosen upload nilai untuk decide: simpan vs queue ke data_bermasalah
// ============================================================================
export type MappingCompletenessReport = {
  ok: boolean
  idMataKuliah: number
  missing: Array<{
    jenis:
      | 'cpmk_tidak_ada'
      | 'mapping_cpmk_ik_tidak_lengkap'
      | 'mapping_ik_cpl_tidak_lengkap'
      | 'komponen_nilai_tidak_ada'
      | 'mapping_media_cpmk_kosong'
      | 'bobot_total_tidak_100'
    detail: string
  }>
}

export async function checkMappingCompleteness(idMataKuliah: number): Promise<MappingCompletenessReport> {
  const db = getDb()
  const missing: MappingCompletenessReport['missing'] = []

  // 1. MK punya CPMK?
  const [cpmkRows] = await db.query<RowDataPacket[]>(
    `SELECT id_cpmk FROM cpmk WHERE id_mata_kuliah = ?`,
    [idMataKuliah]
  )
  if (cpmkRows.length === 0) {
    missing.push({ jenis: 'cpmk_tidak_ada', detail: `MK id=${idMataKuliah} belum punya CPMK.` })
    return { ok: false, idMataKuliah, missing }
  }
  const cpmkIds = cpmkRows.map((r: any) => r.id_cpmk)

  // 2. Semua CPMK punya mapping ke IK?
  for (const idCpmk of cpmkIds) {
    const [mci] = await db.query<RowDataPacket[]>(
      `SELECT id_ik FROM mapping_cpmk_ik WHERE id_cpmk = ?`,
      [idCpmk]
    )
    if (mci.length === 0) {
      missing.push({
        jenis: 'mapping_cpmk_ik_tidak_lengkap',
        detail: `CPMK id=${idCpmk} belum di-mapping ke IK mana pun.`,
      })
    }
  }

  // 3. Setiap IK yg terhubung — total bobot CPMK → IK harus 100%
  const [ikRows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT mci.id_ik
     FROM mapping_cpmk_ik mci
     WHERE mci.id_cpmk IN (?)`,
    [cpmkIds]
  )
  for (const r of ikRows as any[]) {
    const result = await validateBobotCpmkIk(r.id_ik)
    if (!result.ok) {
      missing.push({
        jenis: 'mapping_cpmk_ik_tidak_lengkap',
        detail: `IK id=${r.id_ik}: ${result.errors.join('; ')}`,
      })
    }
  }

  // 4. Setiap CPL yg terhubung — total bobot IK → CPL harus 100%
  const [cplRows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT ik.id_cpl
     FROM indikator_kinerja ik
     JOIN mapping_cpmk_ik mci ON mci.id_ik = ik.id_ik
     WHERE mci.id_cpmk IN (?)`,
    [cpmkIds]
  )
  for (const r of cplRows as any[]) {
    const result = await validateBobotIkCpl(r.id_cpl)
    if (!result.ok) {
      missing.push({
        jenis: 'mapping_ik_cpl_tidak_lengkap',
        detail: `CPL id=${r.id_cpl}: ${result.errors.join('; ')}`,
      })
    }
  }

  // 5. MK punya komponen_nilai? (UK1-UK5)
  const [knRows] = await db.query<RowDataPacket[]>(
    `SELECT id_komponen FROM komponen_nilai WHERE id_mata_kuliah = ?`,
    [idMataKuliah]
  )
  if (knRows.length === 0) {
    missing.push({
      jenis: 'komponen_nilai_tidak_ada',
      detail: `MK id=${idMataKuliah} belum punya komponen nilai (UK1-UK5).`,
    })
  } else {
    // 5a. Σ bobot_terhadap_mk = 100?
    const mkResult = await validateBobotMediaMk(idMataKuliah)
    if (!mkResult.ok) {
      missing.push({
        jenis: 'bobot_total_tidak_100',
        detail: `Bobot komponen MK tidak 100%: ${mkResult.errors.join('; ')}`,
      })
    }

    // 5b. Setiap komponen punya minimal 1 mapping_media_cpmk?
    for (const r of knRows as any[]) {
      const [mmc] = await db.query<RowDataPacket[]>(
        `SELECT id_cpmk FROM mapping_media_cpmk WHERE id_komponen = ?`,
        [r.id_komponen]
      )
      if (mmc.length === 0) {
        missing.push({
          jenis: 'mapping_media_cpmk_kosong',
          detail: `Komponen nilai id=${r.id_komponen} belum di-mapping ke CPMK mana pun.`,
        })
      }
    }
  }

  return {
    ok: missing.length === 0,
    idMataKuliah,
    missing,
  }
}

// ============================================================================
// 6. Helper: report ke tabel data_bermasalah
// ============================================================================
export async function reportToDataBermasalah(
  jenis:
    | 'mapping_ik_cpl_tidak_lengkap'
    | 'mapping_cpmk_ik_tidak_lengkap'
    | 'mapping_media_cpmk_kosong'
    | 'nim_tidak_terdaftar'
    | 'kode_mk_tidak_terdaftar'
    | 'kelas_tidak_ditemukan'
    | 'mhs_tidak_terdaftar_di_kelas'
    | 'bobot_total_tidak_100',
  refTable: string | null,
  refId: string | null,
  detail: unknown
): Promise<number> {
  const db = getDb()
  const [result] = await db.query<any>(
    `INSERT INTO data_bermasalah (jenis_masalah, ref_table, ref_id, detail) VALUES (?, ?, ?, ?)`,
    [jenis, refTable, refId, JSON.stringify(detail)]
  )
  return result.insertId as number
}