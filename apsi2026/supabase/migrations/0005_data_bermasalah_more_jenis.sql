-- app/api/dosen/upload-nilai needs two more failure categories that the
-- original migration 007 enum didn't anticipate (it predates the SIAKAD
-- upload flow): a row whose NIM isn't enrolled in the target kelas, and a
-- UK column with no matching komponen_nilai for that mata kuliah.
alter type data_bermasalah_jenis add value 'mahasiswa_tidak_enrolled';
alter type data_bermasalah_jenis add value 'komponen_nilai_tidak_ditemukan';
