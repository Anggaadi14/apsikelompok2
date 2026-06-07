import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'
import type { PoolConnection } from 'mysql2/promise'

export const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')

// ============================================================================
// XLSX helpers
// ============================================================================

/** Read sheet ke array of object dgn header dari baris pertama */
export function readSheetAsObjects(
  filePath: string,
  sheetName?: string
): Record<string, any>[] {
  const wb = XLSX.readFile(filePath, { cellDates: true })
  const sheet = sheetName ? wb.Sheets[sheetName] : wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error(`Sheet ${sheetName ?? '(first)'} tidak ditemukan di ${filePath}`)
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })
}

/** Read sheet ke array of array (raw matrix, untuk file SIAKAD yang punya layout custom) */
export function readSheetAsMatrix(
  filePath: string,
  sheetName?: string
): any[][] {
  const wb = XLSX.readFile(filePath, { cellDates: true })
  const sheet = sheetName ? wb.Sheets[sheetName] : wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error(`Sheet ${sheetName ?? '(first)'} tidak ditemukan di ${filePath}`)
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][]
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

// ============================================================================
// String helpers
// ============================================================================

export function cleanStr(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v).trim().replace(/\s+/g, ' ')
}

export function nonEmpty(v: any): string | null {
  const s = cleanStr(v)
  return s === '' ? null : s
}

/** Heuristik: ambil singkatan dari nama MK untuk prefix CPMK */
export function deriveSingkatanMK(namaMk: string): string {
  const clean = cleanStr(namaMk).toUpperCase()
  // Special cases (matches dgn data sample)
  const map: Record<string, string> = {
    'MATEMATIKA OPTIMASI': 'MO',
    'MEKANIKA TEKNIK': 'MT',
    'ALGORITMA PEMROGRAMAN': 'APK',
    'KESELAMATAN DAN KESEHATAN KERJA': 'K3',
    'KESELAMATAN KERJA': 'K3',
    'PERANCANGAN MANAJEMEN ORGANISASI': 'PMO',
    'PERENCANAAN DAN PENGENDALIAN PRODUKSI': 'PPP',
    'CAPSTONE II': 'CP2',
    'CAPSTONE I': 'CP1',
    'PENGUKURAN SISTEM KERJA': 'PPSK',
    'EKONOMI TEKNIK': 'EKOTEK',
    'PERANCANGAN FASILITAS': 'PF',
    'SIMULASI SISTEM': 'SS',
    'PSIKOLOGI INDUSTRI': 'PI',
    'PERANCANGAN PRODUK': 'PP',
    'PROSES MANUFAKTUR': 'PM',
  }
  if (map[clean]) return map[clean]

  // Default: ambil huruf pertama tiap kata (max 4 huruf)
  return clean
    .split(/\s+/)
    .filter(w => w.length > 0 && !/^(DAN|DI|KE|YANG|UNTUK|PADA|DENGAN|ATAU|II?|III?|IV)$/.test(w))
    .map(w => w[0])
    .join('')
    .substring(0, 5)
}

/** Parse domain dari singkatan CPL: P=Pengetahuan, KK=Keterampilan Khusus, KU=Keterampilan Umum, S=Sikap */
export function deriveDomain(singkatan: string): 'Pengetahuan' | 'Keterampilan Khusus' | 'Keterampilan Umum' | 'Sikap' {
  const s = cleanStr(singkatan).toUpperCase()
  if (s.startsWith('KK')) return 'Keterampilan Khusus'
  if (s.startsWith('KU')) return 'Keterampilan Umum'
  if (s.startsWith('S')) return 'Sikap'
  return 'Pengetahuan'  // default untuk 'P1', 'P2', dst
}

// ============================================================================
// DB helpers
// ============================================================================

/** Ambil id baris hasil insert (atau yang sudah ada) berdasarkan kunci unik */
export async function upsertGetId(
  conn: PoolConnection,
  table: string,
  uniqueCols: Record<string, any>,
  insertData: Record<string, any>,
  pkCol: string
): Promise<number> {
  // Cek apakah sudah ada
  const whereClause = Object.keys(uniqueCols).map(k => `\`${k}\` = ?`).join(' AND ')
  const whereVals = Object.values(uniqueCols)
  const [existing] = await conn.query<any[]>(
    `SELECT \`${pkCol}\` FROM \`${table}\` WHERE ${whereClause} LIMIT 1`,
    whereVals
  )
  if (existing.length > 0) {
    return existing[0][pkCol] as number
  }
  // Insert baru
  const cols = Object.keys(insertData)
  const placeholders = cols.map(() => '?').join(', ')
  const vals = Object.values(insertData)
  const [result] = await conn.query<any>(
    `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
    vals
  )
  return result.insertId as number
}

export async function reportBermasalah(
  conn: PoolConnection,
  jenis: string,
  refTable: string | null,
  refId: string | null,
  detail: unknown
): Promise<void> {
  await conn.query(
    `INSERT INTO data_bermasalah (jenis_masalah, ref_table, ref_id, detail) VALUES (?, ?, ?, ?)`,
    [jenis, refTable, refId, JSON.stringify(detail)]
  )
}

// ============================================================================
// Logger
// ============================================================================
export const log = {
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  ok:   (msg: string) => console.log(`\x1b[32m[ OK ]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  err:  (msg: string) => console.log(`\x1b[31m[ERR ]\x1b[0m ${msg}`),
  step: (msg: string) => console.log(`\n\x1b[1m\x1b[35m▶ ${msg}\x1b[0m`),
}