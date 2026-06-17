// gen_template_mahasiswa.cjs
// Jalankan SEKALI di root project: node gen_template_mahasiswa.cjs
// Output: public/templates/Template_Mahasiswa.xlsx

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const wb = XLSX.utils.book_new();

// Sheet 0: Petunjuk
const petunjuk = [
  ['TEMPLATE IMPORT MAHASIWA — SICPL'],
  [''],
  ['Cara pakai:'],
  ['1. Isi sheet "1. Mahasiswa" dengan daftar mahasiswa baru/aktif.'],
  ['   - NIM: wajib unik (mis. I0322001).'],
  ['   - Nama Lengkap: wajib.'],
  ['   - Email SSO: opsional. Kalau kosong, sistem akan generate <nim>@placeholder.sicpl.local.'],
  ['   - Angkatan: tahun (mis. 2024). Wajib angka 4 digit.'],
  [''],
  ['2. Isi sheet "2. Enrollment Kelas" (opsional) untuk daftar peserta kelas.'],
  ['   - NIM: harus sudah ada di sheet 1 ATAU sudah ada di database.'],
  ['   - Kode MK: kode mata kuliah (mis. TIN201).'],
  ['   - Tahun Akademik: format "2025/2026" atau "2026/2027".'],
  ['   - Semester: "Ganjil" atau "Genap".'],
  ['   - Kode Kelas: kode kelas (mis. A, B, C).'],
  [''],
  ['3. UPSERT by NIM: kalau NIM sudah ada, data nama/email/angkatan akan di-update.'],
  ['4. Enrollment INSERT IGNORE: kalau sudah ter-enroll di kelas tsb, baris diabaikan.'],
  [''],
  ['Catatan:'],
  ['- Baris kosong / NIM kosong akan di-skip.'],
  ['- Validasi NIM minimal 4 karakter alfanumerik.'],
  ['- Untuk enrollment, kelas yang dimaksud harus sudah dibuat via menu "Kelola Kelas Tayang".'],
];
const wsP = XLSX.utils.aoa_to_sheet(petunjuk);
wsP['!cols'] = [{ wch: 90 }];
XLSX.utils.book_append_sheet(wb, wsP, 'Petunjuk');

// Sheet 1: Mahasiswa
const mhsRows = [
  ['NIM', 'Nama Lengkap', 'Email SSO', 'Angkatan'],
  ['I0323001', 'Hana Ayu', 'i0323001@student.uns.ac.id', 2026],
  ['I0323002', 'Indra Wijaya', '', 2026],
  ['I0323003', 'Joko Susilo', 'i0323003@student.uns.ac.id', 2026],
];
const wsM = XLSX.utils.aoa_to_sheet(mhsRows);
wsM['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 32 }, { wch: 10 }];
XLSX.utils.book_append_sheet(wb, wsM, '1. Mahasiswa');

// Sheet 2: Enrollment Kelas
const enrRows = [
  ['NIM', 'Kode MK', 'Tahun Akademik', 'Semester', 'Kode Kelas'],
  ['I0323001', 'TIN201', '2026/2027', 'Ganjil', 'A'],
  ['I0323002', 'TIN201', '2026/2027', 'Ganjil', 'A'],
  ['I0323003', 'TIN305', '2026/2027', 'Ganjil', 'B'],
];
const wsE = XLSX.utils.aoa_to_sheet(enrRows);
wsE['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, wsE, '2. Enrollment Kelas');

const dir = path.resolve(__dirname, 'public/templates');
fs.mkdirSync(dir, { recursive: true });
const out = path.resolve(dir, 'Template_Mahasiswa.xlsx');
XLSX.writeFile(wb, out);
console.log('OK ->', out);