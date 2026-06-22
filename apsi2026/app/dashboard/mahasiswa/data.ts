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
