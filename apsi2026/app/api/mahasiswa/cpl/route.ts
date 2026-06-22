// app/api/mahasiswa/cpl/route.ts
//
// GET /api/mahasiswa/cpl — capaian CPL mahasiswa yang sedang login, dipecah
// sampai level CPMK. Nilai per level (CPMK/IK/CPL) diambil langsung dari view
// OBE engine (v_nilai_cpmk_per_mhs / v_nilai_ik_per_mhs / v_nilai_cpl_per_mhs)
// supaya rumus weighting konsisten dengan migrations/011 — tidak dihitung
// ulang di sini.

import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireRole } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { resolveKurikulumId } from '@/app/lib/kurikulum'
import { nilaiKeHuruf } from '@/app/lib/grading'

interface CpmkItem {
  kode: string
  deskripsi: string
  bobot: number
  nilai: number
  matakuliah: string
  semester: number
  nilaiMK: string
}
interface IkItem {
  kode: string
  deskripsi: string
  bobot: number
  nilai: number
  cpmk: CpmkItem[]
}
interface DetailCplItem {
  cpl: string
  deskripsi: string
  nilai: number
  target: number
  status: 'Tercapai' | 'Belum Tercapai' | 'Belum Ditempuh'
  ik: IkItem[]
}
interface CplDataItem {
  name: string
  nilai: number
  target: number
  status: DetailCplItem['status']
  kategori: string
}

function kodeCplLabel(kode: string) {
  return kode.toUpperCase().startsWith('CPL') ? kode : `CPL-${kode}`
}

function cplNumber(label: string) {
  const match = label.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

function padMahasiswaCplData(cplData: CplDataItem[], detailCpl: DetailCplItem[]) {
  const defaultTarget = cplData[0]?.target ?? 80
  const cplByNumber = new Map(cplData.map((cpl) => [cplNumber(cpl.name), cpl]))
  const detailByNumber = new Map(detailCpl.map((detail) => [cplNumber(detail.cpl), detail]))

  const paddedCplData = Array.from({ length: 10 }, (_, idx) => {
    const no = idx + 1
    return cplByNumber.get(no) ?? {
      name: `CPL-${no}`,
      nilai: 0,
      target: defaultTarget,
      status: 'Belum Ditempuh' as const,
      kategori: '-',
    }
  })

  const paddedDetailCpl = Array.from({ length: 10 }, (_, idx) => {
    const no = idx + 1
    return detailByNumber.get(no) ?? {
      cpl: `CPL-${no}`,
      deskripsi: 'Data CPL belum tersedia.',
      nilai: 0,
      target: defaultTarget,
      status: 'Belum Ditempuh' as const,
      ik: [],
    }
  })

  return { cplData: paddedCplData, detailCpl: paddedDetailCpl }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['mahasiswa'])
    const idMahasiswa = session.id_mahasiswa
    if (!idMahasiswa) {
      return NextResponse.json({ success: true, data: { cplData: [], detailCpl: [] } })
    }

    const admin = createSupabaseAdminClient()

    const { data: mhs } = await admin.from('mahasiswa').select('angkatan').eq('id_mahasiswa', idMahasiswa).maybeSingle<{ angkatan: number | null }>()
    const idKurikulum = await resolveKurikulumId(admin, mhs?.angkatan ?? null)

    if (!idKurikulum) {
      return NextResponse.json({ success: true, data: { cplData: [], detailCpl: [] } })
    }

    const { data: cplRows, error: cplErr } = await admin
      .from('cpl')
      .select('id_cpl, kode_cpl, deskripsi_id, domain, target_minimal, urutan')
      .eq('id_kurikulum', idKurikulum)
      .order('urutan')
    if (cplErr) throw cplErr
    if (!cplRows || cplRows.length === 0) {
      return NextResponse.json({ success: true, data: { cplData: [], detailCpl: [] } })
    }
    const cplIds = cplRows.map((c) => c.id_cpl)

    const { data: nilaiCplRows } = await admin
      .from('v_nilai_cpl_per_mhs')
      .select('id_cpl, nilai_cpl')
      .eq('id_mahasiswa', idMahasiswa)
      .in('id_cpl', cplIds)
    const nilaiCplMap = new Map((nilaiCplRows ?? []).map((r) => [r.id_cpl, Number(r.nilai_cpl)]))

    const { data: ikRows } = await admin
      .from('mapping_ik_cpl')
      .select('id_ik, id_cpl, bobot_persen, indikator_kinerja:id_ik ( kode_ik, deskripsi )')
      .in('id_cpl', cplIds)
    type IkRow = { id_ik: number; id_cpl: number; bobot_persen: number; indikator_kinerja: { kode_ik: string; deskripsi: string } }
    const ikByCpl = new Map<number, IkRow[]>()
    for (const ik of (ikRows ?? []) as unknown as IkRow[]) {
      if (!ikByCpl.has(ik.id_cpl)) ikByCpl.set(ik.id_cpl, [])
      ikByCpl.get(ik.id_cpl)!.push(ik)
    }
    const ikIds = (ikRows ?? []).map((r) => r.id_ik)

    const { data: nilaiIkRows } = ikIds.length
      ? await admin.from('v_nilai_ik_per_mhs').select('id_ik, nilai_ik').eq('id_mahasiswa', idMahasiswa).in('id_ik', ikIds)
      : { data: [] as { id_ik: number; nilai_ik: number }[] }
    const nilaiIkMap = new Map((nilaiIkRows ?? []).map((r) => [r.id_ik, Number(r.nilai_ik)]))

    const { data: cpmkRows } = ikIds.length
      ? await admin
          .from('mapping_cpmk_ik')
          .select(
            `id_cpmk, id_ik, bobot_persen,
             cpmk:id_cpmk ( kode_cpmk, deskripsi_id, id_mata_kuliah, mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk ) )`,
          )
          .in('id_ik', ikIds)
      : { data: [] as CpmkRow[] }
    type CpmkRow = {
      id_cpmk: number
      id_ik: number
      bobot_persen: number
      cpmk: { kode_cpmk: string; deskripsi_id: string; id_mata_kuliah: number; mata_kuliah: { kode_mk: string; nama_mk: string } }
    }
    const typedCpmkRows = (cpmkRows ?? []) as unknown as CpmkRow[]
    const cpmkByIk = new Map<number, CpmkRow[]>()
    for (const c of typedCpmkRows) {
      if (!cpmkByIk.has(c.id_ik)) cpmkByIk.set(c.id_ik, [])
      cpmkByIk.get(c.id_ik)!.push(c)
    }
    const cpmkIds = typedCpmkRows.map((r) => r.id_cpmk)

    const { data: nilaiCpmkRows } = cpmkIds.length
      ? await admin.from('v_nilai_cpmk_per_mhs').select('id_cpmk, nilai_cpmk').eq('id_mahasiswa', idMahasiswa).in('id_cpmk', cpmkIds)
      : { data: [] as { id_cpmk: number; nilai_cpmk: number }[] }

    const idMataKuliahSet = new Set(typedCpmkRows.map((c) => c.cpmk.id_mata_kuliah))
    const { data: semesterRows } = idMataKuliahSet.size
      ? await admin.from('kurikulum_mk').select('id_mata_kuliah, semester_default').eq('id_kurikulum', idKurikulum).in('id_mata_kuliah', [...idMataKuliahSet])
      : { data: [] as { id_mata_kuliah: number; semester_default: number | null }[] }
    const semesterByMk = new Map((semesterRows ?? []).map((r) => [r.id_mata_kuliah, r.semester_default ?? 0]))

    // Retake-safe: rata-ratakan kalau ada >1 baris (beda kelas/semester) utk CPMK yang sama.
    const cpmkAgg = new Map<number, { sum: number; count: number }>()
    for (const r of nilaiCpmkRows ?? []) {
      const cur = cpmkAgg.get(r.id_cpmk) ?? { sum: 0, count: 0 }
      cur.sum += Number(r.nilai_cpmk)
      cur.count += 1
      cpmkAgg.set(r.id_cpmk, cur)
    }
    const tertempuhCpmk = new Set(cpmkAgg.keys())
    const nilaiCpmkMap = new Map([...cpmkAgg.entries()].map(([id, v]) => [id, v.sum / v.count]))

    const cplData: CplDataItem[] = []
    const detailCpl: DetailCplItem[] = []

    for (const cpl of cplRows) {
      const iks = ikByCpl.get(cpl.id_cpl) ?? []
      const nilaiCpl = nilaiCplMap.get(cpl.id_cpl) ?? 0
      const targetCpl = Number(cpl.target_minimal)
      let adaTertempuh = false

      const ikList: IkItem[] = iks.map((ik) => {
        const cpmks = cpmkByIk.get(ik.id_ik) ?? []
        const cpmkList: CpmkItem[] = cpmks.map((c) => {
          const tertempuh = tertempuhCpmk.has(c.id_cpmk)
          if (tertempuh) adaTertempuh = true
          const nilaiCpmk = nilaiCpmkMap.get(c.id_cpmk) ?? 0
          return {
            kode: c.cpmk.kode_cpmk,
            deskripsi: c.cpmk.deskripsi_id,
            bobot: Number(c.bobot_persen),
            nilai: Number(nilaiCpmk.toFixed(2)),
            matakuliah: `${c.cpmk.mata_kuliah.kode_mk} - ${c.cpmk.mata_kuliah.nama_mk}`,
            semester: semesterByMk.get(c.cpmk.id_mata_kuliah) ?? 0,
            nilaiMK: tertempuh ? nilaiKeHuruf(nilaiCpmk).huruf : '-',
          }
        })
        return {
          kode: ik.indikator_kinerja.kode_ik,
          deskripsi: ik.indikator_kinerja.deskripsi,
          bobot: Number(ik.bobot_persen),
          nilai: Number((nilaiIkMap.get(ik.id_ik) ?? 0).toFixed(2)),
          cpmk: cpmkList,
        }
      })

      const status: DetailCplItem['status'] = !adaTertempuh
        ? 'Belum Ditempuh'
        : nilaiCpl >= targetCpl
          ? 'Tercapai'
          : 'Belum Tercapai'

      cplData.push({
        name: kodeCplLabel(cpl.kode_cpl),
        nilai: Number(nilaiCpl.toFixed(2)),
        target: targetCpl,
        status,
        kategori: cpl.domain,
      })
      detailCpl.push({
        cpl: kodeCplLabel(cpl.kode_cpl),
        deskripsi: cpl.deskripsi_id,
        nilai: Number(nilaiCpl.toFixed(2)),
        target: targetCpl,
        status,
        ik: ikList,
      })
    }

    return NextResponse.json({ success: true, data: padMahasiswaCplData(cplData, detailCpl) })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] /api/mahasiswa/cpl error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Gagal memuat data CPL',
        ...(process.env.NODE_ENV !== 'production' && err instanceof Error ? { detail: err.message } : {}),
      },
      { status: 500 },
    )
  }
}
