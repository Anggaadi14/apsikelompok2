import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { handleAuthError, requireRole } from '@/app/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin'])
    const admin = createSupabaseAdminClient()

    const { data: cplRows, error: cplErr } = await admin
      .from('cpl')
      .select(
        `id_cpl, id_kurikulum, kode_cpl, singkatan, domain, deskripsi_id, deskripsi_en, urutan,
         kurikulum:id_kurikulum ( kode, nama, tahun_mulai )`,
      )
    if (cplErr) throw cplErr

    const cplList = (cplRows ?? [])
      .map((c: any) => ({ ...c, kode_kurikulum: c.kurikulum?.kode, nama_kurikulum: c.kurikulum?.nama, _tahun: c.kurikulum?.tahun_mulai ?? 0 }))
      .sort((a: any, b: any) => b._tahun - a._tahun || a.urutan - b.urutan || (a.kode_cpl ?? '').localeCompare(b.kode_cpl ?? ''))
      .map(({ kurikulum, _tahun, ...rest }: any) => rest)

    const { data: kurikulumRows, error: kurErr } = await admin
      .from('kurikulum')
      .select('id_kurikulum, kode, nama, is_active, tahun_mulai')
      .order('tahun_mulai', { ascending: false })
    if (kurErr) throw kurErr

    return NextResponse.json({ success: true, data: { cplList, kurikulumList: kurikulumRows } })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] GET /api/admin/cpl error:', err)
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal memuat data CPL' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin'])
    const body = await req.json().catch(() => ({}))

    const id_kurikulum = body.id_kurikulum ? Number(body.id_kurikulum) : null
    const kode_cpl = body.kode_cpl ? String(body.kode_cpl).trim() : ''
    const singkatan = body.singkatan ? String(body.singkatan).trim() : ''
    const domain = body.domain ? String(body.domain).trim() : ''
    const deskripsi_id = body.deskripsi_id ? String(body.deskripsi_id).trim() : ''
    const deskripsi_en = body.deskripsi_en ? String(body.deskripsi_en).trim() : null
    const urutan = body.urutan ? Number(body.urutan) : 0

    if (!kode_cpl) {
      return NextResponse.json({ success: false, error: 'KODE_CPL_EMPTY', message: 'Sistem meminta kode CPL. Kode CPL tidak boleh kosong!' }, { status: 400 })
    }
    if (!id_kurikulum) {
      return NextResponse.json({ success: false, error: 'KURIKULUM_REQUIRED', message: 'Kurikulum wajib dipilih!' }, { status: 400 })
    }
    if (!singkatan) {
      return NextResponse.json({ success: false, error: 'SINGKATAN_REQUIRED', message: 'Singkatan wajib diisi!' }, { status: 400 })
    }
    const validDomains = ['Pengetahuan', 'Keterampilan Khusus', 'Keterampilan Umum', 'Sikap']
    if (!validDomains.includes(domain)) {
      return NextResponse.json({ success: false, error: 'INVALID_DOMAIN', message: 'Domain CPL tidak valid!' }, { status: 400 })
    }
    if (!deskripsi_id) {
      return NextResponse.json({ success: false, error: 'DESKRIPSI_REQUIRED', message: 'Deskripsi ID wajib diisi!' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    const { data: existing } = await admin.from('cpl').select('id_cpl').eq('id_kurikulum', id_kurikulum).eq('kode_cpl', kode_cpl).maybeSingle()
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'DUPLICATE_CPL', message: 'Sistem menolak data duplikat. Kode CPL sudah terdaftar untuk kurikulum ini.' },
        { status: 400 },
      )
    }

    const { error: insErr } = await admin
      .from('cpl')
      .insert({ id_kurikulum, kode_cpl, singkatan, domain, deskripsi_id, deskripsi_en, urutan })
    if (insErr) throw insErr

    return NextResponse.json({ success: true, message: 'Sistem menyimpan data CPL. Data berhasil disimpan!' }, { status: 201 })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] POST /api/admin/cpl error:', err)
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal menyimpan data CPL' }, { status: 500 })
  }
}
