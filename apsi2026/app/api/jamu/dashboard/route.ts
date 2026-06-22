import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireRole, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { getObeDashboardData } from '@/app/lib/obeDashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['jamu'])
    const url = new URL(req.url)
    const admin = createSupabaseAdminClient()
    const data = await getObeDashboardData(admin, {
      ta: url.searchParams.get('ta') ?? undefined,
      sem: url.searchParams.get('sem') ?? undefined,
      kur: url.searchParams.get('kur') ?? undefined,
      angkatan: url.searchParams.get('angkatan') ?? undefined,
      cpl: url.searchParams.get('cpl') ?? undefined,
      mk: url.searchParams.get('mk') ?? undefined,
    })

    const [{ count: recommendations }, { count: wordingPending }] = await Promise.all([
      admin.from('rekomendasi_mutu').select('id_rekomendasi', { count: 'exact', head: true }).neq('status', 'Resolved'),
      admin.from('usulan_wording').select('id_usulan', { count: 'exact', head: true }).eq('status', 'Pending'),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        mutu: {
          rekomendasi_aktif: recommendations ?? 0,
          wording_pending: wordingPending ?? 0,
          kualitas_asesmen: data.stats.mk_belum_upload === 0 ? 100 : Math.max(0, 100 - data.stats.mk_belum_upload * 10),
        },
      },
    })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[GET /api/jamu/dashboard]', err)
    return serverError('Gagal memuat dashboard Jamu.')
  }
}
