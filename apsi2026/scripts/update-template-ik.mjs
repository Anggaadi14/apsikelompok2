/**
 * Adds "Deskripsi (English)" column to the IK sheet in the OBE template.
 * Run once: node scripts/update-template-ik.mjs
 *
 * New IK column order:
 *   Kode IK | Kode CPL | Deskripsi (Indonesia) | Deskripsi (English) | Bobot (%)
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '../public/templates/Template_Import_SICPL_KOSONG.xlsx');
const dummyPath = join(__dirname, '../public/templates/Data_Dummy_SICPL_K24.xlsx');

function patchIkSheet(wb, filePath) {
  const sheetName = wb.SheetNames.find((n) => /\bik\b/i.test(n) || n.toLowerCase().includes('2.'));
  if (!sheetName) {
    console.warn(`[${filePath}] Tidak menemukan sheet IK — dilewati.`);
    return false;
  }
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });

  // Find header row (starts with "Kode")
  const headerIdx = aoa.findIndex((r) => Array.isArray(r) && String(r[0] ?? '').toLowerCase().startsWith('kode'));
  if (headerIdx < 0) {
    console.warn(`[${filePath}] Header IK tidak ditemukan — dilewati.`);
    return false;
  }

  const header = aoa[headerIdx];
  // Check if deskripsi_en already exists
  const alreadyHas = header.some((h) => /english|inggris|en\b/i.test(String(h ?? '')));
  if (alreadyHas) {
    console.log(`[${filePath}] Kolom deskripsi EN sudah ada di sheet "${sheetName}" — tidak ada perubahan.`);
    return false;
  }

  // Insert new column after Deskripsi (index 2) → shift Bobot from index 3 to 4
  for (let row = headerIdx; row < aoa.length; row++) {
    const r = aoa[row];
    if (row === headerIdx) {
      r.splice(3, 0, 'Deskripsi (English)');
    } else {
      r.splice(3, 0, null);
    }
  }

  const newWs = XLSX.utils.aoa_to_sheet(aoa);
  wb.Sheets[sheetName] = newWs;
  console.log(`[${filePath}] Kolom "Deskripsi (English)" berhasil ditambahkan ke sheet "${sheetName}".`);
  return true;
}

for (const p of [templatePath, dummyPath]) {
  try {
    const buf = readFileSync(p);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const changed = patchIkSheet(wb, p);
    if (changed) {
      XLSX.writeFile(wb, p);
      console.log(`  → Tersimpan: ${p}`);
    }
  } catch (e) {
    console.error(`Gagal memproses ${p}:`, e.message);
  }
}
