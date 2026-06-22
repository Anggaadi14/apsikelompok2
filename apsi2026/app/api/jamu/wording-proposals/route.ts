import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireRole, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ProposalStatus = 'Pending' | 'Approved' | 'Rejected'

function bad(message: string) {
  return NextResponse.json({ success: false, error: 'BAD_REQUEST', message }, { status: 400 })
}

async function nextCode(admin: ReturnType<typeof createSupabaseAdminClient>) {
  // See app/api/jamu/recommendations/route.ts nextCode() for why this can't
  // be COUNT(*)+1 — it collides with an existing code after any row delete.
  const { data } = await admin
    .from('usulan_wording')
    .select('kode_usulan')
    .order('id_usulan', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastNum = data?.kode_usulan ? Number(data.kode_usulan.split('-')[1]) || 0 : 0
  return `WPR-${String(lastNum + 1).padStart(3, '0')}`
}

type WordingProposalRow = {
  id_usulan: number
  kode_usulan: string
  tipe: 'CPL' | 'IK' | 'CPMK'
  kode: string
  current_wording: string | null
  proposed_wording: string
  bloom_level: string
  status: ProposalStatus
  notes: string | null
}

function mapRow(row: WordingProposalRow) {
  return {
    id: row.kode_usulan,
    id_usulan: row.id_usulan,
    type: row.tipe,
    code: row.kode,
    currentWording: row.current_wording ?? '',
    proposedWording: row.proposed_wording,
    bloomLevel: row.bloom_level,
    status: row.status,
    notes: row.notes ?? '',
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['jamu'])
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('usulan_wording')
      .select('id_usulan, kode_usulan, tipe, kode, current_wording, proposed_wording, bloom_level, status, notes')
      .order('created_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ success: true, data: { items: (data ?? []).map(mapRow) } })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[GET /api/jamu/wording-proposals]', err)
    return serverError('Gagal memuat usulan wording.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ['jamu'])
    const body = await req.json().catch(() => ({}))
    const tipe = String(body.type ?? 'CPL')
    const kode = String(body.code ?? '').trim()
    const currentWording = String(body.currentWording ?? '').trim()
    const proposedWording = String(body.proposedWording ?? '').trim()
    const bloomLevel = String(body.bloomLevel ?? '').trim()
    const notes = String(body.notes ?? '').trim()

    if (!['CPL', 'IK', 'CPMK'].includes(tipe)) return bad('Tipe data tidak valid.')
    if (!kode) return bad('Kode wajib diisi.')
    if (!proposedWording) return bad('Usulan wording wajib diisi.')
    if (!bloomLevel) return bad('Bloom level wajib diisi.')

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('usulan_wording')
      .insert({
        kode_usulan: await nextCode(admin),
        tipe,
        kode,
        current_wording: currentWording || null,
        proposed_wording: proposedWording,
        bloom_level: bloomLevel,
        notes: notes || null,
        status: 'Pending',
        dibuat_oleh_user: session.id_user,
      })
      .select('id_usulan, kode_usulan, tipe, kode, current_wording, proposed_wording, bloom_level, status, notes')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: mapRow(data) })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[POST /api/jamu/wording-proposals]', err)
    return serverError('Gagal menyimpan usulan wording.')
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(req, ['jamu'])
    const body = await req.json().catch(() => ({}))
    const id = Number(body.id_usulan)
    const status = String(body.status ?? '') as ProposalStatus
    if (!Number.isInteger(id) || id <= 0) return bad('ID usulan tidak valid.')
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) return bad('Status tidak valid.')

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('usulan_wording')
      .update({ status })
      .eq('id_usulan', id)
      .select('id_usulan, kode_usulan, tipe, kode, current_wording, proposed_wording, bloom_level, status, notes')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: mapRow(data) })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[PUT /api/jamu/wording-proposals]', err)
    return serverError('Gagal memperbarui status usulan wording.')
  }
}
