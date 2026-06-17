/* ============================================================
   012_tahun_akademik.sql
   - Tabel master Tahun Akademik (terstruktur, bukan VARCHAR lagi).
   - Tepat 1 baris boleh is_active=1 (yang sedang berjalan).
   - Menambahkan kolom FK opsional di kelas_mk supaya kelas baru
     bisa di-relasikan ke TA secara terstruktur (kolom VARCHAR
     lama tetap ada untuk kompatibilitas data lama).
   - Aman di-run ulang (IF NOT EXISTS).
   ============================================================ */

CREATE TABLE IF NOT EXISTS tahun_akademik (
  id_tahun_akademik INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  tahun_mulai SMALLINT NOT NULL,
  tahun_selesai SMALLINT NOT NULL,
  semester ENUM('Ganjil','Genap','Pendek') NOT NULL,
  label VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ta_pair (tahun_mulai, tahun_selesai, semester),
  KEY idx_ta_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* Seed beberapa TA standar; '2025/2026-Ganjil' ditandai berjalan. */
INSERT IGNORE INTO tahun_akademik (kode, tahun_mulai, tahun_selesai, semester, label, is_active) VALUES
('2023/2024-Ganjil', 2023, 2024, 'Ganjil', '2023/2024 Ganjil', 0),
('2023/2024-Genap',  2023, 2024, 'Genap',  '2023/2024 Genap',  0),
('2024/2025-Ganjil', 2024, 2025, 'Ganjil', '2024/2025 Ganjil', 0),
('2024/2025-Genap',  2024, 2025, 'Genap',  '2024/2025 Genap',  0),
('2025/2026-Ganjil', 2025, 2026, 'Ganjil', '2025/2026 Ganjil (Berjalan)', 1);

/* Tambahkan kolom FK opsional di kelas_mk (baris lama biarkan NULL) */
ALTER TABLE kelas_mk
  ADD COLUMN IF NOT EXISTS id_tahun_akademik INT NULL AFTER tahun_akademik;

ALTER TABLE kelas_mk
  ADD KEY IF NOT EXISTS idx_kelas_mk_ta (id_tahun_akademik);

/* FK di-attach hanya jika belum ada constraint dengan nama yg sama. MariaDB 10.4
   tidak mendukung IF NOT EXISTS pada ADD CONSTRAINT, jadi pakai blok kondisional. */
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'kelas_mk'
    AND CONSTRAINT_NAME = 'fk_kelas_mk_ta'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE kelas_mk ADD CONSTRAINT fk_kelas_mk_ta FOREIGN KEY (id_tahun_akademik) REFERENCES tahun_akademik(id_tahun_akademik) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
