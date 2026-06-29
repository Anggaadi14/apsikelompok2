import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireRole, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { resolveDashboardKurikulum } from '@/app/lib/obeDashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['kaprodi'])
    const admin = createSupabaseAdminClient()
    const idKurikulum = await resolveDashboardKurikulum(admin)

    const query = admin
      .from('cpl')
      .select('id_cpl, kode_cpl, singkatan, target_minimal, urutan')
      .order('urutan')
    const { data, error } = idKurikulum ? await query.eq('id_kurikulum', idKurikulum) : await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err) {
    const a = handleAuthError(err)
    if (a) return a
    console.error('[GET /api/kaprodi/cpl-target]', err)
    return serverError('Gagal memuat data CPL.')
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(req, ['kaprodi'])
    const body = await req.json().catch(() => ({}))
    const updates = body.updates

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, message: 'updates harus berisi minimal satu item.' }, { status: 400 })
    }

    for (const item of updates) {
      const idCpl = Number(item.id_cpl)
      const target = Number(item.target_minimal)
      if (!Number.isInteger(idCpl) || idCpl <= 0) {
        return NextResponse.json({ success: false, message: `id_cpl tidak valid: ${item.id_cpl}` }, { status: 400 })
      }
      if (isNaN(target) || target < 0 || target > 100) {
        return NextResponse.json({ success: false, message: `Target harus antara 0–100 (id_cpl: ${idCpl})` }, { status: 400 })
      }
    }

    const admin = createSupabaseAdminClient()
    const idKurikulum = await resolveDashboardKurikulum(admin)

    for (const item of updates) {
      const q = admin
        .from('cpl')
        .update({ target_minimal: Number(item.target_minimal) })
        .eq('id_cpl', Number(item.id_cpl))
      const { error } = idKurikulum ? await q.eq('id_kurikulum', idKurikulum) : await q
      if (error) throw error
    }

    return NextResponse.json({ success: true, message: 'Target OBE berhasil diperbarui.' })
  } catch (err) {
    const a = handleAuthError(err)
    if (a) return a
    console.error('[PATCH /api/kaprodi/cpl-target]', err)
    return serverError('Gagal menyimpan target OBE.')
  }
}
