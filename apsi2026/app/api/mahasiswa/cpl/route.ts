import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/app/lib/db'
import { handleAuthError, requireRole } from '@/app/lib/auth'

interface CplDataItem {
  name: string
  nilai: number
  target: number
  status: 'Tercapai' | 'Belum Tercapai' | 'Belum Ditempuh'
  kategori: string
}

interface CpmkItem {
  kode: string
  deskripsi: string
  bobot: number
  nilai: number
  matakuliah: string
  semester: string
  nilaiMK: number
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
  status: 'Tercapai' | 'Belum Tercapai' | 'Belum Ditempuh'
  ik: IkItem[]
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['mahasiswa'])
    const idMahasiswa = session.id
    const db = getDb()

    // 1. Ambil daftar CPL (defensif: kolom kategori opsional)
    let cplRows: any[]
    try {
      const [rs] = await db.execute(
        'SELECT id_cpl, kode_cpl, deskripsi, kategori FROM cpl ORDER BY kode_cpl',
      )
      cplRows = rs as any[]
    } catch {
      const [rs] = await db.execute(
        'SELECT id_cpl, kode_cpl, deskripsi FROM cpl ORDER BY kode_cpl',
      )
      cplRows = (rs as any[]).map((r) => ({ ...r, kategori: null }))
    }

    if (cplRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { cplData: [], detailCpl: [] },
      })
    }

    // 2. IK + mapping ke CPL
    const [ikRows] = await db.execute(
      `SELECT id_ik, id_cpl, kode_ik, deskripsi, bobot_ik_persen
       FROM mapping_ik_cpl ORDER BY kode_ik`,
    )

    // 3. Target capaian per IK (tahun_akademik terbaru)
    const [targetRows] = await db.execute(
      `SELECT id_ik, MAX(tahun_akademik) AS tahun_akademik,
              MAX(nilai_target_minimal) AS nilai_target_minimal
       FROM target_capaian GROUP BY id_ik`,
    )
    const targetMap = new Map<number, number>()
    for (const r of targetRows as any[]) {
      targetMap.set(r.id_ik, Number(r.nilai_target_minimal))
    }

    // 4. Mapping CPMK→IK + CPMK detail + MK (defensif: kolom deskripsi opsional)
    let cpmkRows: any[] = []
    try {
      const [rs] = await db.execute(
        `SELECT mci.id_ik, mci.bobot_cpmk_persen,
                c.id_cpmk, c.kode_cpmk, c.deskripsi AS deskripsi_cpmk,
                mk.id_mk, mk.kode_mk, mk.nama_mk, mk.sks, mk.plot_semester
         FROM mapping_cpmk_ik mci
         JOIN cpmk c ON c.id_cpmk = mci.id_cpmk
         JOIN mata_kuliah mk ON mk.id_mk = c.id_mk`,
      )
      cpmkRows = rs as any[]
    } catch {
      const [rs] = await db.execute(
        `SELECT mci.id_ik, mci.bobot_cpmk_persen,
                c.id_cpmk, c.kode_cpmk,
                mk.id_mk, mk.kode_mk, mk.nama_mk, mk.sks, mk.plot_semester
         FROM mapping_cpmk_ik mci
         JOIN cpmk c ON c.id_cpmk = mci.id_cpmk
         JOIN mata_kuliah mk ON mk.id_mk = c.id_mk`,
      )
      cpmkRows = (rs as any[]).map((r) => ({ ...r, deskripsi_cpmk: '' }))
    }

    // 5. Nilai per komponen → CPMK untuk mahasiswa ini
    const [nilaiRows] = await db.execute(
      `SELECT mkc.id_cpmk, mkc.bobot_media_asesmen,
              nd.nilai_asli, nd.nilai_remedi
       FROM mapping_komponen_cpmk mkc
       JOIN komponen_nilai kn ON kn.id_komponen = mkc.id_komponen
       LEFT JOIN nilai_detail nd
         ON nd.id_komponen = mkc.id_komponen
        AND nd.id_mahasiswa = ?`,
      [idMahasiswa],
    )

    // Build helper maps
    const ikByCpl = new Map<number, any[]>()
    for (const ik of ikRows as any[]) {
      if (!ikByCpl.has(ik.id_cpl)) ikByCpl.set(ik.id_cpl, [])
      ikByCpl.get(ik.id_cpl)!.push(ik)
    }

    const cpmkByIk = new Map<number, any[]>()
    for (const c of cpmkRows) {
      if (!cpmkByIk.has(c.id_ik)) cpmkByIk.set(c.id_ik, [])
      cpmkByIk.get(c.id_ik)!.push(c)
    }

    // Nilai CPMK = Σ(efektif × bobot_media_asesmen/100)
    const nilaiCpmkMap = new Map<number, number>()
    const tertempuhCpmk = new Set<number>()
    for (const n of nilaiRows as any[]) {
      const efektif =
        n.nilai_remedi != null
          ? Number(n.nilai_remedi)
          : n.nilai_asli != null
          ? Number(n.nilai_asli)
          : null
      if (efektif == null) continue
      tertempuhCpmk.add(n.id_cpmk)
      const kontrib = efektif * (Number(n.bobot_media_asesmen) / 100)
      nilaiCpmkMap.set(n.id_cpmk, (nilaiCpmkMap.get(n.id_cpmk) ?? 0) + kontrib)
    }

    // Rata-rata nilai CPMK per MK (untuk tampilan nilaiMK di UI)
    const nilaiMkMap = new Map<number, { sum: number; count: number }>()
    for (const c of cpmkRows) {
      if (!tertempuhCpmk.has(c.id_cpmk)) continue
      const nilai = nilaiCpmkMap.get(c.id_cpmk) ?? 0
      const cur = nilaiMkMap.get(c.id_mk) ?? { sum: 0, count: 0 }
      cur.sum += nilai
      cur.count += 1
      nilaiMkMap.set(c.id_mk, cur)
    }

    const cplData: CplDataItem[] = []
    const detailCpl: DetailCplItem[] = []

    for (const cpl of cplRows) {
      const iks = ikByCpl.get(cpl.id_cpl) ?? []
      let nilaiCpl = 0
      let targetCpl = 0
      let adaTertempuh = false
      const ikList: IkItem[] = []

      for (const ik of iks) {
        const cpmks = cpmkByIk.get(ik.id_ik) ?? []
        let nilaiIk = 0
        const cpmkList: CpmkItem[] = []

        for (const c of cpmks) {
          const nilaiCpmk = nilaiCpmkMap.get(c.id_cpmk) ?? 0
          const tertempuh = tertempuhCpmk.has(c.id_cpmk)
          if (tertempuh) adaTertempuh = true
          nilaiIk += nilaiCpmk * (Number(c.bobot_cpmk_persen) / 100)

          const mkAgg = nilaiMkMap.get(c.id_mk)
          const nilaiMK = mkAgg ? mkAgg.sum / mkAgg.count : 0

          cpmkList.push({
            kode: c.kode_cpmk,
            deskripsi: c.deskripsi_cpmk ?? '',
            bobot: Number(c.bobot_cpmk_persen),
            nilai: Number(nilaiCpmk.toFixed(2)),
            matakuliah: `${c.kode_mk} - ${c.nama_mk}`,
            semester: String(c.plot_semester ?? '-'),
            nilaiMK: Number(nilaiMK.toFixed(2)),
          })
        }

        const targetIk = targetMap.get(ik.id_ik) ?? 0
        nilaiCpl += nilaiIk * (Number(ik.bobot_ik_persen) / 100)
        targetCpl += targetIk * (Number(ik.bobot_ik_persen) / 100)

        ikList.push({
          kode: ik.kode_ik,
          deskripsi: ik.deskripsi,
          bobot: Number(ik.bobot_ik_persen),
          nilai: Number(nilaiIk.toFixed(2)),
          cpmk: cpmkList,
        })
      }

      const status: CplDataItem['status'] = !adaTertempuh
        ? 'Belum Ditempuh'
        : nilaiCpl >= targetCpl
        ? 'Tercapai'
        : 'Belum Tercapai'

      cplData.push({
        name: cpl.kode_cpl,
        nilai: Number(nilaiCpl.toFixed(2)),
        target: Number(targetCpl.toFixed(2)),
        status,
        kategori: cpl.kategori ?? '-',
      })

      detailCpl.push({
        cpl: cpl.kode_cpl,
        deskripsi: cpl.deskripsi,
        nilai: Number(nilaiCpl.toFixed(2)),
        status,
        ik: ikList,
      })
    }

    return NextResponse.json({
      success: true,
      data: { cplData, detailCpl },
    })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] /api/mahasiswa/cpl error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Gagal memuat data CPL',
        ...(process.env.NODE_ENV !== 'production' && err instanceof Error
          ? { detail: err.message }
          : {}),
      },
      { status: 500 },
    )
  }
}