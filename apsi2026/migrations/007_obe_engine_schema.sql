-- ============================================================================
-- MIGRATION 007 — OBE Engine Full Schema Rebuild
-- Multi-curriculum support, 3-tier weighted aggregation, kelas/enrollment,
-- audit trail, data bermasalah queue.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop in reverse dependency order
DROP TABLE IF EXISTS upload_log_nilai;
DROP TABLE IF EXISTS data_bermasalah;
DROP TABLE IF EXISTS nilai_detail;
DROP TABLE IF EXISTS mapping_media_cpmk;
DROP TABLE IF EXISTS mapping_komponen_cpmk; -- legacy, replaced by mapping_media_cpmk
DROP TABLE IF EXISTS komponen_nilai;
DROP TABLE IF EXISTS mahasiswa_kelas;
DROP TABLE IF EXISTS mapping_dosen_kelas;
DROP TABLE IF EXISTS kelas_mk;
DROP TABLE IF EXISTS kurikulum_mk;
DROP TABLE IF EXISTS mapping_cpmk_ik;
DROP TABLE IF EXISTS cpmk;
DROP TABLE IF EXISTS mapping_ik_cpl;
DROP TABLE IF EXISTS indikator_kinerja;
DROP TABLE IF EXISTS cpl;
DROP TABLE IF EXISTS mata_kuliah;
DROP TABLE IF EXISTS kurikulum;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TIER 1 — Master Kurikulum
-- =========================================================
CREATE TABLE kurikulum (
  id_kurikulum INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(20) NOT NULL UNIQUE,             -- 'K24', 'K20', 'K16'
  nama VARCHAR(255) NOT NULL,
  tahun_mulai INT NOT NULL,
  tahun_selesai INT NULL,                        -- NULL = masih aktif
  is_active TINYINT(1) NOT NULL DEFAULT 0,       -- hanya 1 yang aktif untuk intake baru
  deskripsi TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cpl (
  id_cpl INT AUTO_INCREMENT PRIMARY KEY,
  id_kurikulum INT NOT NULL,
  kode_cpl VARCHAR(20) NOT NULL,                 -- '1'..'10' (K24), '11'..'24' (K-lama)
  singkatan VARCHAR(20) NOT NULL,                -- 'P1', 'KK1', 'KU1', 'S1'
  domain ENUM('Pengetahuan','Keterampilan Khusus','Keterampilan Umum','Sikap') NOT NULL,
  deskripsi_id TEXT NOT NULL,
  deskripsi_en TEXT NULL,
  urutan INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_cpl_kurikulum FOREIGN KEY (id_kurikulum) REFERENCES kurikulum(id_kurikulum) ON DELETE CASCADE,
  UNIQUE KEY uq_cpl_per_kurikulum (id_kurikulum, kode_cpl)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TIER 2 — Hirarki OBE: IK & CPMK dengan bobot
-- =========================================================
CREATE TABLE indikator_kinerja (
  id_ik INT AUTO_INCREMENT PRIMARY KEY,
  id_cpl INT NOT NULL,
  kode_ik VARCHAR(20) NOT NULL,                  -- 'I-1','II-3','III-2'
  deskripsi TEXT NOT NULL,
  urutan INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ik_cpl FOREIGN KEY (id_cpl) REFERENCES cpl(id_cpl) ON DELETE CASCADE,
  UNIQUE KEY uq_ik_per_cpl (id_cpl, kode_ik)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mapping_ik_cpl (
  id_ik INT NOT NULL,
  id_cpl INT NOT NULL,
  bobot_persen DECIMAL(6,3) NOT NULL DEFAULT 0,  -- jumlah per id_cpl harus = 100
  PRIMARY KEY (id_ik, id_cpl),
  CONSTRAINT fk_mic_ik FOREIGN KEY (id_ik) REFERENCES indikator_kinerja(id_ik) ON DELETE CASCADE,
  CONSTRAINT fk_mic_cpl FOREIGN KEY (id_cpl) REFERENCES cpl(id_cpl) ON DELETE CASCADE,
  KEY idx_cpl_for_sum (id_cpl)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mata_kuliah (
  id_mata_kuliah INT AUTO_INCREMENT PRIMARY KEY,
  kode_mk VARCHAR(30) NOT NULL UNIQUE,
  nama_mk VARCHAR(255) NOT NULL,
  sks DECIMAL(3,1) NOT NULL DEFAULT 0,
  singkatan VARCHAR(20) NULL,                    -- 'MO','MT','K3','EKOTEK' (prefix CPMK)
  KEY idx_kode (kode_mk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE kurikulum_mk (
  id_kurikulum INT NOT NULL,
  id_mata_kuliah INT NOT NULL,
  is_wajib TINYINT(1) NOT NULL DEFAULT 1,
  semester_default TINYINT NULL,                 -- 1..8
  PRIMARY KEY (id_kurikulum, id_mata_kuliah),
  CONSTRAINT fk_kurmk_kurikulum FOREIGN KEY (id_kurikulum) REFERENCES kurikulum(id_kurikulum) ON DELETE CASCADE,
  CONSTRAINT fk_kurmk_mk FOREIGN KEY (id_mata_kuliah) REFERENCES mata_kuliah(id_mata_kuliah) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cpmk (
  id_cpmk INT AUTO_INCREMENT PRIMARY KEY,
  id_mata_kuliah INT NOT NULL,
  kode_cpmk VARCHAR(30) NOT NULL,                -- 'MO-1','K3-4'
  deskripsi_id TEXT NOT NULL,
  deskripsi_en TEXT NULL,
  urutan INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_cpmk_mk FOREIGN KEY (id_mata_kuliah) REFERENCES mata_kuliah(id_mata_kuliah) ON DELETE CASCADE,
  UNIQUE KEY uq_cpmk_per_mk (id_mata_kuliah, kode_cpmk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mapping_cpmk_ik (
  id_cpmk INT NOT NULL,
  id_ik INT NOT NULL,
  bobot_persen DECIMAL(6,3) NOT NULL DEFAULT 0,  -- jumlah per id_ik harus = 100
  PRIMARY KEY (id_cpmk, id_ik),
  CONSTRAINT fk_mci_cpmk FOREIGN KEY (id_cpmk) REFERENCES cpmk(id_cpmk) ON DELETE CASCADE,
  CONSTRAINT fk_mci_ik FOREIGN KEY (id_ik) REFERENCES indikator_kinerja(id_ik) ON DELETE CASCADE,
  KEY idx_ik_for_sum (id_ik)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TIER 3 — Kelas / Dosen Pengampu / Mahasiswa Enrollment
-- =========================================================
CREATE TABLE kelas_mk (
  id_kelas INT AUTO_INCREMENT PRIMARY KEY,
  id_mata_kuliah INT NOT NULL,
  id_kurikulum INT NOT NULL,
  tahun_akademik VARCHAR(20) NOT NULL,           -- '2024/2025'
  semester ENUM('Ganjil','Genap') NOT NULL,
  kode_kelas VARCHAR(5) NOT NULL,                 -- 'A','B','C'
  kuota INT NULL,
  CONSTRAINT fk_kelas_mk FOREIGN KEY (id_mata_kuliah) REFERENCES mata_kuliah(id_mata_kuliah) ON DELETE CASCADE,
  CONSTRAINT fk_kelas_kurikulum FOREIGN KEY (id_kurikulum) REFERENCES kurikulum(id_kurikulum) ON DELETE CASCADE,
  UNIQUE KEY uq_kelas (id_mata_kuliah, tahun_akademik, semester, kode_kelas)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mapping_dosen_kelas (
  id_kelas INT NOT NULL,
  id_staff INT NOT NULL,
  peran_di_kelas ENUM('koordinator','anggota') NOT NULL DEFAULT 'anggota',
  PRIMARY KEY (id_kelas, id_staff),
  CONSTRAINT fk_mdk_kelas FOREIGN KEY (id_kelas) REFERENCES kelas_mk(id_kelas) ON DELETE CASCADE,
  CONSTRAINT fk_mdk_staff FOREIGN KEY (id_staff) REFERENCES staff(id_staff) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mahasiswa_kelas (
  id_kelas INT NOT NULL,
  id_mahasiswa INT NOT NULL,
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_kelas, id_mahasiswa),
  CONSTRAINT fk_mhsk_kelas FOREIGN KEY (id_kelas) REFERENCES kelas_mk(id_kelas) ON DELETE CASCADE,
  CONSTRAINT fk_mhsk_mahasiswa FOREIGN KEY (id_mahasiswa) REFERENCES mahasiswa(id_mahasiswa) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TIER 4 — Media Asesmen (UK1..UK5) & Nilai
-- =========================================================
CREATE TABLE komponen_nilai (
  id_komponen INT AUTO_INCREMENT PRIMARY KEY,
  id_mata_kuliah INT NOT NULL,
  kode_media VARCHAR(10) NOT NULL,               -- 'UK1','UK2','UK3','UK4','UK5'
  nama_media VARCHAR(100) NOT NULL,              -- 'Tugas','UTS','UAS','Partisipatif','Hasil Proyek'
  bobot_terhadap_mk DECIMAL(6,3) NOT NULL DEFAULT 0,  -- row 14 file SIAKAD, Σ per MK = 100
  urutan INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_kn_mk FOREIGN KEY (id_mata_kuliah) REFERENCES mata_kuliah(id_mata_kuliah) ON DELETE CASCADE,
  UNIQUE KEY uq_komponen (id_mata_kuliah, kode_media)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mapping_media_cpmk (
  id_komponen INT NOT NULL,
  id_cpmk INT NOT NULL,
  bobot_persen DECIMAL(6,3) NOT NULL DEFAULT 0,  -- proporsi kontribusi media ke CPMK ini
  PRIMARY KEY (id_komponen, id_cpmk),
  CONSTRAINT fk_mmc_komponen FOREIGN KEY (id_komponen) REFERENCES komponen_nilai(id_komponen) ON DELETE CASCADE,
  CONSTRAINT fk_mmc_cpmk FOREIGN KEY (id_cpmk) REFERENCES cpmk(id_cpmk) ON DELETE CASCADE,
  KEY idx_cpmk_for_sum (id_cpmk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE nilai_detail (
  id_nilai BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_mahasiswa INT NOT NULL,
  id_komponen INT NOT NULL,
  id_kelas INT NOT NULL,
  nilai_asli DECIMAL(6,3) NULL,
  nilai_remedi DECIMAL(6,3) NULL,
  diinput_oleh_staff INT NULL,
  diinput_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diupdate_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  catatan VARCHAR(255) NULL,
  CONSTRAINT fk_nd_mhs FOREIGN KEY (id_mahasiswa) REFERENCES mahasiswa(id_mahasiswa) ON DELETE CASCADE,
  CONSTRAINT fk_nd_komponen FOREIGN KEY (id_komponen) REFERENCES komponen_nilai(id_komponen) ON DELETE CASCADE,
  CONSTRAINT fk_nd_kelas FOREIGN KEY (id_kelas) REFERENCES kelas_mk(id_kelas) ON DELETE CASCADE,
  CONSTRAINT fk_nd_staff FOREIGN KEY (diinput_oleh_staff) REFERENCES staff(id_staff) ON DELETE SET NULL,
  UNIQUE KEY uq_nilai_per_mhs_komponen_kelas (id_mahasiswa, id_komponen, id_kelas),
  KEY idx_nd_mhs (id_mahasiswa),
  KEY idx_nd_kelas (id_kelas)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TIER 5 — Sistem (Audit & Data Bermasalah)
-- =========================================================
CREATE TABLE data_bermasalah (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  jenis_masalah ENUM(
    'mapping_ik_cpl_tidak_lengkap',
    'mapping_cpmk_ik_tidak_lengkap',
    'mapping_media_cpmk_kosong',
    'nim_tidak_terdaftar',
    'kode_mk_tidak_terdaftar',
    'kelas_tidak_ditemukan',
    'mhs_tidak_terdaftar_di_kelas',
    'bobot_total_tidak_100'
  ) NOT NULL,
  ref_table VARCHAR(50) NULL,
  ref_id VARCHAR(100) NULL,
  detail JSON NULL,
  status ENUM('open','resolved','ignored') NOT NULL DEFAULT 'open',
  dibuat_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diselesaikan_at TIMESTAMP NULL,
  diselesaikan_oleh_user INT NULL,
  catatan TEXT NULL,
  KEY idx_status (status),
  KEY idx_jenis (jenis_masalah),
  CONSTRAINT fk_db_user FOREIGN KEY (diselesaikan_oleh_user) REFERENCES user(id_user) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE upload_log_nilai (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_kelas INT NULL,
  id_staff_uploader INT NULL,
  nama_file VARCHAR(255) NOT NULL,
  token_siakad VARCHAR(255) NULL,
  token_valid TINYINT(1) NULL,                    -- NULL=blm diverifikasi, 1=valid, 0=invalid
  jumlah_baris INT NULL,
  jumlah_berhasil INT NULL,
  jumlah_gagal INT NULL,
  status ENUM('processing','success','partial','failed') NOT NULL DEFAULT 'processing',
  detail JSON NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ul_kelas FOREIGN KEY (id_kelas) REFERENCES kelas_mk(id_kelas) ON DELETE SET NULL,
  CONSTRAINT fk_ul_staff FOREIGN KEY (id_staff_uploader) REFERENCES staff(id_staff) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;