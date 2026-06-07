-- ============================================================================
-- MIGRATION 008 — OBE Engine Aggregation Views
-- Level 1: NilaiCPMK = Σ(NilaiMedia × BobotMedia/100)
-- Level 2: NilaiIK   = Σ(NilaiCPMK × BobotCPMK→IK/100)
-- Level 3: NilaiCPL  = Σ(NilaiIK × BobotIK→CPL/100)
-- ============================================================================

DROP VIEW IF EXISTS v_nilai_cpl_per_mhs;
DROP VIEW IF EXISTS v_nilai_ik_per_mhs;
DROP VIEW IF EXISTS v_nilai_cpmk_per_mhs;

-- =========================================================
-- LEVEL 1 — Nilai CPMK per Mahasiswa per Kelas
-- nilai_efektif = COALESCE(remedi, asli, 0)
-- =========================================================
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
WHERE c.id_mata_kuliah = km.id_mata_kuliah  -- safety: cpmk harus dari MK yang sama dgn kelas
GROUP BY nd.id_mahasiswa, nd.id_kelas, c.id_cpmk;

-- =========================================================
-- LEVEL 2 — Nilai IK per Mahasiswa (agregasi lintas MK & Kelas)
-- =========================================================
CREATE VIEW v_nilai_ik_per_mhs AS
SELECT
  vcpmk.id_mahasiswa,
  mci.id_ik,
  ik.kode_ik,
  ik.id_cpl,
  SUM(vcpmk.nilai_cpmk * (mci.bobot_persen / 100.0)) AS nilai_ik
FROM v_nilai_cpmk_per_mhs vcpmk
JOIN mapping_cpmk_ik mci ON mci.id_cpmk = vcpmk.id_cpmk
JOIN indikator_kinerja ik ON ik.id_ik = mci.id_ik
GROUP BY vcpmk.id_mahasiswa, mci.id_ik;

-- =========================================================
-- LEVEL 3 — Nilai CPL per Mahasiswa
-- =========================================================
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