import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { handleAuthError, requireRole } from '@/app/lib/auth'
import { nilaiKeHuruf } from '@/app/lib/grading'

interface RiwayatNilaiItem {
  no: number
  semester: number
  kode: string
  nama: string
  sks: number
  uk1: number | null
  uk2: number | null
  uk3: number | null
  uk4: number | null
  uk5: number | null
  nilaiAkhir: number
  skala100: number
  huruf: string
}

type Row = {
  nilai_asli: number | null
  nilai_remedi: number | null
  id_kelas: number
  komponen_nilai: {
    kode_media: string
    bobot_terhadap_mk: number
    mata_kuliah: { id_mata_kuliah: number; kode_mk: string; nama_mk: string; sks: number }
  }
  kelas: { tahun_akademik: string; semester: string; id_kurikulum: number }
}

const SEMESTER_ORDER: Record<string, number> = { Ganjil: 0, Genap: 1, Pendek: 2 }

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['mahasiswa'])
    const idMahasiswa = session.id_mahasiswa
    if (!idMahasiswa) {
      return NextResponse.json({ success: true, data: [] })
    }

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('nilai_detail')
      .select(
        `nilai_asli, nilai_remedi, id_kelas,
         komponen_nilai:id_komponen (
           kode_media, bobot_terhadap_mk,
           mata_kuliah:id_mata_kuliah ( id_mata_kuliah, kode_mk, nama_mk, sks )
         ),
         kelas:kelas_mk ( tahun_akademik, semester, id_kurikulum )`,
      )
      .eq('id_mahasiswa', idMahasiswa)
    if (error) throw error

    interface Bucket {
      semester: string
      tahun: string
      idKurikulum: number
      mk: { id: number; kode: string; nama: string; sks: number }
      komponen: Array<{ kode_media: string; bobot: number; efektif: number | null }>
    }
    const buckets = new Map<string, Bucket>()

    for (const r of (data ?? []) as unknown as Row[]) {
      const mk = r.komponen_nilai?.mata_kuliah
      if (!mk || !r.kelas) continue
      const key = `${r.kelas.tahun_akademik}::${r.kelas.semester}::${mk.id_mata_kuliah}`
      let b = buckets.get(key)
      if (!b) {
        b = {
          semester: r.kelas.semester,
          tahun: r.kelas.tahun_akademik,
          idKurikulum: r.kelas.id_kurikulum,
          mk: { id: mk.id_mata_kuliah, kode: mk.kode_mk, nama: mk.nama_mk, sks: Number(mk.sks) },
          komponen: [],
        }
        buckets.set(key, b)
      }
      const efektif = r.nilai_remedi ?? r.nilai_asli
      b.komponen.push({
        kode_media: r.komponen_nilai.kode_media,
        bobot: Number(r.komponen_nilai.bobot_terhadap_mk),
        efektif: efektif != null ? Number(efektif) : null,
      })
    }

    // Semester (1..8) dari kurikulum_mk.semester_default, scoped ke kurikulum kelas masing-masing.
    const kurMkPairs = [...buckets.values()].map((b) => ({ id_kurikulum: b.idKurikulum, id_mata_kuliah: b.mk.id }))
    const idKurikulumSet = [...new Set(kurMkPairs.map((p) => p.id_kurikulum))]
    const idMkSet = [...new Set(kurMkPairs.map((p) => p.id_mata_kuliah))]
    const { data: semesterRows } = idKurikulumSet.length && idMkSet.length
      ? await admin.from('kurikulum_mk').select('id_kurikulum, id_mata_kuliah, semester_default').in('id_kurikulum', idKurikulumSet).in('id_mata_kuliah', idMkSet)
      : { data: [] as { id_kurikulum: number; id_mata_kuliah: number; semester_default: number | null }[] }
    const semesterMap = new Map((semesterRows ?? []).map((r) => [`${r.id_kurikulum}::${r.id_mata_kuliah}`, r.semester_default ?? 0]))

    const sortedBuckets = [...buckets.values()].sort(
      (a, b) => a.tahun.localeCompare(b.tahun) || SEMESTER_ORDER[a.semester] - SEMESTER_ORDER[b.semester] || a.mk.kode.localeCompare(b.mk.kode),
    )

    const items: RiwayatNilaiItem[] = []
    let no = 1
    for (const b of sortedBuckets) {
      let nilaiAkhir = 0
      for (const k of b.komponen) {
        if (k.efektif != null) nilaiAkhir += k.efektif * (k.bobot / 100)
      }
      const skala100 = Number(nilaiAkhir.toFixed(2))
      const { huruf } = nilaiKeHuruf(skala100)

      const ukByKode = new Map(b.komponen.map((k) => [k.kode_media, k.efektif]))

      items.push({
        no: no++,
        semester: semesterMap.get(`${b.idKurikulum}::${b.mk.id}`) ?? 0,
        kode: b.mk.kode,
        nama: b.mk.nama,
        sks: b.mk.sks,
        uk1: ukByKode.get('UK1') ?? null,
        uk2: ukByKode.get('UK2') ?? null,
        uk3: ukByKode.get('UK3') ?? null,
        uk4: ukByKode.get('UK4') ?? null,
        uk5: ukByKode.get('UK5') ?? null,
        nilaiAkhir: skala100,
        skala100,
        huruf,
      })
    }

    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] /api/mahasiswa/riwayat error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Gagal memuat data riwayat nilai',
        ...(process.env.NODE_ENV !== 'production' && err instanceof Error ? { detail: err.message } : {}),
      },
      { status: 500 },
    )
  }
}
