import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/db'

// Buka di browser: http://localhost:3000/api/health/db
export async function GET() {
  const result: Record<string, unknown> = {
    connected: false,
    database: process.env.DB_NAME ?? '(DB_NAME belum diset)',
    host: process.env.DB_HOST ?? '(DB_HOST belum diset)',
    tables: {} as Record<string, number | string>,
    error: null as string | null,
  }

  try {
    const db = getDb()

    // 1) Tes koneksi paling dasar
    await db.query('SELECT 1')
    result.connected = true

    // 2) Hitung jumlah baris tabel-tabel kunci
    const tablesToCheck = [
      'kurikulum', 'mata_kuliah', 'cpl', 'indikator_kinerja',
      'cpmk', 'mapping_cpmk_ik', 'mapping_ik_cpl',
    ]
    const tables = result.tables as Record<string, number | string>
    for (const t of tablesToCheck) {
      try {
        const [rows]: any = await db.query(`SELECT COUNT(*) AS c FROM \`${t}\``)
        tables[t] = Number(rows[0].c)
      } catch (e: any) {
        tables[t] = `ERROR: ${e.code || e.message}`
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    result.error = err.code || err.message || String(err)
    return NextResponse.json({ success: false, ...result }, { status: 500 })
  }
}