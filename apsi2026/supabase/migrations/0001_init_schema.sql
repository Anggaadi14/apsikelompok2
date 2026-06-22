-- ============================================================================
-- SICPL — Postgres schema for Supabase (translated from migrations/004-014,
-- which targeted MySQL). Consolidates the OBE engine schema (mata_kuliah ->
-- cpmk -> indikator_kinerja -> cpl) plus auth-linkage via `app_user`.
--
-- Notes on deviations from the MySQL history:
--   - `user` is renamed to `app_user` (avoids quoting headaches: USER is a
--     reserved word in Postgres) and no longer stores email/password — those
--     live in Supabase's own auth.users. app_user is a 1:1 profile row keyed
--     by auth_user_id, carrying role + links to mahasiswa/staff.
--   - cpl.target_minimal is new: migrations 007-011 dropped the
--     `target_capaian` table without replacement, but app/page.tsx and the
--     mahasiswa CPL UI both assume a per-CPL minimum target (hardcoded 80 in
--     the UI). Restored as a column on `cpl` with default 80 so app/api/
--     mahasiswa/cpl can compute status without a constant in application
--     code.
--   - Views match migration 011 (latest recalc rules): CPMK->IK is AVG with
--     no weighting and only counts mata_kuliah.is_evaluator = true; IK->CPL
--     is a weighted sum via mapping_ik_cpl.bobot_persen.
-- ============================================================================

-- ── Enums ───────────────────────────────────────────────────────────────────

create type app_role as enum ('mahasiswa','dosen','kaprodi','jamu','admin');
create type staff_peran as enum ('admin','dosen','kaprodi','jamu');
create type app_user_status as enum ('aktif','nonaktif');
create type cpl_domain as enum ('Pengetahuan','Keterampilan Khusus','Keterampilan Umum','Sikap');
create type kelas_semester as enum ('Ganjil','Genap');
create type ta_semester as enum ('Ganjil','Genap','Pendek');
create type dosen_peran_kelas as enum ('koordinator','anggota');
create type data_bermasalah_jenis as enum (
  'mapping_ik_cpl_tidak_lengkap',
  'mapping_cpmk_ik_tidak_lengkap',
  'mapping_media_cpmk_kosong',
  'nim_tidak_terdaftar',
  'kode_mk_tidak_terdaftar',
  'kelas_tidak_ditemukan',
  'mhs_tidak_terdaftar_di_kelas',
  'bobot_total_tidak_100'
);
create type data_bermasalah_status as enum ('open','resolved','ignored');
create type upload_log_status as enum ('processing','success','partial','failed');

-- ── updated_at trigger helper ───────────────────────────────────────────────

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- nilai_detail uses `diupdate_at` instead of `updated_at`, so it gets its own
-- trigger function rather than overloading set_updated_at.
create function set_updated_at_diupdate() returns trigger as $$
begin
  new.diupdate_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Tier 0 — Master kurikulum, identitas mahasiswa/staff, app_user ─────────

create table kurikulum (
  id_kurikulum   serial primary key,
  kode           varchar(20)  not null unique,
  nama           varchar(255) not null,
  tahun_mulai    int not null,
  tahun_selesai  int null,
  is_active      boolean not null default false,
  deskripsi      text null,
  created_at     timestamptz not null default now()
);
create index idx_kurikulum_active on kurikulum (is_active);

create table mahasiswa (
  id_mahasiswa  serial primary key,
  nim           varchar(30)  not null unique,
  nama_mahasiswa varchar(150) not null,
  email_sso     varchar(150) not null unique,
  angkatan      int null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_mahasiswa_updated_at before update on mahasiswa
  for each row execute function set_updated_at();

create table staff (
  id_staff       serial primary key,
  nip_nidn_nik   varchar(30)  not null unique,
  nama_lengkap   varchar(150) not null,
  email_sso      varchar(150) not null unique,
  peran          staff_peran not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_staff_updated_at before update on staff
  for each row execute function set_updated_at();

-- 1:1 profile row per Supabase Auth identity. No password/email here —
-- Supabase manages those in auth.users.
create table app_user (
  id_user                serial primary key,
  auth_user_id           uuid not null unique references auth.users(id) on delete cascade,
  role                   app_role not null,
  status                 app_user_status not null default 'aktif',
  id_mahasiswa           int null references mahasiswa(id_mahasiswa) on delete set null,
  id_staff               int null references staff(id_staff) on delete set null,
  nama_input             varchar(150) null,
  force_password_change  boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_app_user_role_status on app_user (role, status);
create index idx_app_user_mahasiswa on app_user (id_mahasiswa);
create index idx_app_user_staff on app_user (id_staff);
create trigger trg_app_user_updated_at before update on app_user
  for each row execute function set_updated_at();

-- ── Tier 1 — CPL ─────────────────────────────────────────────────────────────

create table cpl (
  id_cpl          serial primary key,
  id_kurikulum    int not null references kurikulum(id_kurikulum) on delete cascade,
  kode_cpl        varchar(20) not null,
  singkatan       varchar(20) not null,
  domain          cpl_domain not null,
  deskripsi_id    text not null,
  deskripsi_en    text null,
  target_minimal  numeric(5,2) not null default 80,
  urutan          int not null default 0,
  unique (id_kurikulum, kode_cpl)
);

-- ── Tier 2 — Hirarki OBE: IK & CPMK dengan bobot ────────────────────────────

create table indikator_kinerja (
  id_ik         serial primary key,
  id_cpl        int not null references cpl(id_cpl) on delete cascade,
  kode_ik       varchar(20) not null,
  deskripsi     text not null,
  deskripsi_en  text null,
  urutan        int not null default 0,
  unique (id_cpl, kode_ik)
);

create table mapping_ik_cpl (
  id_ik         int not null references indikator_kinerja(id_ik) on delete cascade,
  id_cpl        int not null references cpl(id_cpl) on delete cascade,
  bobot_persen  numeric(6,3) not null default 0,
  primary key (id_ik, id_cpl)
);
create index idx_mic_cpl on mapping_ik_cpl (id_cpl);

create table mata_kuliah (
  id_mata_kuliah  serial primary key,
  kode_mk         varchar(30) not null unique,
  nama_mk         varchar(255) not null,
  nama_mk_en      varchar(255) null,
  sks             numeric(3,1) not null default 0,
  singkatan       varchar(20) null,
  is_evaluator    boolean not null default true,
  created_at      timestamptz not null default now()
);

create table kurikulum_mk (
  id_kurikulum     int not null references kurikulum(id_kurikulum) on delete cascade,
  id_mata_kuliah   int not null references mata_kuliah(id_mata_kuliah) on delete cascade,
  is_wajib         boolean not null default true,
  semester_default smallint null,
  primary key (id_kurikulum, id_mata_kuliah)
);

create table cpmk (
  id_cpmk         serial primary key,
  id_mata_kuliah  int not null references mata_kuliah(id_mata_kuliah) on delete cascade,
  kode_cpmk       varchar(30) not null,
  deskripsi_id    text not null,
  deskripsi_en    text null,
  urutan          int not null default 0,
  unique (id_mata_kuliah, kode_cpmk)
);
create index idx_cpmk_mk on cpmk (id_mata_kuliah);

create table mapping_cpmk_ik (
  id_cpmk       int not null references cpmk(id_cpmk) on delete cascade,
  id_ik         int not null references indikator_kinerja(id_ik) on delete cascade,
  bobot_persen  numeric(6,3) not null default 0,
  primary key (id_cpmk, id_ik)
);
create index idx_mci_ik on mapping_cpmk_ik (id_ik);

-- ── Tier 3 — Tahun akademik, kelas, dosen pengampu, enrollment ─────────────

create table tahun_akademik (
  id_tahun_akademik  serial primary key,
  kode               varchar(30) not null unique,
  tahun_mulai        smallint not null,
  tahun_selesai      smallint not null,
  semester           ta_semester not null,
  label              varchar(80) null,
  is_active          boolean not null default false,
  created_at         timestamptz default now(),
  unique (tahun_mulai, tahun_selesai, semester)
);
create index idx_ta_active on tahun_akademik (is_active);

create table kelas_mk (
  id_kelas           serial primary key,
  id_mata_kuliah     int not null references mata_kuliah(id_mata_kuliah) on delete cascade,
  id_kurikulum       int not null references kurikulum(id_kurikulum) on delete cascade,
  id_tahun_akademik  int null references tahun_akademik(id_tahun_akademik) on delete set null,
  tahun_akademik     varchar(20) not null,
  semester           kelas_semester not null,
  kode_kelas         varchar(5) not null,
  kuota              int null,
  unique (id_mata_kuliah, tahun_akademik, semester, kode_kelas)
);
create index idx_kelas_mk_ta on kelas_mk (id_tahun_akademik);
create index idx_kelas_mk_mk on kelas_mk (id_mata_kuliah);

create table mapping_dosen_kelas (
  id_kelas        int not null references kelas_mk(id_kelas) on delete cascade,
  id_staff        int not null references staff(id_staff) on delete cascade,
  peran_di_kelas  dosen_peran_kelas not null default 'anggota',
  primary key (id_kelas, id_staff)
);
create index idx_mdk_staff on mapping_dosen_kelas (id_staff);

create table mahasiswa_kelas (
  id_kelas      int not null references kelas_mk(id_kelas) on delete cascade,
  id_mahasiswa  int not null references mahasiswa(id_mahasiswa) on delete cascade,
  enrolled_at   timestamptz not null default now(),
  primary key (id_kelas, id_mahasiswa)
);
create index idx_mhsk_mahasiswa on mahasiswa_kelas (id_mahasiswa);

-- ── Tier 4 — Media asesmen (UK1..UK5) & nilai ──────────────────────────────

create table komponen_nilai (
  id_komponen        serial primary key,
  id_mata_kuliah     int not null references mata_kuliah(id_mata_kuliah) on delete cascade,
  kode_media         varchar(10) not null,
  nama_media         varchar(100) not null,
  bobot_terhadap_mk  numeric(6,3) not null default 0,
  urutan             int not null default 0,
  unique (id_mata_kuliah, kode_media)
);
create index idx_kn_mk on komponen_nilai (id_mata_kuliah);

create table mapping_media_cpmk (
  id_komponen   int not null references komponen_nilai(id_komponen) on delete cascade,
  id_cpmk       int not null references cpmk(id_cpmk) on delete cascade,
  bobot_persen  numeric(6,3) not null default 0,
  primary key (id_komponen, id_cpmk)
);
create index idx_mmc_cpmk on mapping_media_cpmk (id_cpmk);

create table nilai_detail (
  id_nilai             bigserial primary key,
  id_mahasiswa         int not null references mahasiswa(id_mahasiswa) on delete cascade,
  id_komponen          int not null references komponen_nilai(id_komponen) on delete cascade,
  id_kelas             int not null references kelas_mk(id_kelas) on delete cascade,
  nilai_asli           numeric(6,3) null,
  nilai_remedi         numeric(6,3) null,
  diinput_oleh_staff   int null references staff(id_staff) on delete set null,
  diinput_at           timestamptz not null default now(),
  diupdate_at          timestamptz not null default now(),
  catatan              varchar(255) null,
  unique (id_mahasiswa, id_komponen, id_kelas)
);
create index idx_nd_mhs on nilai_detail (id_mahasiswa);
create index idx_nd_kelas on nilai_detail (id_kelas);
create index idx_nd_komponen on nilai_detail (id_komponen);
create trigger trg_nilai_detail_updated_at before update on nilai_detail
  for each row execute function set_updated_at_diupdate();

-- ── Tier 5 — Sistem (audit & data bermasalah) ──────────────────────────────

create table data_bermasalah (
  id                      bigserial primary key,
  jenis_masalah           data_bermasalah_jenis not null,
  ref_table               varchar(50) null,
  ref_id                  varchar(100) null,
  detail                  jsonb null,
  status                  data_bermasalah_status not null default 'open',
  dibuat_at               timestamptz not null default now(),
  diselesaikan_at         timestamptz null,
  diselesaikan_oleh_user  int null references app_user(id_user) on delete set null,
  catatan                 text null
);
create index idx_db_status on data_bermasalah (status);
create index idx_db_jenis on data_bermasalah (jenis_masalah);

create table upload_log_nilai (
  id                  bigserial primary key,
  id_kelas            int null references kelas_mk(id_kelas) on delete set null,
  id_tahun_akademik   int null references tahun_akademik(id_tahun_akademik) on delete set null,
  id_staff_uploader   int null references staff(id_staff) on delete set null,
  nama_file           varchar(255) not null,
  token_siakad        varchar(255) null,
  token_valid         boolean null,
  jumlah_baris        int null,
  jumlah_berhasil     int null,
  jumlah_gagal        int null,
  status              upload_log_status not null default 'processing',
  detail              jsonb null,
  uploaded_at         timestamptz not null default now()
);
create index idx_ul_ta on upload_log_nilai (id_tahun_akademik);
create index idx_ul_kelas on upload_log_nilai (id_kelas);

-- ============================================================================
-- OBE engine views (mirrors migration 011 — latest recalc rules):
--   Level 1  UK    -> CPMK : weighted sum (komponen.bobot via mapping_media_cpmk)
--   Level 2  CPMK  -> IK   : AVG, no weighting, only mata_kuliah.is_evaluator
--   Level 3  IK    -> CPL  : weighted sum via mapping_ik_cpl.bobot_persen
-- ============================================================================

create view v_nilai_cpmk_per_mhs as
select
  nd.id_mahasiswa,
  nd.id_kelas,
  km.id_mata_kuliah,
  c.id_cpmk,
  c.kode_cpmk,
  sum(coalesce(nd.nilai_remedi, nd.nilai_asli, 0) * (mmc.bobot_persen / 100.0)) as nilai_cpmk
from nilai_detail nd
join komponen_nilai kn on kn.id_komponen = nd.id_komponen
join mapping_media_cpmk mmc on mmc.id_komponen = kn.id_komponen
join cpmk c on c.id_cpmk = mmc.id_cpmk
join kelas_mk km on km.id_kelas = nd.id_kelas
where c.id_mata_kuliah = km.id_mata_kuliah
group by nd.id_mahasiswa, nd.id_kelas, c.id_cpmk, c.kode_cpmk, km.id_mata_kuliah;

create view v_nilai_ik_per_mhs as
select
  vcpmk.id_mahasiswa,
  mci.id_ik,
  ik.kode_ik,
  ik.id_cpl,
  avg(vcpmk.nilai_cpmk) as nilai_ik
from v_nilai_cpmk_per_mhs vcpmk
join mata_kuliah mk on mk.id_mata_kuliah = vcpmk.id_mata_kuliah and mk.is_evaluator = true
join mapping_cpmk_ik mci on mci.id_cpmk = vcpmk.id_cpmk
join indikator_kinerja ik on ik.id_ik = mci.id_ik
group by vcpmk.id_mahasiswa, mci.id_ik, ik.kode_ik, ik.id_cpl;

create view v_nilai_cpl_per_mhs as
select
  vik.id_mahasiswa,
  mic.id_cpl,
  c.kode_cpl,
  c.singkatan,
  c.id_kurikulum,
  c.target_minimal,
  sum(vik.nilai_ik * (mic.bobot_persen / 100.0)) as nilai_cpl
from v_nilai_ik_per_mhs vik
join mapping_ik_cpl mic on mic.id_ik = vik.id_ik
join cpl c on c.id_cpl = mic.id_cpl
group by vik.id_mahasiswa, mic.id_cpl, c.kode_cpl, c.singkatan, c.id_kurikulum, c.target_minimal;
