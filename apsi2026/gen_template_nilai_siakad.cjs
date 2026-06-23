// gen_template_nilai_siakad.cjs
// Jalankan SEKALI di root project: node gen_template_nilai_siakad.cjs
// Output: public/templates/Template_Nilai_SIAKAD.xlsx
//
// Sheet pertama HARUS mengikuti posisi baris/kolom yang dibaca app/lib/siakadParser.ts:
//   Baris 11 (idx10) = token, baris 14 (idx13) = bobot media (UK1..UK5, total 100),
//   baris 15+ (idx14+) = data (No, NIM, Nama, UK1..UK5, Nilai Akhir).

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const wb = XLSX.utils.book_new();

// Sheet 0: format SIAKAD (HARUS index 0 — parser hanya baca sheet pertama)
const rows = [
  ['CONTOH FORMAT EXPORT NILAI SIAKAD UNS'],
  ['Jangan ubah posisi baris/kolom. Ganti hanya NIM, Nama, dan nilai UK1-UK5.'],
  ['Mata Kuliah', ':', 'Contoh Mata Kuliah'],
  ['Kelas', ':', 'A'],
  ['Tahun Akademik', ':', '2025/2026 Ganjil'],
  [],
  [],
  [],
  [],
  [],
  [null, 'TOKEN-CONTOH-EXAMPLE-0001'], // baris 11 (idx10): token
  [null, null, null, 'Komponen Nilai'], // baris 12 (idx11): header utama
  ['No', 'NIM', 'Nama', 'UK1', 'UK2', 'UK3', 'UK4', 'UK5', 'Nilai Akhir'], // baris 13 (idx12): sub header
  [null, null, 'Bobot (%)', 20, 20, 30, 15, 15], // baris 14 (idx13): bobot media, total harus 100
  [1, '2024001', 'Contoh Mahasiswa Satu', 80, 75, 85, 78, 90, 81.7],
  [2, '2024002', 'Contoh Mahasiswa Dua', 70, 65, 72, 80, 75, 71.6],
  [3, '2024003', 'Contoh Mahasiswa Tiga', 90, 88, 92, 85, 95, 90.5],
];
const wsNilai = XLSX.utils.aoa_to_sheet(rows);
wsNilai['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, wsNilai, 'Nilai');

// Sheet 1: Petunjuk (aman — parser hanya baca sheet index 0)
const petunjuk = [
  ['TEMPLATE UPLOAD NILAI SIAKAD — SICPL'],
  [''],
  ['File ini adalah CONTOH struktur file ekspor nilai dari SIAKAD UNS yang dibaca sistem.'],
  ['Pada penggunaan sebenarnya, dosen mengunggah file hasil ekspor langsung dari SIAKAD'],
  ['(bukan file ini), karena SIAKAD menyertakan token validasi pada baris 11.'],
  [''],
  ['Gunakan file ini untuk:'],
  ['1. Memahami posisi kolom yang dibaca sistem (NIM di kolom B, Nama di kolom C,'],
  ['   UK1-UK5 di kolom D-H, Nilai Akhir di kolom I).'],
  ['2. Uji coba alur upload (data contoh ini akan tersimpan sebagai nilai sungguhan'],
  ['   jika NIM-nya cocok dengan mahasiswa di kelas Anda).'],
  [''],
  ['Catatan:'],
  ['- Baris 14 (Bobot Media UK1..UK5) totalnya harus 100.'],
  ['- Jangan ubah posisi baris/kolom — sistem membaca berdasarkan nomor baris tetap.'],
  ['- NIM yang tidak terdaftar di kelas akan dilaporkan gagal & masuk ke data bermasalah.'],
];
const wsP = XLSX.utils.aoa_to_sheet(petunjuk);
wsP['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsP, 'Petunjuk');

const dir = path.resolve(__dirname, 'public/templates');
fs.mkdirSync(dir, { recursive: true });
const out = path.resolve(dir, 'Template_Nilai_SIAKAD.xlsx');
XLSX.writeFile(wb, out);
console.log('OK ->', out);
