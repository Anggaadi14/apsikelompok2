// app/api/mahasiswa/profile/route.ts
//
// GET /api/mahasiswa/profile — profil mahasiswa yang sedang login.

import { requireRole, handleAuthError, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { nilaiKeHuruf } from '@/app/lib/grading'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(request, ['mahasiswa'])
    if (!session.id_mahasiswa) {
      return Response.json(
        { success: false, error: 'INVALID_SESSION', message: 'Sesi mahasiswa tidak memiliki id_mahasiswa. Silakan logout dan login ulang.' },
        { status: 401 },
      )
    }

    const admin = createSupabaseAdminClient()
    const idMahasiswa = session.id_mahasiswa

    const { data: mhs, error: mhsErr } = await admin
      .from('mahasiswa')
      .select('id_mahasiswa, nim, nama_mahasiswa, angkatan')
      .eq('id_mahasiswa', idMahasiswa)
      .maybeSingle<{ id_mahasiswa: number; nim: string; nama_mahasiswa: string; angkatan: number | null }>()
    if (mhsErr) throw mhsErr
    if (!mhs) {
      return Response.json(
        { success: false, error: 'NOT_FOUND', message: `Mahasiswa dengan id_mahasiswa ${idMahasiswa} tidak ditemukan di database.` },
        { status: 404 },
      )
    }

    // Nilai per komponen mahasiswa ini, dengan bobot & MK terkait (utk nilai akhir per MK + IPK).
    const { data: nilaiRows, error: nilaiErr } = await admin
      .from('nilai_detail')
      .select(
        `nilai_asli, nilai_remedi,
         id_kelas,
         komponen_nilai:id_komponen ( bobot_terhadap_mk, id_mata_kuliah ),
         kelas:kelas_mk ( tahun_akademik, semester )`,
      )
      .eq('id_mahasiswa', idMahasiswa)
    if (nilaiErr) throw nilaiErr

    type Row = {
      nilai_asli: number | null
      nilai_remedi: number | null
      id_kelas: number
      komponen_nilai: { bobot_terhadap_mk: number; id_mata_kuliah: number } | null
      kelas: { tahun_akademik: string; semester: string } | null
    }

    const mkAgg = new Map<number, number>() // id_mata_kuliah -> nilai akhir (sum efektif*bobot/100)
    const terms = new Set<string>()

    for (const r of (nilaiRows ?? []) as unknown as Row[]) {
      if (r.kelas) terms.add(`${r.kelas.tahun_akademik}::${r.kelas.semester}`)
      if (!r.komponen_nilai) continue
      const efektif = r.nilai_remedi ?? r.nilai_asli
      if (efektif == null) continue
      const kontrib = Number(efektif) * (Number(r.komponen_nilai.bobot_terhadap_mk) / 100)
      mkAgg.set(r.komponen_nilai.id_mata_kuliah, (mkAgg.get(r.komponen_nilai.id_mata_kuliah) ?? 0) + kontrib)
    }

    const idMataKuliah = [...mkAgg.keys()]
    let ipk = 0
    if (idMataKuliah.length > 0) {
      const { data: mkRows, error: mkErr } = await admin
        .from('mata_kuliah')
        .select('id_mata_kuliah, sks')
        .in('id_mata_kuliah', idMataKuliah)
      if (mkErr) throw mkErr

      let totalMutu = 0
      let totalSKS = 0
      for (const mk of mkRows ?? []) {
        const nilaiAngka = mkAgg.get(mk.id_mata_kuliah) ?? 0
        const { bobot } = nilaiKeHuruf(nilaiAngka)
        totalMutu += bobot * Number(mk.sks)
        totalSKS += Number(mk.sks)
      }
      ipk = totalSKS > 0 ? Math.round((totalMutu / totalSKS) * 100) / 100 : 0
    }

    return Response.json({
      success: true,
      data: {
        nim: mhs.nim,
        nama_mahasiswa: mhs.nama_mahasiswa,
        angkatan: mhs.angkatan,
        semester_aktif: terms.size || 1,
        ipk,
        prodi: session.prodi,
      },
    })
  } catch (error) {
    const authResp = handleAuthError(error)
    if (authResp) return authResp
    console.error('[API] GET /mahasiswa/profile error:', error)
    return serverError(error instanceof Error ? error.message : String(error))
  }
}
