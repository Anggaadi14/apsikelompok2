import * as XLSX from 'xlsx';

export type SiakadRow = {
  nim: string;
  nama: string;
  nilai: {
    UK1: number | null;
    UK2: number | null;
    UK3: number | null;
    UK4: number | null;
    UK5: number | null;
  };
  nilai_akhir: number | null;
};

export type SiakadBobotMedia = {
  UK1: number;
  UK2: number;
  UK3: number;
  UK4: number;
  UK5: number;
};

export type SiakadParseResult = {
  token: string;
  bobot_media: SiakadBobotMedia;
  rows: SiakadRow[];
  total_bobot: number;
  warnings: string[];
};

// Format SIAKAD UNS (referensi: berdasarkan template grid-export):
//   Row index 10  = token hash file (cell B11 di Excel UI)
//   Row index 11  = header label utama
//   Row index 12  = header sub (UK1/UK2/.../NilaiAkhir)
//   Row index 13  = bobot media (sum harus 100)
//   Row index 14+ = data baris mahasiswa (NIM, Nama, UK1..UK5, NilaiAkhir)

const TOKEN_ROW = 10;
const BOBOT_ROW = 13;
const DATA_START_ROW = 14;

// Kolom (0-indexed): A=No, B=NIM, C=Nama, D=UK1, E=UK2, F=UK3, G=UK4, H=UK5, I=NilaiAkhir
const COL_NIM = 1;
const COL_NAMA = 2;
const COL_UK1 = 3;
const COL_UK2 = 4;
const COL_UK3 = 5;
const COL_UK4 = 6;
const COL_UK5 = 7;
const COL_AKHIR = 8;

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toStringTrim(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/**
 * Parse Excel SIAKAD nilai. Bisa terima .xls (HTML grid-export) maupun .xlsx asli.
 * Throws Error dengan pesan Indonesia kalau format tidak dikenali.
 */
export function parseSiakadFile(buffer: Buffer): SiakadParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } catch (e) {
    throw new Error('File tidak dapat dibaca sebagai Excel. Pastikan format .xls atau .xlsx dari SIAKAD.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('File Excel kosong (tidak ada sheet).');

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (matrix.length < DATA_START_ROW + 1) {
    throw new Error(
      `Format SIAKAD tidak valid: file harus punya minimal ${DATA_START_ROW + 1} baris (token di baris ${TOKEN_ROW + 1}, data mulai baris ${DATA_START_ROW + 1}).`,
    );
  }

  // Extract token dari row 10 (cari cell non-empty pertama)
  const tokenRowCells = (matrix[TOKEN_ROW] ?? []) as unknown[];
  const tokenRaw = tokenRowCells.find((c) => toStringTrim(c).length > 0);
  const token = toStringTrim(tokenRaw);
  if (!token) {
    throw new Error(`Token validasi SIAKAD tidak ditemukan di baris ${TOKEN_ROW + 1}.`);
  }

  // Extract bobot media dari row 13
  const bobotRow = (matrix[BOBOT_ROW] ?? []) as unknown[];
  const bobot_media: SiakadBobotMedia = {
    UK1: toNumberOrNull(bobotRow[COL_UK1]) ?? 0,
    UK2: toNumberOrNull(bobotRow[COL_UK2]) ?? 0,
    UK3: toNumberOrNull(bobotRow[COL_UK3]) ?? 0,
    UK4: toNumberOrNull(bobotRow[COL_UK4]) ?? 0,
    UK5: toNumberOrNull(bobotRow[COL_UK5]) ?? 0,
  };
  const total_bobot = bobot_media.UK1 + bobot_media.UK2 + bobot_media.UK3 + bobot_media.UK4 + bobot_media.UK5;

  const warnings: string[] = [];
  if (Math.abs(total_bobot - 100) > 0.01) {
    warnings.push(
      `Total bobot UK1..UK5 = ${total_bobot.toFixed(2)}%, seharusnya 100%. Periksa baris ${BOBOT_ROW + 1} di file SIAKAD.`,
    );
  }

  // Extract baris mahasiswa
  const rows: SiakadRow[] = [];
  for (let i = DATA_START_ROW; i < matrix.length; i++) {
    const r = (matrix[i] ?? []) as unknown[];
    const nim = toStringTrim(r[COL_NIM]);
    const nama = toStringTrim(r[COL_NAMA]);
    if (!nim && !nama) continue; // skip baris kosong
    if (!nim) {
      warnings.push(`Baris ${i + 1}: NIM kosong, dilewati.`);
      continue;
    }
    rows.push({
      nim,
      nama,
      nilai: {
        UK1: toNumberOrNull(r[COL_UK1]),
        UK2: toNumberOrNull(r[COL_UK2]),
        UK3: toNumberOrNull(r[COL_UK3]),
        UK4: toNumberOrNull(r[COL_UK4]),
        UK5: toNumberOrNull(r[COL_UK5]),
      },
      nilai_akhir: toNumberOrNull(r[COL_AKHIR]),
    });
  }

  if (rows.length === 0) {
    throw new Error(`Tidak ada baris mahasiswa ditemukan mulai baris ${DATA_START_ROW + 1}.`);
  }

  return { token, bobot_media, rows, total_bobot, warnings };
}

/**
 * Map UK label → kode_media yang dicari di tabel komponen_nilai.
 * Konvensi seed-5: UK1=Tugas, UK2=UTS, UK3=UAS, UK4=CM (Partisipatif), UK5=TBP (Hasil Proyek).
 * Tapi prioritas pertama tetap match kode_media = "UK1" dst (kalau ada).
 */
export const UK_CODE_PRIORITY: Record<keyof SiakadBobotMedia, string[]> = {
  UK1: ['UK1', 'Tugas', 'TUGAS'],
  UK2: ['UK2', 'UTS'],
  UK3: ['UK3', 'UAS'],
  UK4: ['UK4', 'CM', 'Partisipatif'],
  UK5: ['UK5', 'TBP', 'Hasil Proyek'],
};