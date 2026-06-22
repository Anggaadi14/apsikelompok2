import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { handleAuthError, requireRole } from '@/app/lib/auth'

// GET /api/admin/mapping            → daftar mata kuliah (untuk dropdown)
// GET /api/admin/mapping?id_mata_kuliah=12  → CPMK MK tsb + pemetaan IK sekarang + daftar IK
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin'])
    const admin = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const idMk = searchParams.get('id_mata_kuliah')

    const { data: mkList, error: mkErr } = await admin.from('mata_kuliah').select('id_mata_kuliah, kode_mk, nama_mk').order('kode_mk')
    if (mkErr) throw mkErr

    if (!idMk) {
      return NextResponse.json({ success: true, data: { mkList } })
    }

    const { data: cpmkRows, error: cpmkErr } = await admin
      .from('cpmk')
      .select('id_cpmk, kode_cpmk, deskripsi_id, urutan, mapping_cpmk_ik ( id_ik )')
      .eq('id_mata_kuliah', Number(idMk))
      .order('urutan')
      .order('kode_cpmk')
    if (cpmkErr) throw cpmkErr

    const cpmkList = (cpmkRows ?? []).map((c: any) => ({
      id_cpmk: c.id_cpmk,
      kode_cpmk: c.kode_cpmk,
      deskripsi_id: c.deskripsi_id,
      id_ik: c.mapping_cpmk_ik?.[0]?.id_ik ?? null,
    }))

    const { data: ikList, error: ikErr } = await admin
      .from('indikator_kinerja')
      .select('id_ik, kode_ik, deskripsi, id_cpl, cpl:id_cpl ( kode_cpl )')
      .order('urutan')
      .order('kode_ik')
    if (ikErr) throw ikErr
    const ikOut = (ikList ?? [])
      .map((r: any) => ({ id_ik: r.id_ik, kode_ik: r.kode_ik, deskripsi: r.deskripsi, id_cpl: r.id_cpl, kode_cpl: r.cpl?.kode_cpl }))
      .sort((a: any, b: any) => (a.kode_cpl ?? '').localeCompare(b.kode_cpl ?? ''))

    return NextResponse.json({ success: true, data: { mkList, cpmkList, ikList: ikOut } })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] GET /api/admin/mapping error:', err)
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal memuat data pemetaan' }, { status: 500 })
  }
}

// POST /api/admin/mapping
// body: { id_mata_kuliah, mappings: [{ id_cpmk, id_ik | null }] }
// - id_ik null  = CPMK tidak dipetakan (bobot 0)
// - bobot CPMK→IK dibagi rata otomatis (jumlah per IK = 100)
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin'])
    const body = await req.json().catch(() => ({}))
    const mappings: Array<{ id_cpmk: number; id_ik: number | null }> = Array.isArray(body.mappings) ? body.mappings : []

    if (mappings.length === 0) {
      return NextResponse.json({ success: false, error: 'NO_MAPPING', message: 'Tidak ada data pemetaan yang dikirim.' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const affectedIks = new Set<number>()

    for (const m of mappings) {
      const idCpmk = Number(m.id_cpmk)
      const idIk = m.id_ik ? Number(m.id_ik) : null
      if (!idCpmk) continue

      const { data: oldRows } = await admin.from('mapping_cpmk_ik').select('id_ik').eq('id_cpmk', idCpmk)
      for (const r of oldRows ?? []) affectedIks.add(Number(r.id_ik))
      await admin.from('mapping_cpmk_ik').delete().eq('id_cpmk', idCpmk)

      if (idIk) {
        const { error: insErr } = await admin.from('mapping_cpmk_ik').insert({ id_cpmk: idCpmk, id_ik: idIk, bobot_persen: 0 })
        if (insErr) throw insErr
        affectedIks.add(idIk)
      }
    }

    for (const idIk of affectedIks) {
      const { count } = await admin.from('mapping_cpmk_ik').select('id_cpmk', { count: 'exact', head: true }).eq('id_ik', idIk)
      if ((count ?? 0) > 0) {
        const bobot = Math.round((100 / (count ?? 1)) * 1000) / 1000
        await admin.from('mapping_cpmk_ik').update({ bobot_persen: bobot }).eq('id_ik', idIk)
      }
    }

    return NextResponse.json({ success: true, message: 'Sistem menyimpan pemetaan CPMK–IK. Bobot dibagi rata otomatis.' })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] POST /api/admin/mapping error:', err)
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal menyimpan pemetaan' }, { status: 500 })
  }
}
