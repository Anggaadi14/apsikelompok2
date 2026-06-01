// app/lib/grading.ts
//
// KONVERSI NILAI — Angka → Huruf sesuai standar UNS
//
// Mengapa ini perlu:
//   - Schema database (nilai_detail) hanya menyimpan nilai_asli (angka desimal)
//   - Tidak ada kolom huruf di database
//   - Dashboard mahasiswa menampilkan nilai huruf (A, B+, A-, dst)
//   - Solusi: konversi dilakukan di backend sebelum data dikirim ke client
//
// Skala yang digunakan sesuai Peraturan Akademik UNS:
//   A   = 85 - 100  (4.0)
//   A-  = 80 - 84   (3.7)
//   B+  = 75 - 79   (3.3)
//   B   = 70 - 74   (3.0)
//   B-  = 65 - 69   (2.7)
//   C+  = 60 - 64   (2.3)
//   C   = 55 - 59   (2.0)
//   D   = 40 - 54   (1.0)
//   E   = 0  - 39   (0.0)
//
// Sesuaikan dengan kebijakan prodi jika berbeda.

export interface GradeResult {
  huruf: string;  // A, A-, B+, B, dst
  bobot: number;  // 4.0, 3.7, 3.3, dst — dipakai untuk hitung IPK
}

/**
 * Konversi nilai angka (0-100) ke huruf + bobot mutu.
 *
 * Contoh:
 *   nilaiKeHuruf(88) → { huruf: 'A', bobot: 4.0 }
 *   nilaiKeHuruf(76) → { huruf: 'B+', bobot: 3.3 }
 */
export function nilaiKeHuruf(nilai: number): GradeResult {
  if (nilai >= 85) return { huruf: 'A',  bobot: 4.0 };
  if (nilai >= 80) return { huruf: 'A-', bobot: 3.7 };
  if (nilai >= 75) return { huruf: 'B+', bobot: 3.3 };
  if (nilai >= 70) return { huruf: 'B',  bobot: 3.0 };
  if (nilai >= 65) return { huruf: 'B-', bobot: 2.7 };
  if (nilai >= 60) return { huruf: 'C+', bobot: 2.3 };
  if (nilai >= 55) return { huruf: 'C',  bobot: 2.0 };
  if (nilai >= 40) return { huruf: 'D',  bobot: 1.0 };
  return             { huruf: 'E',  bobot: 0.0 };
}

/**
 * Hitung IPK dari array mata kuliah yang sudah punya nilai dan SKS.
 *
 * IPK = Σ(bobot_mutu × sks) / Σ(sks)
 *
 * Contoh input:
 *   [
 *     { sks: 3, nilaiAngka: 88 },  → A (4.0) × 3 = 12
 *     { sks: 2, nilaiAngka: 75 },  → B+ (3.3) × 2 = 6.6
 *   ]
 *   IPK = (12 + 6.6) / (3 + 2) = 18.6 / 5 = 3.72
 */
export function hitungIPK(
  mataKuliah: Array<{ sks: number; nilaiAngka: number }>
): number {
  if (mataKuliah.length === 0) return 0;

  let totalMutu = 0;
  let totalSKS = 0;

  for (const mk of mataKuliah) {
    const { bobot } = nilaiKeHuruf(mk.nilaiAngka);
    totalMutu += bobot * mk.sks;
    totalSKS  += mk.sks;
  }

  if (totalSKS === 0) return 0;

  // Bulatkan 2 desimal
  return Math.round((totalMutu / totalSKS) * 100) / 100;
}

/**
 * Format nama semester dari format database ke format display.
 *
 * Database menyimpan: semester='ganjil', tahun_akademik='2024/2025'
 * Display:           'Ganjil 2024/2025'
 */
export function formatSemester(semester: string, tahunAkademik: string): string {
  const semesterCapital = semester.charAt(0).toUpperCase() + semester.slice(1);
  return `${semesterCapital} ${tahunAkademik}`;
}
