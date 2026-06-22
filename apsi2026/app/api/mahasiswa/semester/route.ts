// app/api/mahasiswa/semester/route.ts
//
// GET /api/mahasiswa/semester — daftar semester yang pernah diambil mahasiswa
// ini, dipakai oleh dropdown semester di Navbar. Diturunkan dari kombinasi
// unik (kelas_mk.tahun_akademik, kelas_mk.semester) lewat nilai_detail.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { formatSemester } from '@/app/lib/grading'

type Row = { kelas: { tahun_akademik: string; semester: string } | null }

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(request, ['mahasiswa'])
    if (!session.id_mahasiswa) {
      return NextResponse.json({ success: true, data: ['Ganjil 2024/2025'] })
    }

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('nilai_detail')
      .select('kelas:kelas_mk ( tahun_akademik, semester )')
      .eq('id_mahasiswa', session.id_mahasiswa)
    if (error) throw error

    const seen = new Set<string>()
    for (const r of (data ?? []) as unknown as Row[]) {
      if (r.kelas) seen.add(`${r.kelas.semester}::${r.kelas.tahun_akademik}`)
    }

    if (seen.size === 0) {
      return NextResponse.json({ success: true, data: ['Ganjil 2024/2025'] })
    }

    const daftarSemester = [...seen]
      .map((key) => {
        const [semester, tahun] = key.split('::')
        return { semester, tahun }
      })
      .sort((a, b) => {
        if (a.tahun !== b.tahun) return b.tahun.localeCompare(a.tahun)
        return a.semester.toLowerCase() === 'ganjil' ? -1 : 1
      })
      .map((s) => formatSemester(s.semester, s.tahun))

    return NextResponse.json({ success: true, data: daftarSemester })
  } catch (error) {
    const a = handleAuthError(error)
    if (a) return a
    console.error('[API] GET /mahasiswa/semester error:', error)
    return serverError(error instanceof Error ? error.message : String(error))
  }
}
