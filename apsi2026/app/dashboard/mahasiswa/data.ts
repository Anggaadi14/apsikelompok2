export interface CplDataItem {
  name: string;
  nilai: number;
  target: number;
  status: string;
  kategori: string;
}

export interface CpmkItem {
  kode: string;
  deskripsi: string;
  bobot: number;
  nilai: number;
  matakuliah: string;
  semester: number;
  nilaiMK: string;
}

export interface IkItem {
  kode: string;
  deskripsi: string;
  bobot: number;
  nilai: number;
  cpmk: CpmkItem[];
}

export interface DetailCplItem {
  cpl: string;
  deskripsi: string;
  nilai: number;
  status: string;
  ik: IkItem[];
}

export interface MataKuliahItem {
  semester: string;
  kode: string;
  nama: string;
  sks: number;
  nilai: string;
  nilaiAngka: number;
}

export interface RiwayatNilaiItem {
  no: number;
  semester: number;
  kode: string;
  nama: string;
  sks: number;
  uk1: number;
  uk2: number;
  uk3: number;
  uk4: number;
  uk5: number;
  nilaiAkhir: number;
  skala100: number;
  huruf: string;
}

export const cplData: CplDataItem[] = [
  { name: 'CPL-1', nilai: 85, target: 80, status: 'Tercapai', kategori: 'Pengetahuan' },
  { name: 'CPL-2', nilai: 78, target: 80, status: 'Belum Tercapai', kategori: 'Keterampilan Khusus' },
  { name: 'CPL-3', nilai: 92, target: 80, status: 'Tercapai', kategori: 'Keterampilan Umum' },
  { name: 'CPL-4', nilai: 88, target: 80, status: 'Tercapai', kategori: 'Pengetahuan' },
  { name: 'CPL-5', nilai: 75, target: 80, status: 'Belum Tercapai', kategori: 'Keterampilan Khusus' },
  { name: 'CPL-6', nilai: 90, target: 80, status: 'Tercapai', kategori: 'Sikap' },
  { name: 'CPL-7', nilai: 0, target: 80, status: 'Belum Ditempuh', kategori: 'Keterampilan Umum' },
  { name: 'CPL-8', nilai: 86, target: 80, status: 'Tercapai', kategori: 'Pengetahuan' },
  { name: 'CPL-9', nilai: 0, target: 80, status: 'Belum Ditempuh', kategori: 'Sikap' },
  { name: 'CPL-10', nilai: 83, target: 80, status: 'Tercapai', kategori: 'Keterampilan Khusus' },
];

export const radarData = cplData.map(cpl => ({
  subject: cpl.name,
  nilai: cpl.nilai,
  target: cpl.target,
}));

export const detailCPL: DetailCplItem[] = [
  {
    cpl: 'CPL-1',
    deskripsi: 'Mampu menerapkan pengetahuan matematika, sains, dan teknik industri',
    nilai: 85,
    status: 'Tercapai',
    ik: [
      {
        kode: 'IK-1.1',
        deskripsi: 'Memahami konsep dasar matematika teknik',
        bobot: 50,
        nilai: 87,
        cpmk: [
          {
            kode: 'CPMK-1.1',
            deskripsi: 'Mahasiswa mampu menjelaskan konsep probabilitas',
            bobot: 40,
            nilai: 85,
            matakuliah: 'Statistika Industri (TI2101)',
            semester: 3,
            nilaiMK: 'A'
          },
          {
            kode: 'CPMK-1.2',
            deskripsi: 'Mahasiswa mampu menghitung distribusi probabilitas',
            bobot: 60,
            nilai: 88,
            matakuliah: 'Statistika Industri (TI2101)',
            semester: 3,
            nilaiMK: 'A'
          }
        ]
      },
      {
        kode: 'IK-1.2',
        deskripsi: 'Menerapkan metode statistika dalam analisis data',
        bobot: 50,
        nilai: 83,
        cpmk: [
          {
            kode: 'CPMK-2.1',
            deskripsi: 'Mahasiswa mampu melakukan uji hipotesis',
            bobot: 100,
            nilai: 83,
            matakuliah: 'Statistika Industri (TI2101)',
            semester: 3,
            nilaiMK: 'A'
          }
        ]
      }
    ]
  },
  {
    cpl: 'CPL-2',
    deskripsi: 'Mampu merancang sistem terintegrasi dengan mempertimbangkan aspek teknis dan ekonomis',
    nilai: 78,
    status: 'Belum Tercapai',
    ik: [
      {
        kode: 'IK-2.1',
        deskripsi: 'Merancang sistem produksi yang efisien',
        bobot: 100,
        nilai: 78,
        cpmk: [
          {
            kode: 'CPMK-3.1',
            deskripsi: 'Mahasiswa mampu merancang tata letak pabrik',
            bobot: 50,
            nilai: 75,
            matakuliah: 'Perancangan Tata Letak Pabrik (TI2102)',
            semester: 4,
            nilaiMK: 'B+'
          },
          {
            kode: 'CPMK-3.2',
            deskripsi: 'Mahasiswa mampu menganalisis aliran material',
            bobot: 50,
            nilai: 80,
            matakuliah: 'Perancangan Tata Letak Pabrik (TI2102)',
            semester: 4,
            nilaiMK: 'B+'
          }
        ]
      }
    ]
  },
  {
    cpl: 'CPL-7',
    deskripsi: 'Mampu berkomunikasi efektif dalam tim multidisiplin',
    nilai: 0,
    status: 'Belum Ditempuh',
    ik: [
      {
        kode: 'IK-7.1',
        deskripsi: 'Berkomunikasi lisan dan tertulis dengan efektif',
        bobot: 100,
        nilai: 0,
        cpmk: [
          {
            kode: 'CPMK-7.1',
            deskripsi: 'Mahasiswa mampu mempresentasikan hasil kerja',
            bobot: 100,
            nilai: 0,
            matakuliah: 'Kerja Praktek (TI3501)',
            semester: 7,
            nilaiMK: '-'
          }
        ]
      }
    ]
  }
];

export const mataKuliahData: MataKuliahItem[] = [
  { semester: 'Semester 5', kode: 'TI-301', nama: 'Sistem Produksi', sks: 3, nilai: 'A', nilaiAngka: 88 },
  { semester: 'Semester 5', kode: 'TI-305', nama: 'Ergonomi', sks: 3, nilai: 'B+', nilaiAngka: 82 },
  { semester: 'Semester 5', kode: 'TI-308', nama: 'Pengendalian Kualitas', sks: 3, nilai: 'A-', nilaiAngka: 85 },
];

export const riwayatNilaiData: RiwayatNilaiItem[] = [
  { no: 1, semester: 1, kode: 'BIO3303', nama: 'Fisika Teknik Industri', sks: 2, uk1: 0, uk2: 50, uk3: 50, uk4: 0, uk5: 0, nilaiAkhir: 71.9, skala100: 71.9, huruf: 'B' },
  { no: 2, semester: 1, kode: 'BIO3304', nama: 'Praktikum Fisika Industri', sks: 1, uk1: 0, uk2: 45, uk3: 45, uk4: 0, uk5: 0, nilaiAkhir: 67.6, skala100: 67.6, huruf: 'B' },
  { no: 3, semester: 1, kode: 'BIO3305', nama: 'Kimia Dasar', sks: 2, uk1: 0, uk2: 55, uk3: 55, uk4: 0, uk5: 0, nilaiAkhir: 84.1, skala100: 84.1, huruf: 'A-' },
  { no: 4, semester: 1, kode: 'BIO3306', nama: 'Praktikum Kimia Dasar', sks: 1, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 89.2, skala100: 89.2, huruf: 'A' },
  { no: 5, semester: 2, kode: 'TI03001', nama: 'KALKULUS', sks: 3, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80.2, skala100: 80.2, huruf: 'B+' },
  { no: 6, semester: 2, kode: 'TI03002', nama: 'STATISTIKA DASAR', sks: 3, uk1: 0, uk2: 58, uk3: 58, uk4: 0, uk5: 0, nilaiAkhir: 88.1, skala100: 88.1, huruf: 'B+' },
  { no: 7, semester: 2, kode: 'TI03003', nama: 'GAMBAR TEKNIK', sks: 2, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90.37, skala100: 90.37, huruf: 'A-' },
  { no: 8, semester: 3, kode: 'TI03004', nama: 'ILMU BAHAN TEKNIK', sks: 2, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80, skala100: 80, huruf: 'B+' },
  { no: 9, semester: 3, kode: 'TI03005', nama: 'MEKANIKA TEKNIK', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
  { no: 10, semester: 3, kode: 'TI03006', nama: 'PEMROGRAMAN KOMPUTER (MATLAB/PYTHON)', sks: 2, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
  { no: 11, semester: 3, kode: 'TI03007', nama: 'STATISTIKA INDUSTRI 1', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
  { no: 12, semester: 4, kode: 'TI03008', nama: 'SISTEM INFORMASI PERUSAHAAN TERINTEGRASI', sks: 2, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80, skala100: 80, huruf: 'B+' },
  { no: 13, semester: 4, kode: 'TI03009', nama: 'SISTEM MANAJEMEN KUALITAS INDUSTRI', sks: 3, uk1: 0, uk2: 55, uk3: 55, uk4: 0, uk5: 0, nilaiAkhir: 85, skala100: 85, huruf: 'A-' },
  { no: 14, semester: 4, kode: 'TI03010', nama: 'ELEMEN MESIN', sks: 2, uk1: 0, uk2: 48, uk3: 48, uk4: 0, uk5: 0, nilaiAkhir: 75, skala100: 75, huruf: 'B' },
  { no: 15, semester: 4, kode: 'TI03011', nama: 'PERANCANGAN SISTEM KERJA & ERGONOMI', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
  { no: 16, semester: 5, kode: 'TI03012', nama: 'OTOMASI SISTEM PRODUKSI', sks: 2, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
  { no: 17, semester: 5, kode: 'TI-301', nama: 'Sistem Produksi', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 88, skala100: 88, huruf: 'A' },
  { no: 18, semester: 5, kode: 'TI-305', nama: 'Ergonomi', sks: 3, uk1: 0, uk2: 54, uk3: 54, uk4: 0, uk5: 0, nilaiAkhir: 82, skala100: 82, huruf: 'B+' },
  { no: 19, semester: 5, kode: 'TI-308', nama: 'Pengendalian Kualitas', sks: 3, uk1: 0, uk2: 56, uk3: 56, uk4: 0, uk5: 0, nilaiAkhir: 85, skala100: 85, huruf: 'A-' },
];
