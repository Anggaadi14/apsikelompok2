import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

// Buka di browser: http://localhost:3000/api/health/db
export async function GET() {
  const result: Record<string, unknown> = {
    connected: false,
    database: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(NEXT_PUBLIC_SUPABASE_URL belum diset)',
    tables: {} as Record<string, number | string>,
    error: null as string | null,
  }

  try {
    const admin = createSupabaseAdminClient()
    const tables = result.tables as Record<string, number | string>
    const tablesToCheck = ['kurikulum', 'mata_kuliah', 'cpl', 'indikator_kinerja', 'cpmk', 'mapping_cpmk_ik', 'mapping_ik_cpl']

    for (const t of tablesToCheck) {
      const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true })
      tables[t] = error ? `ERROR: ${error.message}` : (count ?? 0)
    }
    result.connected = true

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    result.error = err?.message || String(err)
    return NextResponse.json({ success: false, ...result }, { status: 500 })
  }
}
