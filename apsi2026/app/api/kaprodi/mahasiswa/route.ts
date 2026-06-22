import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireRole, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['kaprodi'])
    const admin = createSupabaseAdminClient()
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const filterAngkatan = (url.searchParams.get('angkatan') ?? 'Semua').trim()
    const filterSemester = (url.searchParams.get('semester') ?? 'Semua').trim()
    const filterKelas = (url.searchParams.get('kelas') ?? 'Semua').trim()

    const { data: mahasiswa, error } = await admin
      .from('mahasiswa')
      .select('id_mahasiswa, nim, nama_mahasiswa, angkatan')
      .order('angkatan', { ascending: false })
      .order('nim')
    if (error) throw error

    const ids = (mahasiswa ?? []).map((m) => m.id_mahasiswa)
    type KelasMahasiswaRow = { id_mahasiswa: number; id_kelas: number }
    type NilaiCplRow = { id_mahasiswa: number; nilai_cpl: number | string | null }
    type KelasOptionRow = {
      id_kelas: number
      kode_kelas: string
      tahun_akademik: string
      semester: string
      mata_kuliah: { kode_mk: string | null; nama_mk: string | null } | Array<{ kode_mk: string | null; nama_mk: string | null }> | null
    }

    const [{ data: kelasRows }, { data: nilaiCplRows }, { data: kelasOptionsRows }] = await Promise.all([
      ids.length
        ? admin.from('mahasiswa_kelas').select('id_mahasiswa, id_kelas').in('id_mahasiswa', ids)
        : Promise.resolve({ data: [] as KelasMahasiswaRow[] }),
      ids.length
        ? admin.from('v_nilai_cpl_per_mhs').select('id_mahasiswa, nilai_cpl').in('id_mahasiswa', ids)
        : Promise.resolve({ data: [] as NilaiCplRow[] }),
      admin
        .from('kelas_mk')
        .select('id_kelas, kode_kelas, tahun_akademik, semester, mata_kuliah:id_mata_kuliah(kode_mk, nama_mk)')
        .order('tahun_akademik', { ascending: false })
        .order('kode_kelas'),
    ])

    const kelasCount = new Map<number, number>()
    for (const row of kelasRows ?? []) kelasCount.set(row.id_mahasiswa, (kelasCount.get(row.id_mahasiswa) ?? 0) + 1)
    const selectedKelasId = filterKelas === 'Semua' ? null : Number(filterKelas)
    const selectedKelasMembers = new Set(
      selectedKelasId
        ? (kelasRows ?? []).filter((row) => row.id_kelas === selectedKelasId).map((row) => row.id_mahasiswa)
        : [],
    )

    const cplAgg = new Map<number, { sum: number; count: number }>()
    for (const row of nilaiCplRows ?? []) {
      const nilai = Number(row.nilai_cpl ?? NaN)
      if (!Number.isFinite(nilai)) continue
      const cur = cplAgg.get(row.id_mahasiswa) ?? { sum: 0, count: 0 }
      cur.sum += nilai
      cur.count += 1
      cplAgg.set(row.id_mahasiswa, cur)
    }

    const nowYear = new Date().getFullYear()
    const items = (mahasiswa ?? [])
      .map((m) => {
        const avg = cplAgg.get(m.id_mahasiswa)
        const rataCpl = avg && avg.count > 0 ? avg.sum / avg.count : null
        return {
          id_mahasiswa: m.id_mahasiswa,
          nim: m.nim,
          nama: m.nama_mahasiswa,
          angkatan: m.angkatan,
          cpl: rataCpl == null ? null : Number(rataCpl.toFixed(2)),
          semester: m.angkatan ? Math.max(1, (nowYear - Number(m.angkatan)) * 2 + 1) : null,
          status: 'Aktif',
          jumlah_kelas: kelasCount.get(m.id_mahasiswa) ?? 0,
        }
      })
      .filter((m) => !q || m.nama.toLowerCase().includes(q) || m.nim.toLowerCase().includes(q))
      .filter((m) => filterAngkatan === 'Semua' || String(m.angkatan ?? '') === filterAngkatan)
      .filter((m) => filterSemester === 'Semua' || String(m.semester ?? '') === filterSemester)
      .filter((m) => selectedKelasId == null || selectedKelasMembers.has(m.id_mahasiswa))

    const withCpl = items.filter((m) => m.cpl != null)
    const withSemester = items.filter((m) => m.semester != null)
    const summary = {
      total: items.length,
      rata_cpl: withCpl.length ? Number((withCpl.reduce((sum, m) => sum + (m.cpl ?? 0), 0) / withCpl.length).toFixed(2)) : null,
      rata_semester: withSemester.length ? Number((withSemester.reduce((sum, m) => sum + (m.semester ?? 0), 0) / withSemester.length).toFixed(1)) : null,
    }

    const allSemester = Array.from(
      new Set(
        (mahasiswa ?? [])
          .map((m) => (m.angkatan ? Math.max(1, (nowYear - Number(m.angkatan)) * 2 + 1) : null))
          .filter((semester): semester is number => semester != null),
      ),
    ).sort((a, b) => a - b)

    const options = {
      angkatan: Array.from(new Set((mahasiswa ?? []).map((m) => m.angkatan).filter(Boolean))).sort((a, b) => Number(b) - Number(a)).map(String),
      semester: allSemester.map(String),
      kelas: ((kelasOptionsRows ?? []) as unknown as KelasOptionRow[]).map((k) => {
        const mk = Array.isArray(k.mata_kuliah) ? k.mata_kuliah[0] : k.mata_kuliah
        return {
          value: String(k.id_kelas),
          label: `${mk?.kode_mk ?? ''} ${k.kode_kelas} - ${k.tahun_akademik} ${k.semester}`.trim(),
        }
      }),
    }

    return NextResponse.json({ success: true, data: { items, summary, options } })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[GET /api/kaprodi/mahasiswa]', err)
    return serverError('Gagal memuat data mahasiswa.')
  }
}
