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

    const { data: mahasiswa, error } = await admin
      .from('mahasiswa')
      .select('id_mahasiswa, nim, nama_mahasiswa, angkatan')
      .order('angkatan', { ascending: false })
      .order('nim')
    if (error) throw error

    const ids = (mahasiswa ?? []).map((m) => m.id_mahasiswa)
    type KelasMahasiswaRow = { id_mahasiswa: number; id_kelas: number }
    type NilaiRow = { id_mahasiswa: number; nilai_asli: number | string | null; nilai_remedi: number | string | null }

    const [{ data: kelasRows }, { data: nilaiRows }] = ids.length
      ? await Promise.all([
          admin.from('mahasiswa_kelas').select('id_mahasiswa, id_kelas').in('id_mahasiswa', ids),
          admin.from('nilai_detail').select('id_mahasiswa, nilai_asli, nilai_remedi').in('id_mahasiswa', ids),
        ])
      : [{ data: [] as KelasMahasiswaRow[] }, { data: [] as NilaiRow[] }]

    const kelasCount = new Map<number, number>()
    for (const row of kelasRows ?? []) kelasCount.set(row.id_mahasiswa, (kelasCount.get(row.id_mahasiswa) ?? 0) + 1)

    const nilaiAgg = new Map<number, { sum: number; count: number }>()
    for (const row of nilaiRows ?? []) {
      const nilai = Number(row.nilai_remedi ?? row.nilai_asli ?? NaN)
      if (!Number.isFinite(nilai)) continue
      const cur = nilaiAgg.get(row.id_mahasiswa) ?? { sum: 0, count: 0 }
      cur.sum += nilai
      cur.count += 1
      nilaiAgg.set(row.id_mahasiswa, cur)
    }

    const nowYear = new Date().getFullYear()
    const items = (mahasiswa ?? [])
      .map((m) => {
        const avg = nilaiAgg.get(m.id_mahasiswa)
        const avgNilai = avg && avg.count > 0 ? avg.sum / avg.count : null
        const ipk = avgNilai == null ? null : Math.min(4, Math.max(0, avgNilai / 25))
        return {
          id_mahasiswa: m.id_mahasiswa,
          nim: m.nim,
          nama: m.nama_mahasiswa,
          angkatan: m.angkatan,
          ipk: ipk == null ? null : Number(ipk.toFixed(2)),
          semester: m.angkatan ? Math.max(1, (nowYear - Number(m.angkatan)) * 2 + 1) : null,
          status: 'Aktif',
          jumlah_kelas: kelasCount.get(m.id_mahasiswa) ?? 0,
        }
      })
      .filter((m) => !q || m.nama.toLowerCase().includes(q) || m.nim.toLowerCase().includes(q))

    const withIpk = items.filter((m) => m.ipk != null)
    const withSemester = items.filter((m) => m.semester != null)
    const summary = {
      total: items.length,
      rata_ipk: withIpk.length ? Number((withIpk.reduce((sum, m) => sum + (m.ipk ?? 0), 0) / withIpk.length).toFixed(2)) : null,
      rata_semester: withSemester.length ? Number((withSemester.reduce((sum, m) => sum + (m.semester ?? 0), 0) / withSemester.length).toFixed(1)) : null,
    }

    return NextResponse.json({ success: true, data: { items, summary } })
  } catch (err) {
    const auth = handleAuthError(err)
    if (auth) return auth
    console.error('[GET /api/kaprodi/mahasiswa]', err)
    return serverError('Gagal memuat data mahasiswa.')
  }
}
