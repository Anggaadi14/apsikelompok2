-- 010_ik_bilingual.sql
-- Arahan dosen: deskripsi Indikator Kinerja (IK) harus bilingual (ID + EN).
-- Pendekatan minimal & kompatibel: kolom `deskripsi` lama TETAP dipakai sebagai
-- versi Indonesia, cukup tambah `deskripsi_en` (boleh NULL). Tidak ada kode lama
-- yang rusak (mahasiswa/cpl route & CplView tetap baca kolom `deskripsi`).

ALTER TABLE indikator_kinerja
  ADD COLUMN deskripsi_en TEXT NULL AFTER deskripsi;