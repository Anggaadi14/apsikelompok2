/* ============================================================
   013_upload_log_ta.sql
   - Tambah kolom id_tahun_akademik (nullable) di upload_log_nilai
     untuk mencatat TA yang dipilih dosen saat upload nilai.
   - Default behaviour di route: kalau dosen tidak memilih,
     diisi otomatis dengan TA aktif (is_active = 1) saat upload.
   - Aman di-run ulang.
   ============================================================ */

ALTER TABLE upload_log_nilai
  ADD COLUMN IF NOT EXISTS id_tahun_akademik INT NULL AFTER id_kelas;

ALTER TABLE upload_log_nilai
  ADD KEY IF NOT EXISTS idx_ul_ta (id_tahun_akademik);

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upload_log_nilai'
    AND CONSTRAINT_NAME = 'fk_ul_ta'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE upload_log_nilai ADD CONSTRAINT fk_ul_ta FOREIGN KEY (id_tahun_akademik) REFERENCES tahun_akademik(id_tahun_akademik) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
