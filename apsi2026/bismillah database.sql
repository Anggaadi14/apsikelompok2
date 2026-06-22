USE db_monitoring_cpl;

SET FOREIGN_KEY_CHECKS = 0;


-- =====================================================================
-- DATA MASTER
-- =====================================================================

-- Kurikulum (mis. K24)
CREATE TABLE kurikulum (
  id_kurikulum   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode           VARCHAR(20)  NOT NULL UNIQUE,   -- mis. 'K24'
  nama           VARCHAR(150) NOT NULL,
  tahun_berlaku  YEAR         NULL,
  is_aktif       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Staff = SEMUA non-mahasiswa (dosen, admin prodi, kaprodi, jaminan mutu)
-- Dibedakan lewat kolom role. Identitas pakai NIP (tanpa NIDN).
CREATE TABLE staff (
  id_staff   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nip        VARCHAR(30)  NOT NULL UNIQUE,
  nama       VARCHAR(150) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,       -- login Google + validasi email UNS
  role       ENUM('dosen','admin','kaprodi','jaminan_mutu') NOT NULL,
  is_aktif   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mahasiswa aktif. Identitas pakai NIM.
CREATE TABLE mahasiswa (
  id_mahasiswa  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nim           VARCHAR(30)  NOT NULL UNIQUE,
  nama          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,    -- *@student.uns.ac.id
  angkatan      YEAR         NULL,
  id_kurikulum  INT UNSIGNED NOT NULL,
  is_aktif      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mhs_kurikulum FOREIGN KEY (id_kurikulum) REFERENCES kurikulum(id_kurikulum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tahun akademik (mis. '2024/2025 Ganjil') + flag aktif (periode berjalan)
CREATE TABLE tahun_akademik (
  id_ta      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(50) NOT NULL UNIQUE,        -- '2024/2025 Ganjil'
  tahun      VARCHAR(9)  NOT NULL,               -- '2024/2025'
  semester   ENUM('Ganjil','Genap','Pendek') NOT NULL,
  is_aktif   TINYINT(1)  NOT NULL DEFAULT 0,     -- periode berjalan (default upload nilai)
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mata kuliah + nama dwibahasa + flag pengajaran / non-pengajaran
-- (evaluator BUKAN di sini -- itu di tabel cpmk)
CREATE TABLE mata_kuliah (
  id_mk         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode_mk       VARCHAR(30)  NOT NULL,
  nama_id       VARCHAR(200) NOT NULL,
  nama_en       VARCHAR(200) NULL,
  sks           TINYINT UNSIGNED NULL,
  id_kurikulum  INT UNSIGNED NOT NULL,
  jenis_mk      ENUM('pengajaran','non_pengajaran') NOT NULL DEFAULT 'pengajaran',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mk (kode_mk, id_kurikulum),
  CONSTRAINT fk_mk_kurikulum FOREIGN KEY (id_kurikulum) REFERENCES kurikulum(id_kurikulum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CPL + target minimal (nilai per-siklus, mis. 85)
CREATE TABLE cpl (
  id_cpl                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode_cpl              VARCHAR(30)  NOT NULL,
  deskripsi_id          TEXT         NOT NULL,
  deskripsi_en          TEXT         NULL,
  nilai_target_minimal  DECIMAL(5,2) NULL,        -- mis. 85.00 (target per-siklus)
  id_kurikulum          INT UNSIGNED NOT NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cpl (kode_cpl, id_kurikulum),
  CONSTRAINT fk_cpl_kurikulum FOREIGN KEY (id_kurikulum) REFERENCES kurikulum(id_kurikulum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indikator (IK) = turunan CPL + bobot IK->CPL (satu-satunya bobot perhitungan)
CREATE TABLE indikator (
  id_ik            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode_ik          VARCHAR(30)  NOT NULL,
  deskripsi_id     TEXT         NOT NULL,
  deskripsi_en     TEXT         NULL,
  bobot_ik_persen  DECIMAL(5,2) NOT NULL,         -- bobot IK->CPL (%)
  id_cpl           INT UNSIGNED NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ik (kode_ik, id_cpl),
  CONSTRAINT fk_ik_cpl FOREIGN KEY (id_cpl) REFERENCES cpl(id_cpl)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CPMK + link 0..1 ke IK + flag evaluator (cuma evaluator yang ditarik ke IK)
-- CATATAN: TIDAK ADA bobot_cpmk_prodi (sudah dibuang sesuai keputusan final)
CREATE TABLE cpmk (
  id_cpmk       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode_cpmk     VARCHAR(30)  NOT NULL,
  deskripsi_id  TEXT         NOT NULL,
  deskripsi_en  TEXT         NULL,
  id_mk         INT UNSIGNED NOT NULL,
  id_ik         INT UNSIGNED NULL,                -- link 0..1 ke indikator
  is_evaluator  TINYINT(1)   NOT NULL DEFAULT 0,  -- 1 = ditarik ke IK
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cpmk (kode_cpmk, id_mk),
  CONSTRAINT fk_cpmk_mk FOREIGN KEY (id_mk) REFERENCES mata_kuliah(id_mk),
  CONSTRAINT fk_cpmk_ik FOREIGN KEY (id_ik) REFERENCES indikator(id_ik)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- DATA RELASI / TRANSAKSI
-- =====================================================================

-- Kelas yang dibuka per tahun akademik (TANPA id dosen)
CREATE TABLE kelas_tayang (
  id_kelas    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_mk       INT UNSIGNED NOT NULL,
  id_ta       INT UNSIGNED NOT NULL,
  nama_kelas  VARCHAR(20)  NOT NULL,             -- mis. 'C'
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kelas (id_mk, id_ta, nama_kelas),
  CONSTRAINT fk_kelas_mk FOREIGN KEY (id_mk) REFERENCES mata_kuliah(id_mk),
  CONSTRAINT fk_kelas_ta FOREIGN KEY (id_ta) REFERENCES tahun_akademik(id_ta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pengampu kelas: dosen <-> kelas (bisa 1 atau banyak dosen: koordinator + anggota)
CREATE TABLE pengampu_kelas (
  id_pengampu INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kelas    INT UNSIGNED NOT NULL,
  id_staff    INT UNSIGNED NOT NULL,             -- harus role 'dosen'
  peran       ENUM('koordinator','anggota') NOT NULL DEFAULT 'anggota',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pengampu (id_kelas, id_staff),
  CONSTRAINT fk_pengampu_kelas FOREIGN KEY (id_kelas) REFERENCES kelas_tayang(id_kelas),
  CONSTRAINT fk_pengampu_staff FOREIGN KEY (id_staff) REFERENCES staff(id_staff)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- enrollment: peserta kelas
CREATE TABLE enrollment_mahasiswa (
  id_enrollment       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kelas     INT UNSIGNED NOT NULL,
  id_mahasiswa INT UNSIGNED NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrollment (id_kelas, id_mahasiswa),
  CONSTRAINT fk_enrollment_kelas FOREIGN KEY (id_kelas) REFERENCES kelas_tayang(id_kelas),
  CONSTRAINT fk_enrollment_mhs   FOREIGN KEY (id_mahasiswa) REFERENCES mahasiswa(id_mahasiswa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Komponen nilai / UK (tugas, UTS, UAS, partisipatif, proyek)
-- 1 komponen = 1 CPMK (garis lurus). bobot_non_cpmk untuk nilai akhir MK.
CREATE TABLE komponen_nilai (
  id_komponen     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kelas        INT UNSIGNED NOT NULL,
  nama_komponen   VARCHAR(100) NOT NULL,
  id_cpmk         INT UNSIGNED NOT NULL,          -- 1 komponen -> 1 CPMK
  bobot_non_cpmk  DECIMAL(5,2) NOT NULL,          -- bobot komponen utk nilai akhir MK (%)
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_komp_kelas FOREIGN KEY (id_kelas) REFERENCES kelas_tayang(id_kelas),
  CONSTRAINT fk_komp_cpmk  FOREIGN KEY (id_cpmk)  REFERENCES cpmk(id_cpmk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nilai mahasiswa per komponen + jejak audit (input_by/input_at) + FK tahun akademik
CREATE TABLE nilai_detail (
  id_nilai     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_komponen  INT UNSIGNED NOT NULL,
  id_mahasiswa INT UNSIGNED NOT NULL,
  nilai        DECIMAL(5,2) NOT NULL,             -- rentang 0-100
  id_ta        INT UNSIGNED NOT NULL,             -- periode (default berjalan, bisa backdate)
  input_by     INT UNSIGNED NULL,                 -- staff (dosen) yang input
  input_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_nilai (id_komponen, id_mahasiswa, id_ta),
  CONSTRAINT chk_nilai_range CHECK (nilai >= 0 AND nilai <= 100),
  CONSTRAINT fk_nilai_komp FOREIGN KEY (id_komponen)  REFERENCES komponen_nilai(id_komponen),
  CONSTRAINT fk_nilai_mhs  FOREIGN KEY (id_mahasiswa) REFERENCES mahasiswa(id_mahasiswa),
  CONSTRAINT fk_nilai_ta   FOREIGN KEY (id_ta)        REFERENCES tahun_akademik(id_ta),
  CONSTRAINT fk_nilai_by   FOREIGN KEY (input_by)     REFERENCES staff(id_staff)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Placeholder: kerangka capaian di luar pengajaran (struktur final menyusul)
CREATE TABLE capaian_non_pengajaran (
  id_capaian  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_mk       INT UNSIGNED NULL,
  id_cpl      INT UNSIGNED NULL,
  keterangan  TEXT         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nonpeng_mk  FOREIGN KEY (id_mk)  REFERENCES mata_kuliah(id_mk),
  CONSTRAINT fk_nonpeng_cpl FOREIGN KEY (id_cpl) REFERENCES cpl(id_cpl)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- VIEW - RANTAI PERHITUNGAN OBE
-- Komponen -> CPMK (garis lurus) -> CPMK -> IK (rata-rata, hanya evaluator)
-- -> IK -> CPL (penjumlahan berbobot). Bobot HANYA di tahap IK->CPL.
-- =====================================================================

-- Tahap 1: Nilai per CPMK per mahasiswa (1 komponen = 1 CPMK, garis lurus)
CREATE OR REPLACE VIEW v_nilai_cpmk AS
SELECT
  nd.id_mahasiswa,
  kt.id_ta,
  c.id_cpmk,
  c.id_ik,
  c.is_evaluator,
  nd.nilai AS nilai_cpmk
FROM nilai_detail nd
JOIN komponen_nilai kn ON kn.id_komponen = nd.id_komponen
JOIN cpmk c            ON c.id_cpmk = kn.id_cpmk
JOIN kelas_tayang kt   ON kt.id_kelas = kn.id_kelas;

-- Tahap 2: Nilai per IK = rata-rata CPMK (hanya CPMK evaluator)
CREATE OR REPLACE VIEW v_nilai_ik AS
SELECT
  vc.id_mahasiswa,
  vc.id_ta,
  vc.id_ik,
  AVG(vc.nilai_cpmk) AS nilai_ik
FROM v_nilai_cpmk vc
WHERE vc.is_evaluator = 1
  AND vc.id_ik IS NOT NULL
GROUP BY vc.id_mahasiswa, vc.id_ta, vc.id_ik;

-- Tahap 3: Nilai per CPL = penjumlahan berbobot IK + perbandingan target
CREATE OR REPLACE VIEW v_nilai_cpl AS
SELECT
  vi.id_mahasiswa,
  vi.id_ta,
  cpl.id_cpl,
  cpl.kode_cpl,
  SUM(vi.nilai_ik * ik.bobot_ik_persen) / NULLIF(SUM(ik.bobot_ik_persen), 0) AS nilai_cpl,
  cpl.nilai_target_minimal,
  CASE
    WHEN SUM(vi.nilai_ik * ik.bobot_ik_persen) / NULLIF(SUM(ik.bobot_ik_persen), 0)
         >= cpl.nilai_target_minimal THEN 'tercapai'
    ELSE 'belum'
  END AS status_capaian
FROM v_nilai_ik vi
JOIN indikator ik ON ik.id_ik = vi.id_ik
JOIN cpl          ON cpl.id_cpl = ik.id_cpl
GROUP BY vi.id_mahasiswa, vi.id_ta, cpl.id_cpl, cpl.kode_cpl, cpl.nilai_target_minimal;

-- =====================================================================
-- END OF FILE
-- =====================================================================
