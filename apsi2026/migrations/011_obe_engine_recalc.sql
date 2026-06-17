-- ============================================================================
-- MIGRATION 011 - OBE Engine Recalculation (aturan TIM PROGRAMMER)
-- Level 1 UK   -> CPMK : 1 jalur, dosen input nilai matang (TIDAK diubah)
-- Level 2 CPMK -> IK   : RATA-RATA (AVG), TANPA bobot, HANYA MK evaluator
-- Level 3 IK   -> CPL  : perkalian BOBOT (TIDAK diubah)
-- Aman dijalankan ulang.
-- ============================================================================

-- A) Penanda Mata Kuliah Evaluator -------------------------------------------
-- Hanya CPMK dari MK ber-flag evaluator yang ditarik ke Indikator (Level 2).
-- Default 1 supaya data seed langsung mengalir; set 0 untuk MK non-evaluator.
ALTER TABLE mata_kuliah
  ADD COLUMN IF NOT EXISTS is_evaluator TINYINT(1) NOT NULL DEFAULT 1 AFTER singkatan;

-- B) Bangun ulang VIEW engine -------------------------------------------------
DROP VIEW IF EXISTS v_nilai_cpl_per_mhs;
DROP VIEW IF EXISTS v_nilai_ik_per_mhs;
DROP VIEW IF EXISTS v_nilai_cpmk_per_mhs;

-- LEVEL 1 - Nilai CPMK per Mahasiswa per Kelas (TIDAK diubah)
-- nilai_efektif = COALESCE(remedi, asli, 0)
CREATE VIEW v_nilai_cpmk_per_mhs AS
SELECT
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
WHERE c.id_mata_kuliah = km.id_mata_kuliah
GROUP BY nd.id_mahasiswa, nd.id_kelas, c.id_cpmk;

-- LEVEL 2 - Nilai IK per Mahasiswa = RATA-RATA nilai CPMK (tanpa bobot)
-- Hanya CPMK dari Mata Kuliah evaluator (mk.is_evaluator = 1).
CREATE VIEW v_nilai_ik_per_mhs AS
SELECT
  vcpmk.id_mahasiswa,
  mci.id_ik,
  ik.kode_ik,
  ik.id_cpl,
  AVG(vcpmk.nilai_cpmk) AS nilai_ik
FROM v_nilai_cpmk_per_mhs vcpmk
JOIN mata_kuliah mk ON mk.id_mata_kuliah = vcpmk.id_mata_kuliah AND mk.is_evaluator = 1
JOIN mapping_cpmk_ik mci ON mci.id_cpmk = vcpmk.id_cpmk
JOIN indikator_kinerja ik ON ik.id_ik = mci.id_ik
GROUP BY vcpmk.id_mahasiswa, mci.id_ik;

-- LEVEL 3 - Nilai CPL per Mahasiswa = Σ(nilai IK × bobot IK→CPL) (TIDAK diubah)
CREATE VIEW v_nilai_cpl_per_mhs AS
SELECT
  vik.id_mahasiswa,
  mic.id_cpl,
  c.kode_cpl,
  c.singkatan,
  c.id_kurikulum,
  SUM(vik.nilai_ik * (mic.bobot_persen / 100.0)) AS nilai_cpl
FROM v_nilai_ik_per_mhs vik
JOIN mapping_ik_cpl mic ON mic.id_ik = vik.id_ik
JOIN cpl c ON c.id_cpl = mic.id_cpl
GROUP BY vik.id_mahasiswa, mic.id_cpl;
