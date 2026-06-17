-- 010_bilingual_fields.sql
-- Arahan notulen Pak Ucup (16 Jun 2026): deskripsi IK & nama MK harus dwibahasa (ID + EN).
-- CPL & CPMK sudah punya deskripsi_id + deskripsi_en, jadi yang ditambah hanya IK & Mata Kuliah.
-- Kolom lama (deskripsi / nama_mk) diperlakukan sebagai versi Indonesia; EN opsional (boleh diisi belakangan).

-- 1) Indikator Kinerja: tambah deskripsi versi Inggris
ALTER TABLE indikator_kinerja
  ADD COLUMN IF NOT EXISTS deskripsi_en TEXT NULL AFTER deskripsi;

-- 2) Mata Kuliah: tambah nama versi Inggris
ALTER TABLE mata_kuliah
  ADD COLUMN IF NOT EXISTS nama_mk_en VARCHAR(255) NULL AFTER nama_mk;