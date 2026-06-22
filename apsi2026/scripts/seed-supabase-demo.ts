// scripts/seed-supabase-demo.ts
//
// Minimal smoke-test dataset for the Supabase migration: one kurikulum, one
// CPL -> IK -> CPMK chain, one mata kuliah with two komponen nilai, one
// kelas with one enrolled mahasiswa and graded nilai_detail, plus the
// kaprodi/jamu/admin/dosen accounts (mirrors the old scripts/seed-users.ts).
//
// This does NOT replace scripts/seed-1..5 (those import the *real*
// curriculum from scripts/data/*.xlsx and still need porting to Supabase
// separately) — it exists purely to have something to log in with and look
// at while verifying the migration end-to-end.
//
// Run: npx tsx scripts/seed-supabase-demo.ts

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const admin = createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = 'demo123'

async function ensureAuthUser(email: string, password: string) {
  let res = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (!res.data?.user) {
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error && !error.message.toLowerCase().includes('already')) throw error
    res = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  }
  const id = res.data!.user!.id
  // Pastikan password selalu sinkron ke DEMO_PASSWORD (idempotent re-run).
  // generateLink({type:'magiclink'}) auto-creates the user but does NOT mark
  // the email confirmed, and signInWithPassword refuses unconfirmed emails.
  await admin.auth.admin.updateUserById(id, { password, email_confirm: true })
  return id
}

async function ensureAppUser(params: {
  authUserId: string
  email: string
  role: string
  nama: string
  id_mahasiswa?: number | null
  id_staff?: number | null
}) {
  const { data: existing } = await admin.from('app_user').select('id_user').eq('auth_user_id', params.authUserId).maybeSingle()
  if (existing) {
    await admin
      .from('app_user')
      .update({ role: params.role, status: 'aktif', id_mahasiswa: params.id_mahasiswa ?? null, id_staff: params.id_staff ?? null })
      .eq('id_user', existing.id_user)
    return existing.id_user as number
  }
  const { data: ins, error } = await admin
    .from('app_user')
    .insert({
      auth_user_id: params.authUserId,
      email: params.email,
      role: params.role,
      status: 'aktif',
      verified_at: new Date().toISOString(),
      id_mahasiswa: params.id_mahasiswa ?? null,
      id_staff: params.id_staff ?? null,
      nama_input: params.nama,
    })
    .select('id_user')
    .single()
  if (error) throw error
  return ins.id_user as number
}

async function upsert<T extends Record<string, unknown>>(
  table: string,
  match: Partial<T>,
  values: T,
  pk: string,
): Promise<number> {
  const { data: existing } = await admin.from(table).select(pk).match(match as any).maybeSingle()
  const existingRow = existing as Record<string, number> | null
  if (existingRow) {
    await admin.from(table).update(values as any).match(match as any)
    return existingRow[pk]
  }
  const { data: ins, error } = await admin.from(table).insert(values as any).select(pk).single()
  if (error) throw error
  return (ins as unknown as Record<string, number>)[pk]
}

async function main() {
  console.log('🚀 Seeding demo data ke Supabase...\n')

  // ── Tahun akademik ──────────────────────────────────────────────────────
  const TA_ROWS = [
    { kode: '2024/2025-Ganjil', tahun_mulai: 2024, tahun_selesai: 2025, semester: 'Ganjil', label: '2024/2025 Ganjil', is_active: true },
    { kode: '2024/2025-Genap', tahun_mulai: 2024, tahun_selesai: 2025, semester: 'Genap', label: '2024/2025 Genap', is_active: false },
  ]
  let idTa = 0
  for (const ta of TA_ROWS) {
    const id = await upsert('tahun_akademik', { kode: ta.kode }, ta, 'id_tahun_akademik')
    if (ta.is_active) idTa = id
  }
  console.log('✓ tahun_akademik')

  // ── Kurikulum ────────────────────────────────────────────────────────────
  const idKurikulum = await upsert(
    'kurikulum',
    { kode: 'K24' },
    { kode: 'K24', nama: 'Kurikulum 2024 OBE', tahun_mulai: 2024, tahun_selesai: null, is_active: true, deskripsi: 'Demo seed' },
    'id_kurikulum',
  )
  console.log('✓ kurikulum K24 =', idKurikulum)

  // ── CPL ──────────────────────────────────────────────────────────────────
  const idCpl = await upsert(
    'cpl',
    { id_kurikulum: idKurikulum, kode_cpl: '1' },
    {
      id_kurikulum: idKurikulum,
      kode_cpl: '1',
      singkatan: 'P1',
      domain: 'Pengetahuan',
      deskripsi_id: 'Menguasai konsep dasar rekayasa sistem industri.',
      target_minimal: 80,
      urutan: 1,
    },
    'id_cpl',
  )
  console.log('✓ cpl =', idCpl)

  // ── IK ───────────────────────────────────────────────────────────────────
  const idIk = await upsert(
    'indikator_kinerja',
    { id_cpl: idCpl, kode_ik: 'I-1' },
    { id_cpl: idCpl, kode_ik: 'I-1', deskripsi: 'Mampu menjelaskan konsep dasar rekayasa industri.', urutan: 1 },
    'id_ik',
  )
  await admin.from('mapping_ik_cpl').upsert({ id_ik: idIk, id_cpl: idCpl, bobot_persen: 100 })
  console.log('✓ indikator_kinerja =', idIk)

  // ── Mata kuliah + komponen nilai ─────────────────────────────────────────
  const idMk = await upsert(
    'mata_kuliah',
    { kode_mk: 'TIO1001' },
    { kode_mk: 'TIO1001', nama_mk: 'Pengantar Teknik Industri', sks: 2, singkatan: 'PTI', is_evaluator: true },
    'id_mata_kuliah',
  )
  await admin.from('kurikulum_mk').upsert({ id_kurikulum: idKurikulum, id_mata_kuliah: idMk, is_wajib: true, semester_default: 1 })
  console.log('✓ mata_kuliah =', idMk)

  const idUk1 = await upsert(
    'komponen_nilai',
    { id_mata_kuliah: idMk, kode_media: 'UK1' },
    { id_mata_kuliah: idMk, kode_media: 'UK1', nama_media: 'Tugas', bobot_terhadap_mk: 40, urutan: 1 },
    'id_komponen',
  )
  const idUk2 = await upsert(
    'komponen_nilai',
    { id_mata_kuliah: idMk, kode_media: 'UK2' },
    { id_mata_kuliah: idMk, kode_media: 'UK2', nama_media: 'UAS', bobot_terhadap_mk: 60, urutan: 2 },
    'id_komponen',
  )
  console.log('✓ komponen_nilai UK1/UK2')

  // ── CPMK + mapping ───────────────────────────────────────────────────────
  const idCpmk = await upsert(
    'cpmk',
    { id_mata_kuliah: idMk, kode_cpmk: 'PTI-1' },
    { id_mata_kuliah: idMk, kode_cpmk: 'PTI-1', deskripsi_id: 'Mahasiswa mampu menjelaskan ruang lingkup teknik industri.', urutan: 1 },
    'id_cpmk',
  )
  await admin.from('mapping_cpmk_ik').upsert({ id_cpmk: idCpmk, id_ik: idIk, bobot_persen: 100 })
  await admin.from('mapping_media_cpmk').upsert({ id_komponen: idUk1, id_cpmk: idCpmk, bobot_persen: 40 })
  await admin.from('mapping_media_cpmk').upsert({ id_komponen: idUk2, id_cpmk: idCpmk, bobot_persen: 60 })
  console.log('✓ cpmk =', idCpmk)

  // ── Kelas + dosen pengampu ───────────────────────────────────────────────
  const staffSeeds = [
    { email: 'kaprodi1@sicpl.test', nama: 'Dr. Kaprodi Satu, S.T., M.T.', nip: 'KP001', role: 'kaprodi' },
    { email: 'jamu1@sicpl.test', nama: 'Tim Jamu Satu, S.T., M.T.', nip: 'JM001', role: 'jamu' },
    { email: 'admin1@sicpl.test', nama: 'Admin Prodi Satu', nip: 'AD001', role: 'admin' },
    { email: 'dosen1@sicpl.test', nama: 'Dr. Dosen Satu, S.T., M.T.', nip: 'DS001', role: 'dosen' },
  ] as const

  let idStaffDosen = 0
  for (const s of staffSeeds) {
    const idStaff = await upsert(
      'staff',
      { nip_nidn_nik: s.nip },
      { nip_nidn_nik: s.nip, nama_lengkap: s.nama, email_sso: s.email, peran: s.role },
      'id_staff',
    )
    const authId = await ensureAuthUser(s.email, DEMO_PASSWORD)
    await ensureAppUser({ authUserId: authId, email: s.email, role: s.role, nama: s.nama, id_staff: idStaff })
    if (s.role === 'dosen') idStaffDosen = idStaff
    console.log(`✓ staff+app_user ${s.role} (${s.email})`)
  }

  const idKelas = await upsert(
    'kelas_mk',
    { id_mata_kuliah: idMk, tahun_akademik: '2024/2025', semester: 'Ganjil', kode_kelas: 'A' },
    {
      id_mata_kuliah: idMk,
      id_kurikulum: idKurikulum,
      id_tahun_akademik: idTa || null,
      tahun_akademik: '2024/2025',
      semester: 'Ganjil',
      kode_kelas: 'A',
      kuota: 40,
    },
    'id_kelas',
  )
  await admin.from('mapping_dosen_kelas').upsert({ id_kelas: idKelas, id_staff: idStaffDosen, peran_di_kelas: 'koordinator' })
  console.log('✓ kelas_mk =', idKelas)

  // ── Mahasiswa + enrollment + nilai ───────────────────────────────────────
  const idMahasiswa = await upsert(
    'mahasiswa',
    { nim: 'I0320045' },
    { nim: 'I0320045', nama_mahasiswa: 'Ahmad Fadli', email_sso: 'mahasiswa1@sicpl.test', angkatan: 2024 },
    'id_mahasiswa',
  )
  await admin.from('mahasiswa_kelas').upsert({ id_kelas: idKelas, id_mahasiswa: idMahasiswa })

  const authIdMhs = await ensureAuthUser('mahasiswa1@sicpl.test', DEMO_PASSWORD)
  await ensureAppUser({ authUserId: authIdMhs, email: 'mahasiswa1@sicpl.test', role: 'mahasiswa', nama: 'Ahmad Fadli', id_mahasiswa: idMahasiswa })
  console.log('✓ mahasiswa + app_user (mahasiswa1@sicpl.test)')

  await admin.from('nilai_detail').upsert(
    { id_mahasiswa: idMahasiswa, id_komponen: idUk1, id_kelas: idKelas, nilai_asli: 80 },
    { onConflict: 'id_mahasiswa,id_komponen,id_kelas' },
  )
  await admin.from('nilai_detail').upsert(
    { id_mahasiswa: idMahasiswa, id_komponen: idUk2, id_kelas: idKelas, nilai_asli: 75 },
    { onConflict: 'id_mahasiswa,id_komponen,id_kelas' },
  )
  console.log('✓ nilai_detail (UK1=80, UK2=75 -> nilai akhir MK = 77)')

  console.log('\n✅ Demo seed selesai. Login dengan:')
  console.log('   mahasiswa: NIM I0320045 / password demo123')
  console.log('   kaprodi:   kaprodi1@sicpl.test / demo123')
  console.log('   jamu:      jamu1@sicpl.test / demo123')
  console.log('   admin:     admin1@sicpl.test / demo123')
  console.log('   dosen:     dosen1@sicpl.test / demo123')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Seed gagal:', e)
    process.exit(1)
  })
