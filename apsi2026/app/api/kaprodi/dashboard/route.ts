import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireRole, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { getObeDashboardData } from '@/app/lib/obeDashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['kaprodi'])
    const url = new URL(req.url)
    const admin = createSupabaseAdminClient()
    const data = await getObeDashboardData(admin, {
      ta: url.searchParams.get('ta') ?? undefined,
      sem: url.searchParams.get('sem') ?? undefined,
      kur: url.searchParams.get('kur') ?? undefined,
      angkatan: url.searchParams.get('angkatan') ?? undefined,
      cpl: url.searchParams.get('cpl') ?? undefined,
      mk: url.searchParams.get('mk') ?? undefined,
      kelas: url.searchParams.get('kelas') ?? undefined,
    })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[GET /api/kaprodi/dashboard]', err)
    return serverError('Gagal memuat dashboard Kaprodi.')
  }
}
