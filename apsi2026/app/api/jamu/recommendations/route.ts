import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireRole, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RecommendationStatus = 'Draft' | 'Sent' | 'Resolved'

function bad(message: string) {
  return NextResponse.json({ success: false, error: 'BAD_REQUEST', message }, { status: 400 })
}

async function nextCode(admin: ReturnType<typeof createSupabaseAdminClient>) {
  // Based on the highest numeric suffix ever assigned, not the current row
  // count — a COUNT(*)+1 scheme collides with an existing code as soon as
  // any row is deleted (e.g. REC-001 deleted -> count back to 0 -> the next
  // insert is also generated as "REC-001", duplicating an in-use code).
  const { data } = await admin
    .from('rekomendasi_mutu')
    .select('kode_rekomendasi')
    .order('id_rekomendasi', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastNum = data?.kode_rekomendasi ? Number(data.kode_rekomendasi.split('-')[1]) || 0 : 0
  return `REC-${String(lastNum + 1).padStart(3, '0')}`
}

type RecommendationRow = {
  id_rekomendasi: number
  kode_rekomendasi: string
  cpl_label: string
  rekomendasi: string
  target_role: 'dosen' | 'kaprodi'
  status: RecommendationStatus
  tanggal: string
}

function mapRow(row: RecommendationRow) {
  return {
    id: row.kode_rekomendasi,
    id_rekomendasi: row.id_rekomendasi,
    cpl: row.cpl_label,
    rekomendasi: row.rekomendasi,
    targetRole: row.target_role,
    status: row.status,
    tanggal: row.tanggal,
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['jamu'])
    const admin = createSupabaseAdminClient()

    const { data, error } = await admin
      .from('rekomendasi_mutu')
      .select('id_rekomendasi, kode_rekomendasi, cpl_label, rekomendasi, target_role, status, tanggal')
      .order('tanggal', { ascending: false })
      .order('id_rekomendasi', { ascending: false })
    if (error) throw error

    const { data: cpls } = await admin
      .from('cpl')
      .select('id_cpl, kode_cpl, singkatan, deskripsi_id, urutan')
      .order('urutan')

    return NextResponse.json({
      success: true,
      data: {
        items: (data ?? []).map(mapRow),
        cplOptions: (cpls ?? []).map((c) => ({
          value: String(c.id_cpl),
          label: `${c.kode_cpl.toUpperCase().startsWith('CPL') ? c.kode_cpl : `CPL-${c.kode_cpl}`} (${c.singkatan || c.deskripsi_id.slice(0, 40)})`,
        })),
      },
    })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[GET /api/jamu/recommendations]', err)
    return serverError('Gagal memuat rekomendasi mutu.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ['jamu'])
    const body = await req.json().catch(() => ({}))
    const rekomendasi = String(body.rekomendasi ?? '').trim()
    const targetRole = String(body.targetRole ?? 'dosen')
    const idCpl = Number(body.id_cpl)
    let cplLabel = String(body.cpl ?? '').trim()

    if (!rekomendasi) return bad('Rekomendasi wajib diisi.')
    if (!['dosen', 'kaprodi'].includes(targetRole)) return bad('Target rekomendasi tidak valid.')

    const admin = createSupabaseAdminClient()
    if (Number.isInteger(idCpl) && idCpl > 0) {
      const { data: cpl } = await admin.from('cpl').select('kode_cpl, singkatan').eq('id_cpl', idCpl).maybeSingle()
      if (cpl) cplLabel = `${cpl.kode_cpl.toUpperCase().startsWith('CPL') ? cpl.kode_cpl : `CPL-${cpl.kode_cpl}`} (${cpl.singkatan})`
    }
    if (!cplLabel) return bad('CPL terkait wajib dipilih.')

    const { data, error } = await admin
      .from('rekomendasi_mutu')
      .insert({
        kode_rekomendasi: await nextCode(admin),
        id_cpl: Number.isInteger(idCpl) && idCpl > 0 ? idCpl : null,
        cpl_label: cplLabel,
        rekomendasi,
        target_role: targetRole,
        status: 'Draft',
        dibuat_oleh_user: session.id_user,
      })
      .select('id_rekomendasi, kode_rekomendasi, cpl_label, rekomendasi, target_role, status, tanggal')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: mapRow(data) })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[POST /api/jamu/recommendations]', err)
    return serverError('Gagal menyimpan rekomendasi mutu.')
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(req, ['jamu'])
    const body = await req.json().catch(() => ({}))
    const id = Number(body.id_rekomendasi)
    const status = String(body.status ?? '') as RecommendationStatus
    if (!Number.isInteger(id) || id <= 0) return bad('ID rekomendasi tidak valid.')
    if (!['Draft', 'Sent', 'Resolved'].includes(status)) return bad('Status tidak valid.')

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('rekomendasi_mutu')
      .update({ status })
      .eq('id_rekomendasi', id)
      .select('id_rekomendasi, kode_rekomendasi, cpl_label, rekomendasi, target_role, status, tanggal')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: mapRow(data) })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[PUT /api/jamu/recommendations]', err)
    return serverError('Gagal memperbarui rekomendasi mutu.')
  }
}
