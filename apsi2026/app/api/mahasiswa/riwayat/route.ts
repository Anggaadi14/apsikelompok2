import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { handleAuthError, requireRole } from '@/app/lib/auth'
import { nilaiKeHuruf } from '@/app/lib/grading'

interface RiwayatNilaiItem {
  no: number
  semester: string
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
  kelas: { tahun_akademik: string; semester: string }
}

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
         kelas:kelas_mk ( tahun_akademik, semester )`,
      )
      .eq('id_mahasiswa', idMahasiswa)
    if (error) throw error

    interface Bucket {
      semester: string
      tahun: string
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

    const items: RiwayatNilaiItem[] = []
    let no = 1
    for (const b of buckets.values()) {
      let nilaiAkhir = 0
      for (const k of b.komponen) {
        if (k.efektif != null) nilaiAkhir += k.efektif * (k.bobot / 100)
      }
      const skala100 = Number(nilaiAkhir.toFixed(2))
      const { huruf } = nilaiKeHuruf(skala100)

      const ukByKode = new Map(b.komponen.map((k) => [k.kode_media, k.efektif]))

      items.push({
        no: no++,
        semester: `${b.semester} ${b.tahun}`,
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
