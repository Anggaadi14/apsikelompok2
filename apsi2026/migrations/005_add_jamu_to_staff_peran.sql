-- Tambah 'jamu' (jaminan mutu) ke ENUM peran staff
-- Sesuai notul: 5 kelompok login (kaprodi, jamu, admin, dosen, mahasiswa)

ALTER TABLE staff 
  MODIFY COLUMN peran ENUM('admin','dosen','kaprodi','jamu') NOT NULL;