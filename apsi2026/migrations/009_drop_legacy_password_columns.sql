-- ============================================================================
-- MIGRATION 009 — Drop kolom legacy password & status dari mahasiswa/staff
-- Semua auth sudah pindah ke tabel `user` (Batch 4.5.A).
-- mahasiswa.sandi_hash + status_akun → tidak dipakai lagi
-- staff.sandi_hash + status_akun → tidak dipakai lagi
-- ============================================================================

-- mahasiswa
ALTER TABLE mahasiswa DROP COLUMN IF EXISTS sandi_hash;
ALTER TABLE mahasiswa DROP COLUMN IF EXISTS status_akun;

-- staff
ALTER TABLE staff DROP COLUMN IF EXISTS sandi_hash;
ALTER TABLE staff DROP COLUMN IF EXISTS status_akun;

-- Verifikasi struktur baru
-- DESC mahasiswa;
-- DESC staff;