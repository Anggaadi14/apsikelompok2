-- ============================================================================
-- Enable RLS on every table, with NO policies for anon/authenticated.
--
-- Why this is sufficient here: the app's data access pattern is unchanged by
-- this migration — every read/write still goes through Next.js Route
-- Handlers (app/api/**), which keep doing their own requireRole() checks
-- exactly like before. Those Route Handlers connect using the Supabase
-- service_role key, which bypasses RLS by design (it's never exposed to the
-- browser). Without RLS enabled, every table here would otherwise be
-- world-readable/writable through Supabase's auto-generated PostgREST API
-- using nothing but the public anon key — RLS-with-no-policies closes that
-- hole without requiring any per-role policy design, since no client ever
-- queries Postgres directly with the anon/authenticated role.
--
-- If a future feature needs the browser to query Supabase directly (bypassing
-- the Next.js API layer), add scoped policies for that specific table then.
-- ============================================================================

alter table kurikulum            enable row level security;
alter table mahasiswa            enable row level security;
alter table staff                enable row level security;
alter table app_user             enable row level security;
alter table cpl                  enable row level security;
alter table indikator_kinerja    enable row level security;
alter table mapping_ik_cpl       enable row level security;
alter table mata_kuliah          enable row level security;
alter table kurikulum_mk         enable row level security;
alter table cpmk                 enable row level security;
alter table mapping_cpmk_ik      enable row level security;
alter table tahun_akademik       enable row level security;
alter table kelas_mk             enable row level security;
alter table mapping_dosen_kelas  enable row level security;
alter table mahasiswa_kelas      enable row level security;
alter table komponen_nilai       enable row level security;
alter table mapping_media_cpmk   enable row level security;
alter table nilai_detail         enable row level security;
alter table data_bermasalah      enable row level security;
alter table upload_log_nilai     enable row level security;
