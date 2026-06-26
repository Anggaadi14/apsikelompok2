import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { handleAuthError, requireRole, serverError } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_DOMAINS = ['Pengetahuan', 'Keterampilan Khusus', 'Keterampilan Umum', 'Sikap']

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin'])
    const { id } = await ctx.params
    const id_cpl = Number(id)
    if (!Number.isInteger(id_cpl) || id_cpl <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpl tidak valid.' }, { status: 400 })
    }
    const body = await req.json().catch(() => ({}))

    const patch: Record<string, unknown> = {}

    if (body.kode_cpl !== undefined) {
      const v = String(body.kode_cpl || '').trim()
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Kode CPL wajib diisi.' }, { status: 400 })
      patch.kode_cpl = v
    }
    if (body.singkatan !== undefined) {
      const v = String(body.singkatan || '').trim()
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Singkatan wajib diisi.' }, { status: 400 })
      patch.singkatan = v
    }
    if (body.domain !== undefined) {
      const v = String(body.domain).trim()
      if (!VALID_DOMAINS.includes(v)) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Domain tidak valid.' }, { status: 400 })
      patch.domain = v
    }
    if (body.deskripsi_id !== undefined) {
      const v = String(body.deskripsi_id || '').trim()
      if (!v) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Deskripsi Indonesia wajib diisi.' }, { status: 400 })
      patch.deskripsi_id = v
    }
    if (body.deskripsi_en !== undefined) {
      patch.deskripsi_en = body.deskripsi_en === null || body.deskripsi_en === '' ? null : String(body.deskripsi_en).trim()
    }
    if (body.urutan !== undefined) {
      patch.urutan = Number(body.urutan) || 0
    }
    if (body.id_kurikulum !== undefined) {
      const v = Number(body.id_kurikulum)
      if (!Number.isInteger(v) || v <= 0) return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_kurikulum tidak valid.' }, { status: 400 })
      patch.id_kurikulum = v
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: 'NOTHING_TO_UPDATE', message: 'Tidak ada perubahan.' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const { error } = await admin.from('cpl').update(patch).eq('id_cpl', id_cpl)
    if (error) {
      const msg = error.code === '23505' ? 'Kode CPL sudah ada di kurikulum ini.' : error.message
      return NextResponse.json({ success: false, error: 'CONFLICT', message: msg }, { status: 409 })
    }
    return NextResponse.json({ success: true, message: 'CPL berhasil diperbarui.' })
  } catch (err) {
    const a = handleAuthError(err); if (a) return a
    console.error('[PATCH /api/admin/cpl/:id]', err)
    return serverError('Gagal update CPL.')
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin'])
    const { id } = await ctx.params
    const id_cpl = Number(id)
    if (!Number.isInteger(id_cpl) || id_cpl <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_cpl tidak valid.' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    const { count: cntIk } = await admin
      .from('indikator_kinerja')
      .select('id_ik', { count: 'exact', head: true })
      .eq('id_cpl', id_cpl)

    if ((cntIk ?? 0) > 0) {
      return NextResponse.json({
        success: false, error: 'HAS_REFS',
        message: `CPL masih memiliki ${cntIk} Indikator Kinerja. Hapus IK terlebih dulu sebelum menghapus CPL.`,
      }, { status: 409 })
    }

    const { error } = await admin.from('cpl').delete().eq('id_cpl', id_cpl)
    if (error) throw error
    return NextResponse.json({ success: true, message: 'CPL berhasil dihapus.' })
  } catch (err) {
    const a = handleAuthError(err); if (a) return a
    console.error('[DELETE /api/admin/cpl/:id]', err)
    return serverError('Gagal hapus CPL.')
  }
}
