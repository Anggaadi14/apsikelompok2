-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for db_monitoring_cpl
CREATE DATABASE IF NOT EXISTS `db_monitoring_cpl` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `db_monitoring_cpl`;

-- Dumping structure for table db_monitoring_cpl.cpl
CREATE TABLE IF NOT EXISTS `cpl` (
  `id_cpl` int(11) NOT NULL AUTO_INCREMENT,
  `id_kurikulum` int(11) NOT NULL,
  `kode_cpl` varchar(20) NOT NULL,
  `singkatan` varchar(20) NOT NULL,
  `domain` enum('Pengetahuan','Keterampilan Khusus','Keterampilan Umum','Sikap') NOT NULL,
  `deskripsi_id` text NOT NULL,
  `deskripsi_en` text DEFAULT NULL,
  `urutan` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_cpl`),
  UNIQUE KEY `uq_cpl_per_kurikulum` (`id_kurikulum`,`kode_cpl`),
  CONSTRAINT `fk_cpl_kurikulum` FOREIGN KEY (`id_kurikulum`) REFERENCES `kurikulum` (`id_kurikulum`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.cpl: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.cpmk
CREATE TABLE IF NOT EXISTS `cpmk` (
  `id_cpmk` int(11) NOT NULL AUTO_INCREMENT,
  `id_mata_kuliah` int(11) NOT NULL,
  `kode_cpmk` varchar(30) NOT NULL,
  `deskripsi_id` text NOT NULL,
  `deskripsi_en` text DEFAULT NULL,
  `urutan` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_cpmk`),
  UNIQUE KEY `uq_cpmk_per_mk` (`id_mata_kuliah`,`kode_cpmk`),
  CONSTRAINT `fk_cpmk_mk` FOREIGN KEY (`id_mata_kuliah`) REFERENCES `mata_kuliah` (`id_mata_kuliah`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.cpmk: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.data_bermasalah
CREATE TABLE IF NOT EXISTS `data_bermasalah` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `jenis_masalah` enum('mapping_ik_cpl_tidak_lengkap','mapping_cpmk_ik_tidak_lengkap','mapping_media_cpmk_kosong','nim_tidak_terdaftar','kode_mk_tidak_terdaftar','kelas_tidak_ditemukan','mhs_tidak_terdaftar_di_kelas','bobot_total_tidak_100') NOT NULL,
  `ref_table` varchar(50) DEFAULT NULL,
  `ref_id` varchar(100) DEFAULT NULL,
  `detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detail`)),
  `status` enum('open','resolved','ignored') NOT NULL DEFAULT 'open',
  `dibuat_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `diselesaikan_at` timestamp NULL DEFAULT NULL,
  `diselesaikan_oleh_user` int(11) DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_jenis` (`jenis_masalah`),
  KEY `fk_db_user` (`diselesaikan_oleh_user`),
  CONSTRAINT `fk_db_user` FOREIGN KEY (`diselesaikan_oleh_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.data_bermasalah: ~11 rows (approximately)
INSERT INTO `data_bermasalah` (`id`, `jenis_masalah`, `ref_table`, `ref_id`, `detail`, `status`, `dibuat_at`, `diselesaikan_at`, `diselesaikan_oleh_user`, `catatan`) VALUES
	(1, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033142038', '{"fileName":"08033142038_2024_Ganjil_A.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(2, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033142038', '{"fileName":"08033142038_2024_Ganjil_B.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(3, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033142038', '{"fileName":"08033142038_2024_Ganjil_C.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(4, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033142038', '{"fileName":"08033142038_2024_Ganjil_D.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(5, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033142038', '{"fileName":"08033142038_2025_Ganjil_A.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(6, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033142038', '{"fileName":"08033142038_2025_Ganjil_B.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(7, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033142038', '{"fileName":"08033142038_2025_Ganjil_C.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(8, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033143002', '{"fileName":"08033143002_2025_Ganjil_A.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(9, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033243029', '{"fileName":"08033243029_2024_Genap_A.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(10, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033243029', '{"fileName":"08033243029_2024_Genap_B.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL),
	(11, 'kode_mk_tidak_terdaftar', 'mata_kuliah', '08033243029', '{"fileName":"08033243029_2024_Genap_C.xlsx","reason":"Kode MK di nama file tidak match mata_kuliah"}', 'open', '2026-06-06 14:34:29', NULL, NULL, NULL);

-- Dumping structure for table db_monitoring_cpl.indikator_kinerja
CREATE TABLE IF NOT EXISTS `indikator_kinerja` (
  `id_ik` int(11) NOT NULL AUTO_INCREMENT,
  `id_cpl` int(11) NOT NULL,
  `kode_ik` varchar(20) NOT NULL,
  `deskripsi` text NOT NULL,
  `urutan` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_ik`),
  UNIQUE KEY `uq_ik_per_cpl` (`id_cpl`,`kode_ik`),
  CONSTRAINT `fk_ik_cpl` FOREIGN KEY (`id_cpl`) REFERENCES `cpl` (`id_cpl`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.indikator_kinerja: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.kelas_mk
CREATE TABLE IF NOT EXISTS `kelas_mk` (
  `id_kelas` int(11) NOT NULL AUTO_INCREMENT,
  `id_mata_kuliah` int(11) NOT NULL,
  `id_kurikulum` int(11) NOT NULL,
  `tahun_akademik` varchar(20) NOT NULL,
  `semester` enum('Ganjil','Genap') NOT NULL,
  `kode_kelas` varchar(5) NOT NULL,
  `kuota` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_kelas`),
  UNIQUE KEY `uq_kelas` (`id_mata_kuliah`,`tahun_akademik`,`semester`,`kode_kelas`),
  KEY `fk_kelas_kurikulum` (`id_kurikulum`),
  CONSTRAINT `fk_kelas_kurikulum` FOREIGN KEY (`id_kurikulum`) REFERENCES `kurikulum` (`id_kurikulum`) ON DELETE CASCADE,
  CONSTRAINT `fk_kelas_mk` FOREIGN KEY (`id_mata_kuliah`) REFERENCES `mata_kuliah` (`id_mata_kuliah`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.kelas_mk: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.komponen_nilai
CREATE TABLE IF NOT EXISTS `komponen_nilai` (
  `id_komponen` int(11) NOT NULL AUTO_INCREMENT,
  `id_mata_kuliah` int(11) NOT NULL,
  `kode_media` varchar(10) NOT NULL,
  `nama_media` varchar(100) NOT NULL,
  `bobot_terhadap_mk` decimal(6,3) NOT NULL DEFAULT 0.000,
  `urutan` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_komponen`),
  UNIQUE KEY `uq_komponen` (`id_mata_kuliah`,`kode_media`),
  CONSTRAINT `fk_kn_mk` FOREIGN KEY (`id_mata_kuliah`) REFERENCES `mata_kuliah` (`id_mata_kuliah`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.komponen_nilai: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.kurikulum
CREATE TABLE IF NOT EXISTS `kurikulum` (
  `id_kurikulum` int(11) NOT NULL AUTO_INCREMENT,
  `kode` varchar(20) NOT NULL,
  `nama` varchar(255) NOT NULL,
  `tahun_mulai` int(11) NOT NULL,
  `tahun_selesai` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `deskripsi` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_kurikulum`),
  UNIQUE KEY `kode` (`kode`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.kurikulum: ~1 rows (approximately)
INSERT INTO `kurikulum` (`id_kurikulum`, `kode`, `nama`, `tahun_mulai`, `tahun_selesai`, `is_active`, `deskripsi`, `created_at`) VALUES
	(1, 'K24', 'Kurikulum 2024 — Program Studi Sarjana Teknik Industri OBE', 2024, NULL, 1, 'Kurikulum aktif berbasis Outcome-Based Education', '2026-06-06 14:34:23');

-- Dumping structure for table db_monitoring_cpl.kurikulum_mk
CREATE TABLE IF NOT EXISTS `kurikulum_mk` (
  `id_kurikulum` int(11) NOT NULL,
  `id_mata_kuliah` int(11) NOT NULL,
  `is_wajib` tinyint(1) NOT NULL DEFAULT 1,
  `semester_default` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id_kurikulum`,`id_mata_kuliah`),
  KEY `fk_kurmk_mk` (`id_mata_kuliah`),
  CONSTRAINT `fk_kurmk_kurikulum` FOREIGN KEY (`id_kurikulum`) REFERENCES `kurikulum` (`id_kurikulum`) ON DELETE CASCADE,
  CONSTRAINT `fk_kurmk_mk` FOREIGN KEY (`id_mata_kuliah`) REFERENCES `mata_kuliah` (`id_mata_kuliah`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.kurikulum_mk: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.mahasiswa
CREATE TABLE IF NOT EXISTS `mahasiswa` (
  `id_mahasiswa` int(11) NOT NULL AUTO_INCREMENT,
  `nim` varchar(15) NOT NULL,
  `nama_mahasiswa` varchar(100) NOT NULL,
  `email_sso` varchar(100) NOT NULL,
  `angkatan` int(11) NOT NULL,
  PRIMARY KEY (`id_mahasiswa`),
  UNIQUE KEY `nim_UNIQUE` (`nim`),
  UNIQUE KEY `email_mhs_UNIQUE` (`email_sso`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.mahasiswa: ~7 rows (approximately)
INSERT INTO `mahasiswa` (`id_mahasiswa`, `nim`, `nama_mahasiswa`, `email_sso`, `angkatan`) VALUES
	(1, 'I0320045', 'Ahmad Fadli', 'ahmad@student.uns.ac.id', 2023),
	(17, 'I0320046', 'Budi Santoso', 'i0320046@placeholder.sicpl.local', 2023),
	(18, 'I0320047', 'Citra Dewi', 'i0320047@placeholder.sicpl.local', 2023),
	(19, 'I0320048', 'Dimas Pratama', 'i0320048@placeholder.sicpl.local', 2023),
	(20, 'I0321001', 'Eka Wulandari', 'i0321001@placeholder.sicpl.local', 2024),
	(21, 'I0321002', 'Fajar Nugroho', 'i0321002@placeholder.sicpl.local', 2024),
	(22, 'I0322001', 'Gita Permata', 'i0322001@placeholder.sicpl.local', 2025);

-- Dumping structure for table db_monitoring_cpl.mahasiswa_kelas
CREATE TABLE IF NOT EXISTS `mahasiswa_kelas` (
  `id_kelas` int(11) NOT NULL,
  `id_mahasiswa` int(11) NOT NULL,
  `enrolled_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_kelas`,`id_mahasiswa`),
  KEY `fk_mhsk_mahasiswa` (`id_mahasiswa`),
  CONSTRAINT `fk_mhsk_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas_mk` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `fk_mhsk_mahasiswa` FOREIGN KEY (`id_mahasiswa`) REFERENCES `mahasiswa` (`id_mahasiswa`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.mahasiswa_kelas: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.mapping_cpmk_ik
CREATE TABLE IF NOT EXISTS `mapping_cpmk_ik` (
  `id_cpmk` int(11) NOT NULL,
  `id_ik` int(11) NOT NULL,
  `bobot_persen` decimal(6,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id_cpmk`,`id_ik`),
  KEY `idx_ik_for_sum` (`id_ik`),
  CONSTRAINT `fk_mci_cpmk` FOREIGN KEY (`id_cpmk`) REFERENCES `cpmk` (`id_cpmk`) ON DELETE CASCADE,
  CONSTRAINT `fk_mci_ik` FOREIGN KEY (`id_ik`) REFERENCES `indikator_kinerja` (`id_ik`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.mapping_cpmk_ik: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.mapping_dosen_kelas
CREATE TABLE IF NOT EXISTS `mapping_dosen_kelas` (
  `id_kelas` int(11) NOT NULL,
  `id_staff` int(11) NOT NULL,
  `peran_di_kelas` enum('koordinator','anggota') NOT NULL DEFAULT 'anggota',
  PRIMARY KEY (`id_kelas`,`id_staff`),
  KEY `fk_mdk_staff` (`id_staff`),
  CONSTRAINT `fk_mdk_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas_mk` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `fk_mdk_staff` FOREIGN KEY (`id_staff`) REFERENCES `staff` (`id_staff`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.mapping_dosen_kelas: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.mapping_ik_cpl
CREATE TABLE IF NOT EXISTS `mapping_ik_cpl` (
  `id_ik` int(11) NOT NULL,
  `id_cpl` int(11) NOT NULL,
  `bobot_persen` decimal(6,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id_ik`,`id_cpl`),
  KEY `idx_cpl_for_sum` (`id_cpl`),
  CONSTRAINT `fk_mic_cpl` FOREIGN KEY (`id_cpl`) REFERENCES `cpl` (`id_cpl`) ON DELETE CASCADE,
  CONSTRAINT `fk_mic_ik` FOREIGN KEY (`id_ik`) REFERENCES `indikator_kinerja` (`id_ik`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.mapping_ik_cpl: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.mapping_media_cpmk
CREATE TABLE IF NOT EXISTS `mapping_media_cpmk` (
  `id_komponen` int(11) NOT NULL,
  `id_cpmk` int(11) NOT NULL,
  `bobot_persen` decimal(6,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id_komponen`,`id_cpmk`),
  KEY `idx_cpmk_for_sum` (`id_cpmk`),
  CONSTRAINT `fk_mmc_cpmk` FOREIGN KEY (`id_cpmk`) REFERENCES `cpmk` (`id_cpmk`) ON DELETE CASCADE,
  CONSTRAINT `fk_mmc_komponen` FOREIGN KEY (`id_komponen`) REFERENCES `komponen_nilai` (`id_komponen`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.mapping_media_cpmk: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.mata_kuliah
CREATE TABLE IF NOT EXISTS `mata_kuliah` (
  `id_mata_kuliah` int(11) NOT NULL AUTO_INCREMENT,
  `kode_mk` varchar(30) NOT NULL,
  `nama_mk` varchar(255) NOT NULL,
  `sks` decimal(3,1) NOT NULL DEFAULT 0.0,
  `singkatan` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id_mata_kuliah`),
  UNIQUE KEY `kode_mk` (`kode_mk`),
  KEY `idx_kode` (`kode_mk`)
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.mata_kuliah: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.nilai_detail
CREATE TABLE IF NOT EXISTS `nilai_detail` (
  `id_nilai` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_mahasiswa` int(11) NOT NULL,
  `id_komponen` int(11) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `nilai_asli` decimal(6,3) DEFAULT NULL,
  `nilai_remedi` decimal(6,3) DEFAULT NULL,
  `diinput_oleh_staff` int(11) DEFAULT NULL,
  `diinput_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `diupdate_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `catatan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_nilai`),
  UNIQUE KEY `uq_nilai_per_mhs_komponen_kelas` (`id_mahasiswa`,`id_komponen`,`id_kelas`),
  KEY `fk_nd_komponen` (`id_komponen`),
  KEY `fk_nd_staff` (`diinput_oleh_staff`),
  KEY `idx_nd_mhs` (`id_mahasiswa`),
  KEY `idx_nd_kelas` (`id_kelas`),
  CONSTRAINT `fk_nd_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas_mk` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `fk_nd_komponen` FOREIGN KEY (`id_komponen`) REFERENCES `komponen_nilai` (`id_komponen`) ON DELETE CASCADE,
  CONSTRAINT `fk_nd_mhs` FOREIGN KEY (`id_mahasiswa`) REFERENCES `mahasiswa` (`id_mahasiswa`) ON DELETE CASCADE,
  CONSTRAINT `fk_nd_staff` FOREIGN KEY (`diinput_oleh_staff`) REFERENCES `staff` (`id_staff`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.nilai_detail: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.staff
CREATE TABLE IF NOT EXISTS `staff` (
  `id_staff` int(11) NOT NULL AUTO_INCREMENT,
  `nip_nidn_nik` varchar(20) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `email_sso` varchar(100) NOT NULL,
  `peran` enum('admin','dosen','kaprodi','jamu') NOT NULL,
  PRIMARY KEY (`id_staff`),
  UNIQUE KEY `email_sso_UNIQUE` (`email_sso`),
  UNIQUE KEY `nip_nidn_nik_UNIQUE` (`nip_nidn_nik`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.staff: ~13 rows (approximately)
INSERT INTO `staff` (`id_staff`, `nip_nidn_nik`, `nama_lengkap`, `email_sso`, `peran`) VALUES
	(1, '197508212002121003', 'Prof. Dr. Ir. Budi Santoso, M.T.', 'budi@uns.ac.id', 'kaprodi'),
	(11, '198203152008122001', 'Dr. Siti Aminah, S.T., M.T.', 'siti.aminah@uns.ac.id', 'dosen'),
	(12, '197809082005011001', 'Ir. Rendra Sukma, M.T.', 'rendra@uns.ac.id', 'dosen'),
	(13, '198505252010122002', 'Dr. Maya Puspita, S.T., M.T.', 'maya@uns.ac.id', 'dosen'),
	(14, 'ADM-001', 'Administrator Portal', 'admin@uns.ac.id', 'admin'),
	(15, 'KP001', 'Dr. Kaprodi Satu, S.T., M.T.', 'kaprodi1@sicpl.test', 'kaprodi'),
	(16, 'KP002', 'Dr. Kaprodi Dua, S.T., M.T.', 'kaprodi2@sicpl.test', 'kaprodi'),
	(17, 'JM001', 'Tim Jamu Satu, S.T., M.T.', 'jamu1@sicpl.test', 'jamu'),
	(18, 'JM002', 'Tim Jamu Dua, S.T., M.T.', 'jamu2@sicpl.test', 'jamu'),
	(19, 'AD001', 'Admin Prodi Satu', 'admin1@sicpl.test', 'admin'),
	(20, 'AD002', 'Admin Prodi Dua', 'admin2@sicpl.test', 'admin'),
	(21, '198501012010121001', 'Dr. Hadi Wijaya, S.T., M.T.', 'hadi.wijaya@uns.ac.id', 'dosen'),
	(22, '198703152011122002', 'Dr. Indah Sari, S.T., M.T.', 'indah.sari@uns.ac.id', 'dosen');

-- Dumping structure for table db_monitoring_cpl.target_capaian
CREATE TABLE IF NOT EXISTS `target_capaian` (
  `id_target` int(11) NOT NULL AUTO_INCREMENT,
  `id_ik` int(11) NOT NULL,
  `tahun_akademik` varchar(9) NOT NULL,
  `nilai_target_minimal` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id_target`),
  KEY `fk_target_ik` (`id_ik`),
  CONSTRAINT `fk_target_ik` FOREIGN KEY (`id_ik`) REFERENCES `mapping_ik_cpl` (`id_ik`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.target_capaian: ~20 rows (approximately)
INSERT INTO `target_capaian` (`id_target`, `id_ik`, `tahun_akademik`, `nilai_target_minimal`) VALUES
	(1, 1, '2024/2025', 80.00),
	(2, 2, '2024/2025', 80.00),
	(3, 3, '2024/2025', 80.00),
	(4, 4, '2024/2025', 80.00),
	(5, 5, '2024/2025', 80.00),
	(6, 6, '2024/2025', 80.00),
	(7, 7, '2024/2025', 80.00),
	(8, 8, '2024/2025', 80.00),
	(9, 9, '2024/2025', 80.00),
	(10, 10, '2024/2025', 80.00),
	(11, 11, '2024/2025', 80.00),
	(12, 12, '2024/2025', 80.00),
	(13, 13, '2024/2025', 80.00),
	(14, 14, '2024/2025', 80.00),
	(15, 15, '2024/2025', 80.00),
	(16, 16, '2024/2025', 80.00),
	(17, 17, '2024/2025', 80.00),
	(18, 18, '2024/2025', 80.00),
	(19, 19, '2024/2025', 80.00),
	(20, 20, '2024/2025', 80.00);

-- Dumping structure for table db_monitoring_cpl.upload_log_nilai
CREATE TABLE IF NOT EXISTS `upload_log_nilai` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_kelas` int(11) DEFAULT NULL,
  `id_staff_uploader` int(11) DEFAULT NULL,
  `nama_file` varchar(255) NOT NULL,
  `token_siakad` varchar(255) DEFAULT NULL,
  `token_valid` tinyint(1) DEFAULT NULL,
  `jumlah_baris` int(11) DEFAULT NULL,
  `jumlah_berhasil` int(11) DEFAULT NULL,
  `jumlah_gagal` int(11) DEFAULT NULL,
  `status` enum('processing','success','partial','failed') NOT NULL DEFAULT 'processing',
  `detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detail`)),
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ul_kelas` (`id_kelas`),
  KEY `fk_ul_staff` (`id_staff_uploader`),
  CONSTRAINT `fk_ul_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas_mk` (`id_kelas`) ON DELETE SET NULL,
  CONSTRAINT `fk_ul_staff` FOREIGN KEY (`id_staff_uploader`) REFERENCES `staff` (`id_staff`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.upload_log_nilai: ~0 rows (approximately)

-- Dumping structure for table db_monitoring_cpl.user
CREATE TABLE IF NOT EXISTS `user` (
  `id_user` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `sandi_hash` varchar(255) DEFAULT NULL,
  `role` enum('mahasiswa','dosen','kaprodi','jamu','admin') NOT NULL,
  `status` enum('pending_verification','aktif','nonaktif') NOT NULL DEFAULT 'pending_verification',
  `token_verifikasi` varchar(255) DEFAULT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `id_mahasiswa` int(11) DEFAULT NULL,
  `id_staff` int(11) DEFAULT NULL,
  `nama_input` varchar(150) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `idx_user_token` (`token_verifikasi`),
  KEY `idx_user_role_status` (`role`,`status`),
  KEY `fk_user_mahasiswa` (`id_mahasiswa`),
  KEY `fk_user_staff` (`id_staff`),
  CONSTRAINT `fk_user_mahasiswa` FOREIGN KEY (`id_mahasiswa`) REFERENCES `mahasiswa` (`id_mahasiswa`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_staff` FOREIGN KEY (`id_staff`) REFERENCES `staff` (`id_staff`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table db_monitoring_cpl.user: ~17 rows (approximately)
INSERT INTO `user` (`id_user`, `email`, `sandi_hash`, `role`, `status`, `token_verifikasi`, `token_expires_at`, `verified_at`, `id_mahasiswa`, `id_staff`, `nama_input`, `created_at`, `updated_at`) VALUES
	(1, 'ahmad@student.uns.ac.id', '$2b$10$sXtc/zZSJxUwMcrQXuSTReqssdrOGqigOGqY2CEcdDOIlm4ivbl3a', 'mahasiswa', 'aktif', NULL, NULL, '2026-06-06 17:17:18', 1, NULL, 'Ahmad Fadli', '2026-06-06 17:17:18', '2026-06-06 17:17:18'),
	(2, 'budi@uns.ac.id', '$2b$10$uu.Y9skoSd4PMhzNJdJ4au/i.UwRy3D5rCAiHIlHt2uavmk76mcyS', 'kaprodi', 'aktif', NULL, NULL, '2026-06-06 17:17:18', NULL, 1, 'Prof. Dr. Ir. Budi Santoso, M.T.', '2026-06-06 17:17:18', '2026-06-06 17:17:18'),
	(3, 'siti.aminah@uns.ac.id', '$2b$10$uu.Y9skoSd4PMhzNJdJ4au/i.UwRy3D5rCAiHIlHt2uavmk76mcyS', 'dosen', 'aktif', NULL, NULL, '2026-06-06 17:17:18', NULL, 11, 'Dr. Siti Aminah, S.T., M.T.', '2026-06-06 17:17:18', '2026-06-06 17:17:18'),
	(4, 'rendra@uns.ac.id', '$2b$10$uu.Y9skoSd4PMhzNJdJ4au/i.UwRy3D5rCAiHIlHt2uavmk76mcyS', 'dosen', 'aktif', NULL, NULL, '2026-06-06 17:17:18', NULL, 12, 'Ir. Rendra Sukma, M.T.', '2026-06-06 17:17:18', '2026-06-06 17:17:18'),
	(5, 'maya@uns.ac.id', '$2b$10$uu.Y9skoSd4PMhzNJdJ4au/i.UwRy3D5rCAiHIlHt2uavmk76mcyS', 'dosen', 'aktif', NULL, NULL, '2026-06-06 17:17:18', NULL, 13, 'Dr. Maya Puspita, S.T., M.T.', '2026-06-06 17:17:18', '2026-06-06 17:17:18'),
	(6, 'admin@uns.ac.id', '$2b$10$uu.Y9skoSd4PMhzNJdJ4au/i.UwRy3D5rCAiHIlHt2uavmk76mcyS', 'admin', 'aktif', NULL, NULL, '2026-06-06 17:17:18', NULL, 14, 'Administrator Portal', '2026-06-06 17:17:18', '2026-06-06 17:17:18'),
	(7, 'kaprodi1@sicpl.test', '$2b$10$Vk51zX8gojX97r8GteGodeMwGjeshPt8UCOCLLK5mjPfz8gaYnZdW', 'kaprodi', 'aktif', NULL, NULL, '2026-06-06 17:17:31', NULL, 15, 'Dr. Kaprodi Satu, S.T., M.T.', '2026-06-06 17:17:31', '2026-06-06 17:17:31'),
	(8, 'kaprodi2@sicpl.test', '$2b$10$Vk51zX8gojX97r8GteGodeMwGjeshPt8UCOCLLK5mjPfz8gaYnZdW', 'kaprodi', 'aktif', NULL, NULL, '2026-06-06 17:17:31', NULL, 16, 'Dr. Kaprodi Dua, S.T., M.T.', '2026-06-06 17:17:31', '2026-06-06 17:17:31'),
	(9, 'jamu1@sicpl.test', '$2b$10$Vk51zX8gojX97r8GteGodeMwGjeshPt8UCOCLLK5mjPfz8gaYnZdW', 'jamu', 'aktif', NULL, NULL, '2026-06-06 17:17:31', NULL, 17, 'Tim Jamu Satu, S.T., M.T.', '2026-06-06 17:17:31', '2026-06-06 17:17:31'),
	(10, 'jamu2@sicpl.test', '$2b$10$Vk51zX8gojX97r8GteGodeMwGjeshPt8UCOCLLK5mjPfz8gaYnZdW', 'jamu', 'aktif', NULL, NULL, '2026-06-06 17:17:31', NULL, 18, 'Tim Jamu Dua, S.T., M.T.', '2026-06-06 17:17:31', '2026-06-06 17:17:31'),
	(11, 'admin1@sicpl.test', '$2b$10$Vk51zX8gojX97r8GteGodeMwGjeshPt8UCOCLLK5mjPfz8gaYnZdW', 'admin', 'aktif', NULL, NULL, '2026-06-06 17:17:31', NULL, 19, 'Admin Prodi Satu', '2026-06-06 17:17:31', '2026-06-06 17:17:31'),
	(12, 'admin2@sicpl.test', '$2b$10$Vk51zX8gojX97r8GteGodeMwGjeshPt8UCOCLLK5mjPfz8gaYnZdW', 'admin', 'aktif', NULL, NULL, '2026-06-06 17:17:31', NULL, 20, 'Admin Prodi Dua', '2026-06-06 17:17:31', '2026-06-06 17:17:31'),
	(13, 'I0320045@student.uns.ac.id', '$2b$10$sXtc/zZSJxUwMcrQXuSTReqssdrOGqigOGqY2CEcdDOIlm4ivbl3a', 'mahasiswa', 'aktif', NULL, NULL, '2026-06-06 17:40:10', 1, NULL, 'Ahmad Fadli', '2026-06-06 17:40:10', '2026-06-06 17:40:10'),
	(14, 'alyssachalondra@student.uns.ac.id', '$2b$10$F1mmg2z6rZg6D7B3vV4IIODto6ok5JlVOJo8mfCn3Iy7vOkFxYDhK', 'mahasiswa', 'pending_verification', '02ccd01aaf34d5afd67b112b8a8feb11232c9e017521ea87d2a4b0b0fca162ee', '2026-06-07 18:42:57', NULL, NULL, NULL, 'Mahasiswa Test', '2026-06-06 18:42:58', '2026-06-06 18:42:58'),
	(15, 'budi@student.uns.ac.id', '$2b$10$xgYYZPLN1fQWH8TsUNywX.ACOnpMbV04/208mjMrqehZQMME0t8x2', 'mahasiswa', 'aktif', NULL, NULL, '2026-06-06 19:00:16', 17, NULL, 'Budi Santoso', '2026-06-06 18:59:42', '2026-06-06 19:00:16'),
	(16, 'citra@student.uns.ac.id', '$2b$10$km3REw5t3/xFLnQNfRfW8eN0pez3TPuTt.KgmzFeYMzq9z8VZYFdK', 'mahasiswa', 'aktif', NULL, NULL, '2026-06-06 19:29:50', 18, NULL, 'Citra Dewi', '2026-06-06 19:29:08', '2026-06-06 19:29:50'),
	(17, 'dimas@student.uns.ac.id', '$2b$10$HQaMRWsmUtCcGnEraTFxPun7i2dp.hfIMImfpvdkN/G6MxBuB5tci', 'mahasiswa', 'aktif', NULL, NULL, '2026-06-06 19:36:40', 19, NULL, 'Dimas Pratama', '2026-06-06 19:36:05', '2026-06-06 19:36:40');

-- Dumping structure for view db_monitoring_cpl.v_nilai_cpl_per_mhs
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_nilai_cpl_per_mhs` (
	`id_mahasiswa` INT(11) NOT NULL,
	`id_cpl` INT(11) NOT NULL,
	`kode_cpl` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_general_ci',
	`singkatan` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_general_ci',
	`id_kurikulum` INT(11) NOT NULL,
	`nilai_cpl` DECIMAL(65,24) NULL
);

-- Dumping structure for view db_monitoring_cpl.v_nilai_cpmk_per_mhs
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_nilai_cpmk_per_mhs` (
	`id_mahasiswa` INT(11) NOT NULL,
	`id_kelas` INT(11) NOT NULL,
	`id_mata_kuliah` INT(11) NOT NULL,
	`id_cpmk` INT(11) NOT NULL,
	`kode_cpmk` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_general_ci',
	`nilai_cpmk` DECIMAL(39,10) NULL
);

-- Dumping structure for view db_monitoring_cpl.v_nilai_ik_per_mhs
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_nilai_ik_per_mhs` (
	`id_mahasiswa` INT(11) NOT NULL,
	`id_ik` INT(11) NOT NULL,
	`kode_ik` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_general_ci',
	`id_cpl` INT(11) NOT NULL,
	`nilai_ik` DECIMAL(65,17) NULL
);

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_nilai_cpl_per_mhs`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_nilai_cpl_per_mhs` AS SELECT
  vik.id_mahasiswa,
  mic.id_cpl,
  c.kode_cpl,
  c.singkatan,
  c.id_kurikulum,
  SUM(vik.nilai_ik * (mic.bobot_persen / 100.0)) AS nilai_cpl
FROM v_nilai_ik_per_mhs vik
JOIN mapping_ik_cpl mic ON mic.id_ik = vik.id_ik
JOIN cpl c ON c.id_cpl = mic.id_cpl
GROUP BY vik.id_mahasiswa, mic.id_cpl 
;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_nilai_cpmk_per_mhs`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_nilai_cpmk_per_mhs` AS SELECT
  nd.id_mahasiswa,
  nd.id_kelas,
  km.id_mata_kuliah,
  c.id_cpmk,
  c.kode_cpmk,
  SUM(
    COALESCE(nd.nilai_remedi, nd.nilai_asli, 0)
    * (mmc.bobot_persen / 100.0)
  ) AS nilai_cpmk
FROM nilai_detail nd
JOIN komponen_nilai kn ON kn.id_komponen = nd.id_komponen
JOIN mapping_media_cpmk mmc ON mmc.id_komponen = kn.id_komponen
JOIN cpmk c ON c.id_cpmk = mmc.id_cpmk
JOIN kelas_mk km ON km.id_kelas = nd.id_kelas
WHERE c.id_mata_kuliah = km.id_mata_kuliah  -- safety: cpmk harus dari MK yang sama dgn kelas
GROUP BY nd.id_mahasiswa, nd.id_kelas, c.id_cpmk 
;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_nilai_ik_per_mhs`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_nilai_ik_per_mhs` AS SELECT
  vcpmk.id_mahasiswa,
  mci.id_ik,
  ik.kode_ik,
  ik.id_cpl,
  SUM(vcpmk.nilai_cpmk * (mci.bobot_persen / 100.0)) AS nilai_ik
FROM v_nilai_cpmk_per_mhs vcpmk
JOIN mapping_cpmk_ik mci ON mci.id_cpmk = vcpmk.id_cpmk
JOIN indikator_kinerja ik ON ik.id_ik = mci.id_ik
GROUP BY vcpmk.id_mahasiswa, mci.id_ik 
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
