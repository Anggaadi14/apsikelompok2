import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/app/lib/db'
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

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['mahasiswa'])
    const idMahasiswa = session.id
    const db = getDb()

    const [rows] = await db.execute(
      `SELECT 
        nd.id_komponen, nd.nilai_asli, nd.nilai_remedi,
        nd.tahun_akademik, nd.semester,
        kn.nama_komponen, kn.bobot_non_cpmk,
        mk.id_mk, mk.kode_mk, mk.nama_mk, mk.sks
       FROM nilai_detail nd
       JOIN komponen_nilai kn ON kn.id_komponen = nd.id_komponen
       JOIN mata_kuliah mk ON mk.id_mk = kn.id_mk
       WHERE nd.id_mahasiswa = ?
       ORDER BY nd.tahun_akademik, nd.semester, mk.kode_mk, kn.id_komponen`,
      [idMahasiswa],
    )

    interface Bucket {
      semester: string
      tahun: string
      mk: { id: number; kode: string; nama: string; sks: number }
      komponen: Array<{ nama: string; bobot: number; efektif: number | null }>
    }
    const buckets = new Map<string, Bucket>()

    for (const r of rows as any[]) {
      const key = `${r.tahun_akademik}::${r.semester}::${r.id_mk}`
      let b = buckets.get(key)
      if (!b) {
        b = {
          semester: r.semester,
          tahun: r.tahun_akademik,
          mk: {
            id: r.id_mk,
            kode: r.kode_mk,
            nama: r.nama_mk,
            sks: Number(r.sks),
          },
          komponen: [],
        }
        buckets.set(key, b)
      }
      const efektif =
        r.nilai_remedi != null
          ? Number(r.nilai_remedi)
          : r.nilai_asli != null
          ? Number(r.nilai_asli)
          : null
      b.komponen.push({
        nama: r.nama_komponen,
        bobot: Number(r.bobot_non_cpmk),
        efektif,
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

      const ukSlots: Array<number | null> = [null, null, null, null, null]
      b.komponen.slice(0, 5).forEach((k, i) => {
        ukSlots[i] = k.efektif
      })

      items.push({
        no: no++,
        semester: `${b.semester} ${b.tahun}`,
        kode: b.mk.kode,
        nama: b.mk.nama,
        sks: b.mk.sks,
        uk1: ukSlots[0],
        uk2: ukSlots[1],
        uk3: ukSlots[2],
        uk4: ukSlots[3],
        uk5: ukSlots[4],
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
        ...(process.env.NODE_ENV !== 'production' && err instanceof Error
          ? { detail: err.message }
          : {}),
      },
      { status: 500 },
    )
  }
}