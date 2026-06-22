import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>
type KelasRow = {
  id_kelas: number
  kode_kelas: string
  tahun_akademik: string
  semester: string
  id_kurikulum: number
  id_mata_kuliah: number
  mata_kuliah?: { kode_mk?: string | null; nama_mk?: string | null } | null
}
type IkDbRow = {
  id_ik: number
  id_cpl: number
  kode_ik: string
  deskripsi: string
  cpl?: { kode_cpl?: string | null; target_minimal?: number | string | null } | null
}
type CriticalIkRow = { kode: string; nilai: number; target: number; deskripsi: string; cpl: string }
type NilaiIkRow = { id_ik: number; nilai_ik: number | string }
type UploadRow = { id_kelas: number; status: string }

export type ObeFilter = {
  ta?: string
  sem?: string
  kur?: string
  angkatan?: string
  cpl?: string
  mk?: string
  kelas?: string
}

export async function resolveDashboardKurikulum(admin: AdminClient, kur?: string): Promise<number | null> {
  const clean = (kur ?? '').trim()
  if (clean && clean !== 'Semua') {
    const { data } = await admin
      .from('kurikulum')
      .select('id_kurikulum')
      .or(`kode.eq.${clean},id_kurikulum.eq.${Number(clean) || 0},tahun_mulai.eq.${Number(clean) || 0}`)
      .maybeSingle()
    if (data) return data.id_kurikulum
  }

  const { data: active } = await admin
    .from('kurikulum')
    .select('id_kurikulum')
    .eq('is_active', true)
    .order('tahun_mulai', { ascending: false })
    .limit(1)
    .maybeSingle()
  return active?.id_kurikulum ?? null
}

function isAll(value?: string | null) {
  return !value || value === 'Semua'
}

function pct(n: number) {
  return Math.round(n * 10) / 10
}

function kodeCplLabel(kode: string) {
  return kode.toUpperCase().startsWith('CPL') ? kode : `CPL-${kode}`
}

export async function getObeDashboardData(admin: AdminClient, filter: ObeFilter) {
  const idKurikulum = await resolveDashboardKurikulum(admin, filter.kur)

  const [
    { data: kurikulumRows },
    { data: taRows },
    { data: angkatanRows },
    { data: mkRows },
    { data: kelasRows },
  ] = await Promise.all([
    admin.from('kurikulum').select('id_kurikulum, kode, nama, tahun_mulai, is_active').order('tahun_mulai', { ascending: false }),
    admin.from('tahun_akademik').select('kode, semester, label, is_active, tahun_mulai').order('tahun_mulai', { ascending: false }),
    admin.from('mahasiswa').select('angkatan').not('angkatan', 'is', null).order('angkatan', { ascending: false }),
    admin.from('mata_kuliah').select('id_mata_kuliah, kode_mk, nama_mk').order('kode_mk'),
    admin
      .from('kelas_mk')
      .select('id_kelas, kode_kelas, tahun_akademik, semester, id_kurikulum, id_mata_kuliah, mata_kuliah:id_mata_kuliah(kode_mk, nama_mk)')
      .order('tahun_akademik', { ascending: false }),
  ])

  const cplQuery = admin
    .from('cpl')
    .select('id_cpl, kode_cpl, singkatan, domain, deskripsi_id, target_minimal, urutan, id_kurikulum')
    .order('urutan')
  const { data: cplRows, error: cplErr } = idKurikulum ? await cplQuery.eq('id_kurikulum', idKurikulum) : await cplQuery
  if (cplErr) throw cplErr

  let cpls = cplRows ?? []
  if (!isAll(filter.cpl)) {
    cpls = cpls.filter((c) => c.kode_cpl === filter.cpl || kodeCplLabel(c.kode_cpl) === filter.cpl)
  }
  const cplIds = cpls.map((c) => c.id_cpl)

  const selectedKelas = ((kelasRows ?? []) as KelasRow[]).filter((k) => {
    if (idKurikulum && k.id_kurikulum !== idKurikulum) return false
    if (!isAll(filter.ta) && k.tahun_akademik !== filter.ta) return false
    if (!isAll(filter.sem) && k.semester !== filter.sem) return false
    if (!isAll(filter.mk) && String(k.id_mata_kuliah) !== filter.mk && k.mata_kuliah?.kode_mk !== filter.mk) return false
    if (!isAll(filter.kelas) && String(k.id_kelas) !== filter.kelas && k.kode_kelas !== filter.kelas) return false
    return true
  })
  const selectedKelasIds = selectedKelas.map((k) => k.id_kelas)

  let mahasiswaIds: number[] | null = null
  if (!isAll(filter.angkatan)) {
    const { data } = await admin.from('mahasiswa').select('id_mahasiswa').eq('angkatan', Number(filter.angkatan))
    mahasiswaIds = (data ?? []).map((m) => m.id_mahasiswa)
  }

  let nilaiCplQuery = admin.from('v_nilai_cpl_per_mhs').select('id_mahasiswa, id_cpl, nilai_cpl')
  if (idKurikulum) nilaiCplQuery = nilaiCplQuery.eq('id_kurikulum', idKurikulum)
  if (cplIds.length) nilaiCplQuery = nilaiCplQuery.in('id_cpl', cplIds)
  if (mahasiswaIds) {
    if (mahasiswaIds.length === 0) nilaiCplQuery = nilaiCplQuery.eq('id_mahasiswa', -1)
    else nilaiCplQuery = nilaiCplQuery.in('id_mahasiswa', mahasiswaIds)
  }
  const { data: nilaiCplRows, error: nilaiCplErr } = await nilaiCplQuery
  if (nilaiCplErr) throw nilaiCplErr

  const cplAgg = new Map<number, { sum: number; count: number }>()
  for (const row of nilaiCplRows ?? []) {
    const cur = cplAgg.get(row.id_cpl) ?? { sum: 0, count: 0 }
    cur.sum += Number(row.nilai_cpl)
    cur.count += 1
    cplAgg.set(row.id_cpl, cur)
  }

  const targetRealisasiCPL = cpls.map((c) => {
    const agg = cplAgg.get(c.id_cpl)
    return {
      id: kodeCplLabel(c.kode_cpl),
      name: c.singkatan || c.domain,
      target: Number(c.target_minimal),
      realisasi: agg && agg.count > 0 ? pct(agg.sum / agg.count) : 0,
      deskripsi: c.deskripsi_id,
    }
  })

  const avgCpl = targetRealisasiCPL.length
    ? targetRealisasiCPL.reduce((acc, c) => acc + c.realisasi, 0) / targetRealisasiCPL.length
    : 0
  const cplTercapai = targetRealisasiCPL.filter((c) => c.realisasi >= c.target && c.realisasi > 0)
  const cplBelum = targetRealisasiCPL.filter((c) => c.realisasi < c.target)
  const criticalCpl = cplBelum.slice(0, 5)

  const { data: ikRows } = cplIds.length
    ? await admin.from('indikator_kinerja').select('id_ik, id_cpl, kode_ik, deskripsi, cpl:id_cpl(kode_cpl, target_minimal)').in('id_cpl', cplIds)
    : { data: [] as IkDbRow[] }
  const typedIkRows = (ikRows ?? []) as IkDbRow[]
  const ikIds = typedIkRows.map((ik) => ik.id_ik)
  const { data: nilaiIkRows } = ikIds.length
    ? await admin.from('v_nilai_ik_per_mhs').select('id_ik, nilai_ik').in('id_ik', ikIds)
    : { data: [] as NilaiIkRow[] }
  const ikAgg = new Map<number, { sum: number; count: number }>()
  for (const row of (nilaiIkRows ?? []) as NilaiIkRow[]) {
    const cur = ikAgg.get(row.id_ik) ?? { sum: 0, count: 0 }
    cur.sum += Number(row.nilai_ik)
    cur.count += 1
    ikAgg.set(row.id_ik, cur)
  }
  const criticalIk = typedIkRows
    .map((ik: IkDbRow) => {
      const agg = ikAgg.get(ik.id_ik)
      const nilai = agg && agg.count > 0 ? pct(agg.sum / agg.count) : 0
      const target = Number(ik.cpl?.target_minimal ?? 80)
      return { kode: ik.kode_ik, nilai, target, deskripsi: ik.deskripsi, cpl: kodeCplLabel(ik.cpl?.kode_cpl ?? '') }
    })
    .filter((ik: CriticalIkRow) => ik.nilai < ik.target)
    .sort((a: CriticalIkRow, b: CriticalIkRow) => a.nilai - b.nilai)
    .slice(0, 5)

  const { data: uploadRows } = selectedKelasIds.length
    ? await admin.from('upload_log_nilai').select('id_kelas, status').eq('status', 'success').in('id_kelas', selectedKelasIds)
    : { data: [] as UploadRow[] }
  const uploaded = new Set(((uploadRows ?? []) as UploadRow[]).map((u) => u.id_kelas))
  const incompleteClasses = selectedKelas
    .filter((k) => !uploaded.has(k.id_kelas))
    .slice(0, 5)
    .map((k) => ({
      id_kelas: k.id_kelas,
      label: `${k.mata_kuliah?.nama_mk ?? 'Mata kuliah'} (Kelas ${k.kode_kelas})`,
      status: 'Nilai Belum Upload',
    }))

  const options = {
    tahun: Array.from(new Set([...(taRows ?? []).map((t) => `${t.tahun_mulai}/${Number(t.tahun_mulai) + 1}`), ...((kelasRows ?? []) as KelasRow[]).map((k) => k.tahun_akademik)].filter(Boolean))),
    semester: Array.from(new Set([...(taRows ?? []).map((t) => t.semester), ...((kelasRows ?? []) as KelasRow[]).map((k) => k.semester)].filter(Boolean))),
    kurikulum: (kurikulumRows ?? []).map((k) => ({ value: k.kode, label: `${k.kode} - ${k.nama}` })),
    angkatan: Array.from(new Set((angkatanRows ?? []).map((m) => m.angkatan).filter(Boolean))).map(String),
    cpl: cplRows?.map((c) => ({ value: c.kode_cpl, label: `${kodeCplLabel(c.kode_cpl)} - ${c.singkatan}` })) ?? [],
    mata_kuliah: (mkRows ?? []).map((m) => ({ value: String(m.id_mata_kuliah), label: `${m.kode_mk} - ${m.nama_mk}` })),
    kelas: selectedKelas.map((k) => ({ value: String(k.id_kelas), label: `${k.mata_kuliah?.kode_mk ?? ''} ${k.kode_kelas} - ${k.tahun_akademik} ${k.semester}` })),
  }

  return {
    options,
    stats: {
      rata_cpl: pct(avgCpl),
      cpl_tercapai: cplTercapai.length,
      cpl_total: targetRealisasiCPL.length,
      cpl_belum: cplBelum.length,
      cpl_belum_label: cplBelum.slice(0, 3).map((c) => c.id).join(', ') || '-',
      ik_bermasalah: criticalIk.length,
      mk_belum_upload: incompleteClasses.length,
    },
    targetRealisasiCPL,
    criticalCpl,
    criticalIk,
    incompleteClasses,
    filter: { ...filter, id_kurikulum: idKurikulum },
  }
}
