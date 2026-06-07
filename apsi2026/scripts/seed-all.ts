import { spawnSync } from 'child_process'
import * as path from 'path'

const scripts = [
  'seed-1-cpl-ik.ts',
  'seed-2-mata-kuliah.ts',
  'seed-3-cpmk.ts',
  'seed-4-dosen-kelas.ts',
  'seed-5-nilai.ts',
]

console.log('\n\x1b[1m🚀 SICPL Seed Pipeline — All 5 stages\x1b[0m\n')

for (let i = 0; i < scripts.length; i++) {
  const script = scripts[i]
  console.log(`\n\x1b[1m\x1b[44m  STAGE ${i + 1}/${scripts.length}: ${script}  \x1b[0m\n`)
  const result = spawnSync('npx', ['tsx', path.join('scripts', script)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    console.error(`\n\x1b[31m✗ Stage ${i + 1} failed (exit code ${result.status}). Pipeline dihentikan.\x1b[0m`)
    process.exit(result.status ?? 1)
  }
}

console.log('\n\x1b[32m\x1b[1m✅ Seed pipeline selesai. Cek data_bermasalah untuk anomali.\x1b[0m\n')