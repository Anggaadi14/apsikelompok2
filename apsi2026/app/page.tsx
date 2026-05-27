"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Award,
  BookOpen,
  Target,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  Download,
  CheckCircle,
  XCircle,
  MinusCircle,
  AlertTriangle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";

// Types for CPL Data
interface CPLData {
  id: number;
  code: string;
  name: string;
  score: number | null;
  status: "tercapai" | "belum_tercapai" | "belum_ditempuh";
  courses: { code: string; name: string; sks: number; grade: number }[];
}

// Types for Semester Grades (Matched with new Figma screenshot details)
interface CourseGrade {
  code: string;
  name: string;
  sks: number;
  semester: number;
  uk1: number; // Tugas
  uk2: number; // UTS
  uk3: number; // UAS
  uk4: number; // Partisipatif
  uk5: number; // Proyek
  nilaiAkhir: number;
  nilaiSkala100: number;
  gradeLetter: string;
  cplMapped: string[];
}

const cplListInitial: CPLData[] = [
  {
    id: 1,
    code: "CPL 1",
    name: "An ability to apply knowledge of mathematics, natural and/or material sciences, information technology, and engineering to acquire comprehensive understanding of engineering principles.",
    score: 82,
    status: "tercapai",
    courses: [
      { code: "UNI101", name: "Pendidikan Pancasila", sks: 2, grade: 85 },
      { code: "TIO3002", name: "Pengantar Teknik Industri", sks: 2, grade: 80 },
    ],
  },
  {
    id: 2,
    code: "CPL 2",
    name: "An ability to design integrated systems to meet desired needs within realistic constraints in such aspects as technical, standard, law, economic, environment, social, politics, health and safety, sustainability, as well as, to involve respective stakeholders, to recognize and/or utilize the potential local and national resources with global perspective.",
    score: 78,
    status: "belum_tercapai",
    courses: [
      { code: "TIO3102", name: "Kalkulus I", sks: 3, grade: 75.8 },
      { code: "BIO3303", name: "Fisika Teknik Industri", sks: 2, grade: 71.9 },
    ],
  },
  {
    id: 3,
    code: "CPL 3",
    name: "An ability to design and conduct laboratory and/or field experiments as well as to analyze and interpret data to support decision-making processes in industrial engineering.",
    score: 88,
    status: "tercapai",
    courses: [
      { code: "TIO3401", name: "Metodologi Penelitian", sks: 2, grade: 90.1 },
      { code: "TIO3201", name: "Statistika Industri I", sks: 3, grade: 86.5 },
    ],
  },
  {
    id: 4,
    code: "CPL 4",
    name: "An ability to identify, formulate, analyze, and solve complex engineering problems in an integrated system.",
    score: 85,
    status: "tercapai",
    courses: [
      { code: "TIO3301", name: "Perencanaan & Pengendalian Produksi", sks: 3, grade: 91.2 },
      { code: "TIO3302", name: "Desain Sistem Kerja & Ergonomi", sks: 4, grade: 83.8 },
    ],
  },
  {
    id: 5,
    code: "CPL 5",
    name: "An ability to apply methods, skills, and modern engineering tools necessary for industrial engineering practices.",
    score: 75,
    status: "belum_tercapai",
    courses: [
      { code: "TIO3303", name: "Penelitian Operasional I", sks: 3, grade: 74.5 },
      { code: "TIO3402", name: "Analisis Keputusan", sks: 2, grade: 87.0 },
    ],
  },
  {
    id: 6,
    code: "CPL 6",
    name: "An ability to communicate effectively with a range of audiences and situations.",
    score: null,
    status: "belum_ditempuh",
    courses: [],
  },
  {
    id: 7,
    code: "CPL 7",
    name: "An ability to plan, accomplish, and evaluate tasks under given constraints.",
    score: 86,
    status: "tercapai",
    courses: [
      { code: "TIO3303", name: "Simulasi Komputer", sks: 3, grade: 93.8 },
      { code: "TIO3304", name: "Sistem Informasi Industri", sks: 3, grade: 84.5 },
    ],
  },
  {
    id: 8,
    code: "CPL 8",
    name: "An ability to work in multidisciplinary and multicultural team.",
    score: null,
    status: "belum_ditempuh",
    courses: [],
  },
  {
    id: 9,
    code: "CPL 9",
    name: "An ability to be accountable and responsible to the society and adhere to professional ethics in solving industrial engineering problems.",
    score: 83,
    status: "tercapai",
    courses: [
      { code: "BIO3305", name: "Kimia Dasar", sks: 2, grade: 84.1 },
      { code: "BIO3306", name: "Praktikum Kimia Dasar", sks: 1, grade: 89.2 },
    ],
  },
  {
    id: 10,
    code: "CPL 10",
    name: "An ability to take initiative in life-long learning, including access to relevant knowledge on contemporary issues.",
    score: null,
    status: "belum_ditempuh",
    courses: [],
  },
];

// Graduate Profile (Profil Lulusan) Interface & Data
interface GraduateProfile {
  id: number;
  title: string;
  alias: string;
  description: string;
  cpls: string[];
}

const graduateProfiles: GraduateProfile[] = [
  {
    id: 1,
    title: "Profil 1: Kreatif dan Ilmiah",
    alias: "Kreatif dan Ilmiah",
    description: "Mampu memanfaatkan prinsip-prinsip kerekayasaan dan metode ilmiah dengan mengedepankan critical thinking untuk menyelesaikan masalah rekayasa kompleks.",
    cpls: ["CPL 1", "CPL 4"],
  },
  {
    id: 2,
    title: "Profil 2: Berpikir Sistem dan Realistis",
    alias: "Berpikir Sistem dan Realistis",
    description: "Mampu merancang dan memperbaiki sistem terintegrasi untuk memenuhi kebutuhan pelanggan (masyarakat) dengan mempertimbangkan kondisi dan batasan realistis.",
    cpls: ["CPL 2", "CPL 3", "CPL 4", "CPL 6", "CPL 7", "CPL 8"],
  },
  {
    id: 3,
    title: "Profil 3: Profesional",
    alias: "Profesional",
    description: "Mampu menyelesaikan tugas dan membuat keputusan yang tepat berdasarkan evaluasi yang objektif secara individual dan/atau kolaboratif.",
    cpls: ["CPL 8", "CPL 9"],
  },
  {
    id: 4,
    title: "Profil 4: Berorientasi Masa Depan",
    alias: "Berorientasi Masa Depan",
    description: "Mampu beradaptasi secara efektif pada situasi kerja yang dinamis melalui pengembangan diri terus menerus terutama pengetahuan dan keterampilan kerekayasaan dengan menjunjung profesionalitas dan etika.",
    cpls: ["CPL 5", "CPL 6", "CPL 7", "CPL 9"],
  },
];

// Exactly 19 courses as shown in the figma counter and matching student transcript
const courseGradesInitial: CourseGrade[] = [
  // Semester 1
  { code: "BIO3303", name: "Fisika Teknik Industri", sks: 2, semester: 1, uk1: 0, uk2: 50, uk3: 50, uk4: 0, uk5: 0, nilaiAkhir: 71.90, nilaiSkala100: 71.90, gradeLetter: "B", cplMapped: ["CPL 2"] },
  { code: "BIO3304", name: "Praktikum Fisika Industri", sks: 1, semester: 1, uk1: 0, uk2: 45, uk3: 45, uk4: 0, uk5: 0, nilaiAkhir: 67.60, nilaiSkala100: 67.60, gradeLetter: "B", cplMapped: ["CPL 2"] },
  { code: "BIO3305", name: "Kimia Dasar", sks: 2, semester: 1, uk1: 0, uk2: 55, uk3: 55, uk4: 0, uk5: 0, nilaiAkhir: 84.10, nilaiSkala100: 84.10, gradeLetter: "A-", cplMapped: ["CPL 9"] },
  { code: "BIO3306", name: "Praktikum Kimia Dasar", sks: 1, semester: 1, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 89.20, nilaiSkala100: 89.20, gradeLetter: "A", cplMapped: ["CPL 9"] },
  { code: "TIO3102", name: "Kalkulus I", sks: 3, semester: 1, uk1: 10, uk2: 70, uk3: 75, uk4: 10, uk5: 0, nilaiAkhir: 75.80, nilaiSkala100: 75.80, gradeLetter: "B+", cplMapped: ["CPL 2"] },
  // Semester 2
  { code: "TIO3001", name: "KALKULUS II", sks: 3, semester: 2, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80.20, nilaiSkala100: 80.20, gradeLetter: "B+", cplMapped: ["CPL 2"] },
  { code: "TIO3002", name: "Pengantar Teknik Industri", sks: 2, semester: 2, uk1: 0, uk2: 80, uk3: 80, uk4: 0, uk5: 0, nilaiAkhir: 80.00, nilaiSkala100: 80.00, gradeLetter: "A-", cplMapped: ["CPL 1"] },
  { code: "TIO3003", name: "Menggambar Teknik", sks: 2, semester: 2, uk1: 0, uk2: 78, uk3: 78, uk4: 0, uk5: 0, nilaiAkhir: 78.00, nilaiSkala100: 78.00, gradeLetter: "B+", cplMapped: ["CPL 7"] },
  { code: "TIO3004", name: "Fisika Dasar II", sks: 3, semester: 2, uk1: 0, uk2: 72, uk3: 72, uk4: 0, uk5: 0, nilaiAkhir: 72.00, nilaiSkala100: 72.00, gradeLetter: "B", cplMapped: ["CPL 2"] },
  { code: "TIO3005", name: "Material Teknik", sks: 2, semester: 2, uk1: 0, uk2: 85, uk3: 85, uk4: 0, uk5: 0, nilaiAkhir: 85.00, nilaiSkala100: 85.00, gradeLetter: "A", cplMapped: ["CPL 1"] },
  // Semester 3
  { code: "TIO3201", name: "Statistika Industri I", sks: 3, semester: 3, uk1: 15, uk2: 88, uk3: 88, uk4: 10, uk5: 10, nilaiAkhir: 86.50, nilaiSkala100: 86.50, gradeLetter: "A", cplMapped: ["CPL 3"] },
  { code: "TIO3202", name: "Mekanika Rekayasa", sks: 3, semester: 3, uk1: 10, uk2: 62, uk3: 62, uk4: 10, uk5: 0, nilaiAkhir: 64.00, nilaiSkala100: 64.00, gradeLetter: "C+", cplMapped: ["CPL 2"] },
  { code: "TIO3203", name: "Teori Probabilitas", sks: 2, semester: 3, uk1: 0, uk2: 75, uk3: 75, uk4: 0, uk5: 0, nilaiAkhir: 75.00, nilaiSkala100: 75.00, gradeLetter: "B+", cplMapped: ["CPL 2"] },
  { code: "TIO3204", name: "Psikologi Industri", sks: 2, semester: 3, uk1: 20, uk2: 82, uk3: 85, uk4: 15, uk5: 15, nilaiAkhir: 83.50, nilaiSkala100: 83.50, gradeLetter: "A-", cplMapped: ["CPL 9"] },
  // Semester 4
  { code: "TIO3301", name: "Perencanaan & Pengendalian Produksi", sks: 3, semester: 4, uk1: 20, uk2: 90, uk3: 92, uk4: 20, uk5: 20, nilaiAkhir: 91.20, nilaiSkala100: 91.20, gradeLetter: "A", cplMapped: ["CPL 4"] },
  { code: "TIO3302", name: "Desain Sistem Kerja & Ergonomi", sks: 4, semester: 4, uk1: 15, uk2: 80, uk3: 82, uk4: 15, uk5: 25, nilaiAkhir: 83.80, nilaiSkala100: 83.80, gradeLetter: "A-", cplMapped: ["CPL 4"] },
  { code: "TIO3303", name: "Penelitian Operasional I", sks: 3, semester: 4, uk1: 10, uk2: 72, uk3: 75, uk4: 10, uk5: 0, nilaiAkhir: 74.50, nilaiSkala100: 74.50, gradeLetter: "B", cplMapped: ["CPL 5"] },
  { code: "TIO3304", name: "Sistem Informasi Industri", sks: 3, semester: 4, uk1: 20, uk2: 85, uk3: 85, uk4: 15, uk5: 20, nilaiAkhir: 84.50, nilaiSkala100: 84.50, gradeLetter: "A-", cplMapped: ["CPL 7"] },
  // Semester 5
  { code: "TIO3401", name: "Metodologi Penelitian", sks: 2, semester: 5, uk1: 15, uk2: 90, uk3: 92, uk4: 15, uk5: 15, nilaiAkhir: 90.10, nilaiSkala100: 90.10, gradeLetter: "A", cplMapped: ["CPL 3"] },
  { code: "TIO3402", name: "Analisis Keputusan", sks: 2, semester: 5, uk1: 20, uk2: 88, uk3: 85, uk4: 20, uk5: 20, nilaiAkhir: 87.00, nilaiSkala100: 87.00, gradeLetter: "A", cplMapped: ["CPL 5"] },
];

const detailCPL = [
  {
    cpl: "CPL-1",
    deskripsi: "Mampu menerapkan pengetahuan matematika, sains, dan teknik industri",
    nilai: 82,
    status: "Tercapai",
    ik: [
      {
        kode: "IK-1.1",
        deskripsi: "Memahami konsep dasar matematika teknik",
        bobot: 50,
        nilai: 82,
        cpmk: [
          {
            kode: "CPMK-1.1",
            deskripsi: "Mahasiswa mampu menjelaskan konsep probabilitas",
            bobot: 40,
            nilai: 85,
            matakuliah: "Statistika Industri I (TIO3201)",
            semester: 3,
            nilaiMK: "A"
          },
          {
            kode: "CPMK-1.2",
            deskripsi: "Mahasiswa mampu menghitung distribusi probabilitas",
            bobot: 60,
            nilai: 80,
            matakuliah: "Statistika Industri I (TIO3201)",
            semester: 3,
            nilaiMK: "A"
          }
        ]
      },
      {
        kode: "IK-1.2",
        deskripsi: "Menerapkan metode statistika dalam analisis data",
        bobot: 50,
        nilai: 82,
        cpmk: [
          {
            kode: "CPMK-2.1",
            deskripsi: "Mahasiswa mampu melakukan uji hipotesis",
            bobot: 100,
            nilai: 82,
            matakuliah: "Statistika Industri I (TIO3201)",
            semester: 3,
            nilaiMK: "A"
          }
        ]
      }
    ]
  },
  {
    cpl: "CPL-2",
    deskripsi: "Mampu merancang sistem terintegrasi dengan mempertimbangkan aspek teknis dan ekonomis",
    nilai: 78,
    status: "Belum Tercapai",
    ik: [
      {
        kode: "IK-2.1",
        deskripsi: "Merancang sistem produksi yang efisien",
        bobot: 100,
        nilai: 78,
        cpmk: [
          {
            kode: "CPMK-3.1",
            deskripsi: "Mahasiswa mampu merancang tata letak pabrik",
            bobot: 50,
            nilai: 75,
            matakuliah: "Kalkulus I (TIO3102)",
            semester: 1,
            nilaiMK: "B+"
          },
          {
            kode: "CPMK-3.2",
            deskripsi: "Mahasiswa mampu menganalisis aliran material",
            bobot: 50,
            nilai: 80,
            matakuliah: "KALKULUS II (TIO3001)",
            semester: 2,
            nilaiMK: "B+"
          }
        ]
      }
    ]
  },
  {
    cpl: "CPL-7",
    deskripsi: "Mampu merancang dan memperbaiki sistem kerja terintegrasi guna meningkatkan produktivitas",
    nilai: 86,
    status: "Tercapai",
    ik: [
      {
        kode: "IK-7.1",
        deskripsi: "Merancang dan mengevaluasi sistem kerja terintegrasi",
        bobot: 105,
        nilai: 86,
        cpmk: [
          {
            kode: "CPMK-7.1",
            deskripsi: "Mahasiswa mampu mempresentasikan hasil kerja",
            bobot: 100,
            nilai: 86,
            matakuliah: "Sistem Informasi Industri (TIO3304)",
            semester: 4,
            nilaiMK: "A-"
          }
        ]
      }
    ]
  }
];

export default function Home() {
  // Navigation tabs: 'dashboard' | 'detail-cpl' | 'riwayat-nilai' | 'profil-lulusan'
  const [activeTab, setActiveTab] = useState<"dashboard" | "detail-cpl" | "riwayat-nilai" | "profil-lulusan">("riwayat-nilai"); // Default to riwayat-nilai for review
  const [activeSemesterDropdown, setActiveSemesterDropdown] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState("Ganjil 2024/2025");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [cplSubTab, setCplSubTab] = useState<"grafik" | "lk" | "lembar-kerja" | "report">("grafik");
  const [expandedCPL, setExpandedCPL] = useState<number | null>(null);

  // Helper to calculate score for a Graduate Profile based on its mapped CPLs
  const calculateProfileScore = (profileCpls: string[]) => {
    const relevantCpls = cplListInitial.filter(c => profileCpls.includes(c.code));
    const scoredCpls = relevantCpls.filter(c => c.score !== null);
    if (scoredCpls.length === 0) return null;
    const sum = scoredCpls.reduce((acc, c) => acc + (c.score ?? 0), 0);
    return Math.round(sum / scoredCpls.length);
  };



  // States for dynamic interactions
  const [hoveredCpl, setHoveredCpl] = useState<CPLData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [highlightedStat, setHighlightedStat] = useState<string | null>(null);

  // Riwayat Nilai Search & Filter & Sort States
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [transcriptSemesterFilter, setTranscriptSemesterFilter] = useState("all");
  const [transcriptSortBy, setTranscriptSortBy] = useState("semester-asc");

  // Detail CPL Active Expanded Card
  const [expandedCplCard, setExpandedCplCard] = useState<number | null>(null);

  const cplData = cplListInitial.map(cpl => {
    let category = "Pengetahuan";
    if (cpl.code === "CPL 2" || cpl.code === "CPL 5" || cpl.code === "CPL 10") category = "Keterampilan Khusus";
    else if (cpl.code === "CPL 3" || cpl.code === "CPL 7") category = "Keterampilan Umum";
    else if (cpl.code === "CPL 6" || cpl.code === "CPL 9") category = "Sikap";

    const score = cpl.score ?? 0;
    const statusLabel = cpl.score === null 
      ? "Belum Ditempuh" 
      : score >= 80 ? "Tercapai" : "Belum Tercapai";

    return {
      name: cpl.code.replace("CPL ", "CPL-"),
      nilai: score,
      target: 80,
      status: statusLabel,
      kategori: category,
    };
  });

  const radarData = cplData.map(c => ({
    subject: c.name,
    nilai: c.nilai,
    target: c.target,
  }));

  // Simulation loading / Download actions
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Trigger custom toast message
  const triggerToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle Download Simulation
  const handleDownloadReport = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    triggerToast("Memulai kompilasi laporan CPL...", "info");

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDownloading(false);
            triggerToast("Laporan CPL berhasil diunduh!", "success");

            const reportData = `SICPL - PORTAL MAHASISWA\n=========================\nLaporan Capaian Pembelajaran Lulusan (CPL)\n\nMahasiswa: Ahmad Fadli\nNIM: I0320045\nProdi: Teknik Industri UNS\nIPK Kumulatif: 3.75\n\nRingkasan CPL:\n- CPL Tercapai: 6/10\n- Belum Tercapai: 2/10\n- Belum Ditempuh: 2/10\n- Rata-rata Nilai CPL: 85.00\n\nRincian Nilai CPL:\n` +
              cplListInitial.map(c => `- ${c.code}: ${c.score !== null ? c.score : "Belum Ditempuh"} (${c.status.toUpperCase().replace('_', ' ')})`).join("\n");

            const blob = new Blob([reportData], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Laporan_CPL_I0320045_Ahmad_Fadli.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  // Handle Export to Excel Simulation
  const handleExportExcel = () => {
    if (isExporting) return;
    setIsExporting(true);
    triggerToast("Mengekspor data mata kuliah...", "info");

    setTimeout(() => {
      setIsExporting(false);
      triggerToast("Data nilai berhasil diekspor ke format Excel!", "success");

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "No,Semester,Kode MK,Nama Mata Kuliah,SKS,UK1,UK2,UK3,UK4,UK5,Nilai Akhir,Nilai Skala 100,Huruf\n";

      courseGradesInitial.forEach((g, idx) => {
        const row = [
          idx + 1,
          g.semester,
          g.code,
          g.name,
          g.sks,
          g.uk1,
          g.uk2,
          g.uk3,
          g.uk4,
          g.uk5,
          g.nilaiAkhir.toFixed(2),
          g.nilaiSkala100.toFixed(2),
          g.gradeLetter
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Riwayat_Nilai_I0320045_Ahmad_Fadli.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1500);
  };

  // Filtering and Sorting logic for the new high-fidelity table
  const getFilteredAndSortedGrades = () => {
    let result = [...courseGradesInitial];

    // 1. Filter by Search input (Course code or Course name)
    if (transcriptSearch.trim() !== "") {
      const q = transcriptSearch.toLowerCase();
      result = result.filter(g =>
        g.code.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q)
      );
    }

    // 2. Filter by Semester Dropdown
    if (transcriptSemesterFilter !== "all") {
      result = result.filter(g => g.semester.toString() === transcriptSemesterFilter);
    }

    // 3. Sort by chosen parameter
    result.sort((a, b) => {
      switch (transcriptSortBy) {
        case "semester-asc":
          return a.semester - b.semester || a.code.localeCompare(b.code);
        case "semester-desc":
          return b.semester - a.semester || a.code.localeCompare(b.code);
        case "nilai-desc":
          return b.nilaiAkhir - a.nilaiAkhir;
        case "nilai-asc":
          return a.nilaiAkhir - b.nilaiAkhir;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  };

  const processedGrades = getFilteredAndSortedGrades();

  // Color mappings for grade badges (rounded squares)
  const getGradeBadgeStyle = (letter: string) => {
    switch (letter) {
      case "A":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "A-":
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "B+":
        return "bg-indigo-50 text-indigo-700 border border-indigo-100";
      case "B":
        return "bg-blue-50 text-blue-700 border border-blue-100";
      case "B-":
        return "bg-amber-50 text-amber-700 border border-amber-100";
      case "C+":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "C":
        return "bg-orange-50 text-orange-700 border border-orange-100";
      default:
        return "bg-rose-50 text-rose-700 border border-rose-100";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Dynamic Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-xl shadow-xl bg-white border border-slate-100 text-slate-800 animate-bounce transition-all duration-300">
          <div
            className={`w-3 h-10 rounded-full mr-3.5 ${toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-rose-500" : "bg-sky-500"
              }`}
          />
          <div>
            <p className="text-xs font-extrabold tracking-wide uppercase text-slate-400">Notifikasi</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

      {/* --- TOP HEADER BAR --- */}
      <header className="bg-indigo-950 text-white h-16 shrink-0 flex items-center justify-between px-4 md:px-6 shadow-md border-b border-indigo-900/30 z-30">
        <div className="flex items-center gap-3">
          {/* Hamburger button for responsive mobile drawer view */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition focus:outline-none cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
              SICPL - Portal Mahasiswa
            </span>
            <span className="hidden sm:inline text-xs text-indigo-300 font-bold border-l border-indigo-800 pl-2">
              Prodi Teknik Industri UNS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:gap-5">
          {/* Semester dropdown pill selection */}
          <div className="relative">
            <button
              onClick={() => setActiveSemesterDropdown(!activeSemesterDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-900/50 hover:bg-indigo-900 border border-indigo-800/40 text-xs font-bold transition active:scale-98 cursor-pointer text-indigo-100"
            >
              <span>{selectedSemester}</span>
              <svg className={`w-3.5 h-3.5 opacity-80 transition-transform ${activeSemesterDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {activeSemesterDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSemesterDropdown(false)} />
                <div className="absolute right-0 mt-2.5 w-44 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs font-semibold animate-fadeIn">
                  {["Ganjil 2024/2025", "Genap 2023/2024", "Ganjil 2023/2024"].map((sem) => (
                    <button
                      key={sem}
                      onClick={() => {
                        setSelectedSemester(sem);
                        setActiveSemesterDropdown(false);
                        triggerToast(`Semester aktif diubah ke: ${sem}`, "info");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 hover:text-indigo-950 cursor-pointer"
                    >
                      {sem}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bell Notification button */}
          <button
            onClick={() => triggerToast("Tidak ada pemberitahuan baru", "info")}
            className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-indigo-950 animate-ping" />
          </button>

          {/* User profile dropdown summary */}
          <div className="flex items-center gap-2 border-l border-indigo-800 pl-4 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-indigo-950 flex items-center justify-center font-extrabold text-sm shadow">
              AF
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold tracking-wide">Ahmad Fadli</span>
              <span className="text-[10px] text-indigo-300 font-medium">I0320045</span>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={() => triggerToast("Simulasi Log Out berhasil!", "info")}
            className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-200 hover:text-white transition cursor-pointer"
            title="Log Out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* --- PAGE BODY (SIDEBAR + CONTENT CONTAINER) --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* --- MOBILE SIDEBAR DRAWER BACKDROP --- */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* --- SIDEBAR LEFT --- */}
        <aside
          className={`bg-white border-r border-slate-200 shrink-0 w-64 md:w-72 flex flex-col justify-between transition-all duration-300 z-40 absolute md:relative inset-y-0 left-0 md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 pt-16 md:pt-0" : "-translate-x-full"
            }`}
        >
          <div className="p-4 space-y-2">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-2">Navigasi Utama</p>
            <nav className="space-y-1">
              {[
                {
                  id: "dashboard",
                  label: "Dashboard",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  ),
                },
                {
                  id: "detail-cpl",
                  label: "Detail CPL",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                },
                {
                  id: "profil-lulusan",
                  label: "Profil Lulusan",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  ),
                },
                {
                  id: "riwayat-nilai",
                  label: "Riwayat Nilai",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  ),
                },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as "dashboard" | "detail-cpl" | "riwayat-nilai" | "profil-lulusan");
                      setIsMobileMenuOpen(false);
                      triggerToast(`Berpindah ke halaman ${item.label}`, "success");
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all border-l-4 cursor-pointer ${isActive
                      ? "bg-indigo-50 border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistem Capaian Kelulusan</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Departemen Teknik Industri © 2026</p>
          </div>
        </aside>

        {/* --- MAIN SCROLLABLE CONTAINER --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Breadcrumb Info */}
          <nav className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="hover:text-slate-600 transition cursor-pointer">Mahasiswa</span>
            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="hover:text-slate-600 transition cursor-pointer">Portal</span>
            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-indigo-600 font-extrabold text-xs">{activeTab}</span>
          </nav>

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* --- 1. PROFILE BANNER CARD (PURPLE GRADIENT) --- */}
              <div className="bg-gradient-to-r from-violet-700 via-indigo-700 to-fuchsia-700 text-white rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 transform hover:scale-[1.005] transition-all duration-300 border border-violet-800/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full filter blur-2xl -translate-y-12 translate-x-12" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-fuchsia-600/30 rounded-full filter blur-2xl" />

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight">Ahmad Fadli</h2>
                    <p className="text-xs md:text-sm font-semibold text-indigo-100 tracking-wide mt-1">NIM: I0320045</p>
                    <p className="text-xs text-indigo-200 mt-0.5">Angkatan 2020 - Semester 5</p>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-white/10 md:border-t-0 pt-4 md:pt-0 relative z-10 gap-3 md:gap-1">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-indigo-200 uppercase leading-none">IPK</p>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tighter mt-1">3.75</p>
                  </div>

                  <button
                    onClick={handleDownloadReport}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-slate-50 disabled:bg-slate-100/80 rounded-xl shadow-lg font-bold text-xs tracking-wide transition active:scale-95 cursor-pointer border border-slate-200"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-indigo-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Loading {downloadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* --- 2. 4 STAT CARDS GRID --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setHighlightedStat(highlightedStat === "tercapai" ? null : "tercapai")}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${highlightedStat === "tercapai" ? "ring-2 ring-emerald-500 scale-[1.02]" : "border-slate-200 hover:scale-[1.01]"
                    }`}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPL Tercapai</p>
                    <p className="text-2xl font-black text-slate-800">6<span className="text-sm font-bold text-slate-400">/10</span></p>
                    <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">60% tercapai</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div
                  onClick={() => setHighlightedStat(highlightedStat === "belum_tercapai" ? null : "belum_tercapai")}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${highlightedStat === "belum_tercapai" ? "ring-2 ring-rose-500 scale-[1.02]" : "border-slate-200 hover:scale-[1.01]"
                    }`}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum Tercapai</p>
                    <p className="text-2xl font-black text-slate-800">2</p>
                    <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block">Perlu perbaikan</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shadow-rose-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div
                  onClick={() => setHighlightedStat(highlightedStat === "belum_ditempuh" ? null : "belum_ditempuh")}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${highlightedStat === "belum_ditempuh" ? "ring-2 ring-slate-400 scale-[1.02]" : "border-slate-200 hover:scale-[1.01]"
                    }`}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum Ditempuh</p>
                    <p className="text-2xl font-black text-slate-800">2</p>
                    <p className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">MK belum diambil</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div
                  onClick={() => {
                    triggerToast("Rata-rata dihitung dari seluruh CPL yang bernilai", "success");
                  }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-rata CPL</p>
                    <p className="text-2xl font-black text-slate-800">85</p>
                    <p className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block">Target minimum: 80</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm shadow-amber-100 animate-pulse">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* --- 3. CP CAPAIAN CHART CARD --- */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-6 relative">
                <div>
                  <h3 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Grafik Capaian CPL 1-10</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Nilai di atas garis merah (80) menunjukkan CPL tercapai. Abu-abu / kosong = belum ditempuh.
                  </p>
                </div>

                <div className="relative pt-6 min-h-[280px] w-full select-none">
                  <div className="absolute inset-0 flex flex-col justify-between text-[10px] font-bold text-slate-400 py-8 pointer-events-none">
                    <div className="w-full flex items-center gap-2">
                      <span className="w-6 text-right shrink-0">100</span>
                      <div className="flex-1 border-b border-dashed border-slate-200" />
                    </div>
                    <div className="w-full flex items-center gap-2 relative z-10">
                      <span className="w-6 text-right text-rose-500 font-extrabold shrink-0">80</span>
                      <div className="flex-1 border-b-2 border-dashed border-rose-500" />
                      <span className="absolute right-0 -top-4 text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-extrabold border border-rose-200 tracking-wide">TARGET MINIMUM</span>
                    </div>
                    <div className="w-full flex items-center gap-2">
                      <span className="w-6 text-right shrink-0">75</span>
                      <div className="flex-1 border-b border-dashed border-slate-200" />
                    </div>
                    <div className="w-full flex items-center gap-2">
                      <span className="w-6 text-right shrink-0">50</span>
                      <div className="flex-1 border-b border-dashed border-slate-200" />
                    </div>
                    <div className="w-full flex items-center gap-2">
                      <span className="w-6 text-right shrink-0">0</span>
                      <div className="flex-1 border-b border-slate-200/80" />
                    </div>
                  </div>

                  <div className="h-[200px] flex items-end pl-8 pr-2 pb-8 relative z-20 gap-3 md:gap-4 lg:gap-6">
                    {cplListInitial.map((cpl) => {
                      const hasScore = cpl.score !== null;
                      const scoreVal = cpl.score ?? 0;
                      const heightPercent = `${scoreVal}%`;
                      const isHighlighted = highlightedStat === null || cpl.status === highlightedStat;

                      return (
                        <div
                          key={cpl.id}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          {hasScore ? (
                            <div
                              style={{ height: heightPercent }}
                              onMouseEnter={(e) => {
                                setHoveredCpl(cpl);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({
                                  x: e.currentTarget.offsetLeft + rect.width / 2,
                                  y: 200 - (scoreVal * 1.5),
                                });
                              }}
                              onMouseLeave={() => setHoveredCpl(null)}
                              className={`w-full rounded-t-lg transition-all duration-500 ease-out cursor-pointer relative shadow-sm ${isHighlighted
                                ? "bg-indigo-500/90 group-hover:bg-indigo-600 shadow-indigo-100 group-hover:scale-x-105 group-hover:shadow-md"
                                : "bg-indigo-200/40 opacity-30"
                                }`}
                            >
                              <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-lg bg-indigo-300/40" />
                              <span className="absolute -top-6 inset-x-0 text-[10px] font-black text-center text-indigo-700 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {scoreVal}
                              </span>
                            </div>
                          ) : (
                            <div
                              className={`w-full h-[15%] border-2 border-dashed rounded-t-lg bg-slate-50 transition-all duration-300 flex items-center justify-center ${isHighlighted ? "border-slate-300" : "border-slate-200/50 opacity-30"
                                }`}
                              title="Belum Ditempuh"
                            >
                              <span className="text-[9px] font-black text-slate-400 tracking-wider">-</span>
                            </div>
                          )}

                          <span className={`absolute -bottom-6 text-[10px] font-extrabold tracking-tight transition-colors duration-200 ${hasScore ? "text-slate-600 group-hover:text-indigo-700" : "text-slate-400"
                            }`}>
                            {cpl.code}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {hoveredCpl && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y - 12}px`,
                        transform: "translate(-50%, -100%)",
                      }}
                      className="z-30 w-64 bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/50 text-[11px] font-semibold animate-fadeIn pointer-events-none backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                        <span className="font-extrabold text-amber-400 uppercase tracking-widest">{hoveredCpl.code}</span>
                        <span className="text-[10px] font-black bg-indigo-500 px-2 py-0.5 rounded-full uppercase">
                          Nilai: {hoveredCpl.score}
                        </span>
                      </div>
                      <p className="text-white/90 text-left line-clamp-2 leading-relaxed text-[10px] mb-2 font-medium">
                        {hoveredCpl.name}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[9px] text-slate-300 border-t border-white/5 pt-1.5 font-bold uppercase tracking-wider">
                        <span>Status:</span>
                        <span className={hoveredCpl.status === "tercapai" ? "text-emerald-400" : "text-rose-400"}>
                          {hoveredCpl.status === "tercapai" ? "TERCAPAI (≥ 80)" : "PERLU PERBAIKAN (< 80)"}
                        </span>
                      </div>
                      {hoveredCpl.courses.length > 0 && (
                        <div className="mt-2 text-left text-[9px]">
                          <p className="text-amber-300 font-extrabold uppercase tracking-wide mb-1">Mata Kuliah Penyumbang:</p>
                          <div className="space-y-0.5">
                            {hoveredCpl.courses.map((c) => (
                              <div key={c.code} className="flex justify-between text-slate-300 text-[10px]">
                                <span className="truncate max-w-[170px]">{c.name}</span>
                                <span className="font-extrabold text-white text-right">{c.grade}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

                {/* --- 4. GRADUATE PROFILE ACHIEVEMENT CHART CARD --- */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-6 relative">
                  <div>
                    <h3 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Grafik Capaian Profil Lulusan
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-snug">
                      Rata-rata nilai CPL yang mendukung masing-masing profil kelulusan. Garis putus-putus merah menunjukkan target kelulusan minimum (80).
                    </p>
                  </div>

                  <div className="space-y-6 relative pt-4">
                    {/* Vertical line indicator at 80% */}
                    <div className="absolute top-0 bottom-0 left-[80%] border-l-2 border-dashed border-rose-500 z-10 pointer-events-none hidden sm:block">
                      <span className="absolute -top-4 right-1 text-[8px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-extrabold border border-rose-200 tracking-wider">
                        TARGET: 80
                      </span>
                    </div>

                    <div className="space-y-5 relative z-20">
                      {graduateProfiles.map((profile) => {
                        const score = calculateProfileScore(profile.cpls);
                        const isAchieved = score !== null && score >= 80;

                        return (
                          <div key={profile.id} className="space-y-2 group bg-slate-50/50 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <h4 className="text-xs md:text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                  {profile.title}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold line-clamp-1">
                                  {profile.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {score !== null ? (
                                  <>
                                    <span className="text-[10px] font-extrabold text-slate-500">Rerata:</span>
                                    <span className={`text-xs md:text-sm font-black ${isAchieved ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {score}/100
                                    </span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${isAchieved
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : "bg-rose-50 text-rose-700 border border-rose-100"
                                      }`}>
                                      {isAchieved ? "TERCAPAI" : "BELUM TERCAPAI"}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                    BELUM DITEMPUH
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bar representation */}
                            <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              {score !== null ? (
                                <div
                                  style={{ width: `${score}%` }}
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isAchieved
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    : "bg-gradient-to-r from-amber-500 to-rose-500"
                                    }`}
                                />
                              ) : (
                                <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-full bg-slate-50/50" />
                              )}
                            </div>

                            {/* Mapped CPL Contributing tag list */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">CPL Terkait:</span>
                              {profile.cpls.map((cplCode) => {
                                const cplData = cplListInitial.find(c => c.code === cplCode);
                                const cplScore = cplData?.score;
                                const cplStatus = cplData?.status;
                                return (
                                  <span
                                    key={cplCode}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border transition-colors ${cplStatus === "tercapai"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                      : cplStatus === "belum_tercapai"
                                        ? "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
                                        : "bg-slate-50 text-slate-400 border-slate-200/60 hover:bg-slate-100"
                                      }`}
                                    title={cplData?.name}
                                  >
                                    <span>{cplCode}</span>
                                    {cplScore !== null && cplScore !== undefined && (
                                      <span className="opacity-70 font-black">({cplScore})</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* TAB: PROFIL LULUSAN */}
          {activeTab === "profil-lulusan" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">Profil Lulusan & Integrasi CPL</h2>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Evaluasi keterkaitan terintegrasi antara 10 Capaian Pembelajaran Lulusan (CPL) Kurikulum 2024 dengan 4 Profil Kelulusan PSTI UNS.
                </p>
              </div>

              {/* Grid 2x2: Graduate Profile Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {graduateProfiles.map((profile) => {
                  const score = calculateProfileScore(profile.cpls);
                  const isAchieved = score !== null && score >= 80;

                  // Define career prospects / details for extra premium touch
                  const careerInfo = [
                    "Kandidat Peneliti, R&D Engineer, Akademisi, Konsultan Ilmiah Kerekayasaan.",
                    "Sistem Perancang Terintegrasi, Quality Controller, Supply Chain/Logistics Analyst, Operations Manager.",
                    "Professional Engineer, Project Manager, Auditor Sistem Industri, Konsultan Manajemen.",
                    "Inovator Industri, Lead Coordinator, Technopreneur, Continuous Improvement Specialist."
                  ][profile.id - 1];

                  return (
                    <div
                      key={profile.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                    >
                      {/* Decorative colored top border */}
                      <div className={`absolute top-0 inset-x-0 h-1.5 ${score === null
                        ? "bg-slate-300"
                        : isAchieved
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : "bg-gradient-to-r from-amber-500 to-rose-500"
                        }`} />

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Profil Lulusan {profile.id}
                            </span>
                            <h3 className="text-sm md:text-base font-black text-slate-800 mt-1.5 leading-snug">
                              {profile.alias}
                            </h3>
                          </div>

                          {/* Large score display */}
                          <div className="text-right shrink-0">
                            {score !== null ? (
                              <div className="flex flex-col items-end">
                                <div className={`text-xl md:text-2xl font-black ${isAchieved ? "text-emerald-600" : "text-amber-600"}`}>
                                  {score}%
                                </div>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full tracking-wider mt-0.5 uppercase border ${isAchieved
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-100"
                                  }`}>
                                  {isAchieved ? "TERCAPAI" : "PERLU PERBAIKAN"}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <div className="text-xs font-bold text-slate-400 uppercase">BELUM</div>
                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                  DITEMPUH
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {profile.description}
                        </p>

                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Rekomendasi Karir:</p>
                          <p className="text-[10px] text-slate-500 italic leading-snug">
                            {careerInfo}
                          </p>
                        </div>
                      </div>

                      {/* Contributing CPL Breakdown list */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">CPL Terintegrasi ({profile.cpls.length})</span>
                          {score !== null && (
                            <span className="text-[9px] text-slate-500 font-semibold">
                              Target Capaian: &ge; 80
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {profile.cpls.map((cplCode) => {
                            const cpl = cplListInitial.find((c) => c.code === cplCode);
                            const cplScore = cpl?.score;
                            const cplStatus = cpl?.status;

                            return (
                              <div
                                key={cplCode}
                                className={`p-2 rounded-xl border flex items-center justify-between text-[11px] font-bold ${cplStatus === "tercapai"
                                  ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                                  : cplStatus === "belum_tercapai"
                                    ? "bg-rose-50/50 border-rose-100 text-rose-800"
                                    : "bg-slate-50 border-slate-100 text-slate-400"
                                  }`}
                              >
                                <span className="truncate max-w-[80px]" title={cpl?.name}>
                                  {cplCode}
                                </span>
                                <span className="text-[10px] font-black">
                                  {cplScore !== null ? `${cplScore}` : "-"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Matriks Keterkaitan (Matrix Mapping Table) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Matriks Keterkaitan Profil – Capaian Pembelajaran Lulusan (CPL)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Tabel matriks resmi pemetaan 10 Capaian Pembelajaran Lulusan (CPL) Kurikulum 2024 terhadap 4 Profil Kelulusan PSTI UNS beserta status dan nilai aktual Anda.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider">
                        <th className="p-4 font-black">Capaian Pembelajaran Lulusan (CPL)</th>
                        <th className="p-4 text-center border-l border-slate-200 w-28">Profil 1<br /><span className="text-[8px] font-medium text-slate-400 capitalize">Kreatif/Ilmiah</span></th>
                        <th className="p-4 text-center border-l border-slate-200 w-28">Profil 2<br /><span className="text-[8px] font-medium text-slate-400 capitalize">Sistem/Realistis</span></th>
                        <th className="p-4 text-center border-l border-slate-200 w-28">Profil 3<br /><span className="text-[8px] font-medium text-slate-400 capitalize">Profesional</span></th>
                        <th className="p-4 text-center border-l border-slate-200 w-28">Profil 4<br /><span className="text-[8px] font-medium text-slate-400 capitalize">Masa Depan</span></th>
                        <th className="p-4 text-center border-l border-slate-200 w-24">Nilai</th>
                        <th className="p-4 text-center border-l border-slate-200 w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {cplListInitial.map((cpl) => (
                        <tr key={cpl.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-indigo-600">{cpl.code}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-lg">
                              {cpl.name}
                            </p>
                          </td>
                          {[1, 2, 3, 4].map((profId) => {
                            const isMapped = graduateProfiles.find(p => p.id === profId)?.cpls.includes(cpl.code);
                            return (
                              <td key={profId} className="p-4 text-center border-l border-slate-200">
                                {isMapped ? (
                                  <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-light">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-4 text-center border-l border-slate-200 font-extrabold text-slate-700">
                            {cpl.score !== null ? cpl.score : (
                              <span className="text-slate-300 font-normal">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center border-l border-slate-200">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border tracking-wider ${cpl.status === "tercapai"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : cpl.status === "belum_tercapai"
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}>
                              {cpl.status === "tercapai" ? "TERCAPAI" : cpl.status === "belum_tercapai" ? "PERBAIKAN" : "BELUM"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAIL CPL */}
          {activeTab === "detail-cpl" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">Detail Capaian Pembelajaran Lulusan (CPL)</h2>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Berikut merupakan daftar rincian 10 parameter CPL Mahasiswa beserta sebaran mata kuliah pendukungnya. Klik pada kartu untuk melihat mata kuliah secara detail.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {cplListInitial.map((cpl) => {
                  const isExpanded = expandedCplCard === cpl.id;
                  return (
                    <div
                      key={cpl.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 shadow-sm"
                    >
                      <button
                        onClick={() => {
                          setExpandedCplCard(isExpanded ? null : cpl.id);
                          triggerToast(isExpanded ? "Detail CPL ditutup" : `Melihat detail ${cpl.code}`, "info");
                        }}
                        className="w-full p-5 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                      >
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest">
                              {cpl.code}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cpl.status === "tercapai"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : cpl.status === "belum_tercapai"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-slate-100 text-slate-500"
                              }`}>
                              {cpl.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm tracking-tight leading-snug sm:line-clamp-1 flex-1">
                            {cpl.name}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Capaian</p>
                            <p className="text-base font-black text-slate-800 mt-0.5">
                              {cpl.score !== null ? `${cpl.score}/100` : "-"}
                            </p>
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-90 text-indigo-600" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 animate-fadeIn">
                          <div className="space-y-1">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Deskripsi Kompetensi</h4>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold">{cpl.name}</p>
                          </div>

                          {cpl.courses.length > 0 ? (
                            <div className="space-y-2">
                              <h4 className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest">Kontribusi Nilai Mata Kuliah</h4>
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                      <th className="px-4 py-2.5">Kode MK</th>
                                      <th className="px-4 py-2.5">Nama Mata Kuliah</th>
                                      <th className="px-4 py-2.5 text-center">SKS</th>
                                      <th className="px-4 py-2.5 text-right">Nilai Akhir</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {cpl.courses.map((c) => (
                                      <tr key={c.code} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-500">{c.code}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{c.name}</td>
                                        <td className="px-4 py-3 font-bold text-slate-600 text-center">{c.sks}</td>
                                        <td className={`px-4 py-3 font-black text-right ${c.grade >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                                          {c.grade.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center">
                              <svg className="w-8 h-8 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className="text-xs text-slate-500 font-bold mt-2">Mata kuliah pendukung CPL ini belum ditempuh.</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Nilai akan diperbarui secara otomatis setelah mahasiswa mengambil mata kuliah terkait.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT NILAI & MATA KULIAH (UPGRADED HIGH-FIDELITY MATCHINGFIGMA SCREENSHOT) */}
          {activeTab === "riwayat-nilai" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">Riwayat Nilai & Mata Kuliah</h2>
              </div>

              {/* --- 1. METADATA HEADER PANEL --- */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-500">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="w-32 text-slate-400 uppercase tracking-wide">Fakultas</span>
                      <span className="text-slate-800">: Teknik</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-32 text-slate-400 uppercase tracking-wide">Program Studi</span>
                      <span className="text-slate-800">: Teknik Industri</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-32 text-slate-400 uppercase tracking-wide">Kurikulum</span>
                      <span className="text-slate-800">: 2020</span>
                    </div>
                  </div>

                  <div className="space-y-3 md:border-l md:border-slate-100 md:pl-6">
                    <div className="flex items-center">
                      <span className="w-32 text-slate-400 uppercase tracking-wide">Nama</span>
                      <span className="text-slate-800 font-extrabold">: Ahmad Fadli</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-32 text-slate-400 uppercase tracking-wide">NIM</span>
                      <span className="text-slate-800 font-extrabold">: I0320045</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-32 text-slate-400 uppercase tracking-wide">Semester</span>
                      <span className="text-slate-800">: 5 (Ganjil 2024/2025)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- 2. CONTROLS BAR (SEARCH, FILTERS, EXPORT) --- */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Cari nama atau kode mata kuliah..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  {/* Filters and sorting selection row */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Funnel Icon indicator */}
                    <div className="p-2.5 rounded-xl border border-slate-200/80 text-slate-400 bg-slate-50/30">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>

                    {/* Semester filtering dropdown */}
                    <select
                      value={transcriptSemesterFilter}
                      onChange={(e) => {
                        setTranscriptSemesterFilter(e.target.value);
                        triggerToast(`Filter Semester: ${e.target.value === "all" ? "Semua Semester" : `Semester ${e.target.value}`}`, "success");
                      }}
                      className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                    >
                      <option value="all">Semua Semester</option>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                    </select>

                    {/* Sorting dropdown selector */}
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 rounded-xl border border-slate-200/80 text-slate-400 bg-slate-50/30">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </div>
                      <select
                        value={transcriptSortBy}
                        onChange={(e) => setTranscriptSortBy(e.target.value)}
                        className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                      >
                        <option value="semester-asc">Semester (1–5)</option>
                        <option value="semester-desc">Semester (5–1)</option>
                        <option value="nilai-desc">Nilai Akhir (Tinggi)</option>
                        <option value="nilai-asc">Nilai Akhir (Rendah)</option>
                        <option value="name-asc">Nama Mata Kuliah (A-Z)</option>
                        <option value="name-desc">Nama Mata Kuliah (Z-A)</option>
                      </select>
                    </div>

                    {/* Green Export button */}
                    <button
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/85 text-white rounded-xl shadow font-extrabold text-xs tracking-wide transition active:scale-95 cursor-pointer border border-emerald-700/10"
                    >
                      {isExporting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Export</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-[10px] md:text-xs font-bold text-slate-400 px-1 pt-1">
                  Menampilkan {processedGrades.length} dari {courseGradesInitial.length} mata kuliah
                </div>
              </div>

              {/* --- 3. HIGH-FIDELITY GRADINGS TABLE (MULTICOLOR CODES & MULTI-GRID HEADERS) --- */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table Horizontal Scrollable container */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs text-center min-w-[900px]">
                    <thead>
                      {/* Subtitle Banner Title above columns */}
                      <tr className="bg-white text-slate-800 font-extrabold text-xs text-left border-b border-slate-100">
                        <td colSpan={13} className="px-6 py-4.5 tracking-wider uppercase font-black text-slate-900 border-none">
                          Sebelas Maret University
                        </td>
                      </tr>

                      {/* Row level 1 Column Headers */}
                      <tr className="bg-indigo-950 text-white font-extrabold border-b border-indigo-900/50">
                        <th rowSpan={3} className="px-4 py-4 w-12 text-center bg-[#152a42]">No</th>
                        <th rowSpan={3} className="px-4 py-4 w-16 text-center bg-[#152a42]">Semester</th>
                        <th rowSpan={3} className="px-4 py-4 w-28 text-left bg-[#152a42] pl-6">Kode MK</th>
                        <th rowSpan={3} className="px-6 py-4 text-left bg-[#152a42]">Nama Mata Kuliah</th>
                        <th rowSpan={3} className="px-4 py-4 w-14 text-center bg-[#152a42]">SKS</th>

                        {/* Nilai Multi-columns merged */}
                        <th colSpan={8} className="py-2.5 font-black uppercase text-center tracking-widest bg-indigo-900 border-l border-indigo-800/40 text-[10px]">
                          Nilai
                        </th>
                      </tr>

                      {/* Row level 2 merged subheaders */}
                      <tr className="bg-indigo-900 text-white font-extrabold border-b border-indigo-800/40 text-[10px]">
                        <th colSpan={5} className="py-2 bg-amber-500 text-slate-950 font-black text-center tracking-wider uppercase border-l border-amber-400">
                          NILAI DARI SISTEM
                        </th>
                        <th rowSpan={2} className="px-2 py-3.5 w-24 text-center bg-[#152a42] border-l border-indigo-800/40">NILAI AKHIR</th>
                        <th rowSpan={2} className="px-2 py-3.5 w-24 text-center bg-[#152a42] border-l border-indigo-800/40">NILAI SKALA 100</th>
                        <th rowSpan={2} className="px-4 py-3.5 w-20 text-center bg-[#152a42] border-l border-indigo-800/40">HURUF</th>
                      </tr>

                      {/* Row level 3 System Assessment codes */}
                      <tr className="text-white font-black text-[9px] border-b border-slate-200">
                        {/* UK1 (TUGAS) - Salmon red */}
                        <th className="py-2.5 w-16 bg-rose-500 border-r border-rose-400/30 uppercase text-center leading-tight">
                          UK1<br /><span className="text-[8px] opacity-90 font-bold">(TUGAS)</span>
                        </th>
                        {/* UK2 (UTS) - Orange */}
                        <th className="py-2.5 w-16 bg-orange-500 border-r border-orange-400/30 uppercase text-center leading-tight">
                          UK2<br /><span className="text-[8px] opacity-90 font-bold">(UTS)</span>
                        </th>
                        {/* UK3 (UAS) - Green-teal */}
                        <th className="py-2.5 w-16 bg-teal-600 border-r border-teal-500/30 uppercase text-center leading-tight">
                          UK3<br /><span className="text-[8px] opacity-90 font-bold">(UAS)</span>
                        </th>
                        {/* UK4 (PARTISIPATIF) - Light blue-teal */}
                        <th className="py-2.5 w-16 bg-sky-500 border-r border-sky-400/30 uppercase text-center leading-tight">
                          UK4<br /><span className="text-[8px] opacity-90 font-bold">(PARTISIPATIF)</span>
                        </th>
                        {/* UK5 (PROYEK) - Indigo */}
                        <th className="py-2.5 w-16 bg-indigo-600 border-r border-indigo-500/30 uppercase text-center leading-tight">
                          UK5<br /><span className="text-[8px] opacity-90 font-bold">(PROYEK)</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                      {processedGrades.length > 0 ? (
                        processedGrades.map((grade, index) => (
                          <tr key={grade.code} className="hover:bg-slate-50/60 transition-colors">
                            {/* No */}
                            <td className="px-4 py-4 text-center text-slate-400 font-bold bg-slate-50/20">
                              {index + 1}
                            </td>
                            {/* Semester */}
                            <td className="px-4 py-4 text-center font-bold text-slate-500">
                              {grade.semester}
                            </td>
                            {/* Kode MK */}
                            <td className="px-4 py-4 text-left font-extrabold text-slate-500 pl-6 tracking-wide">
                              {grade.code}
                            </td>
                            {/* Nama Mata Kuliah */}
                            <td className="px-6 py-4 text-left font-extrabold text-slate-800 max-w-xs truncate">
                              {grade.name}
                            </td>
                            {/* SKS */}
                            <td className="px-4 py-4 text-center font-bold text-slate-600">
                              {grade.sks}
                            </td>

                            {/* NILAI DARI SISTEM CELLS */}
                            <td className="px-2 py-4 text-center font-semibold text-slate-500 bg-rose-50/10 border-r border-slate-100">
                              {grade.uk1}
                            </td>
                            <td className="px-2 py-4 text-center font-semibold text-slate-500 bg-orange-50/10 border-r border-slate-100">
                              {grade.uk2}
                            </td>
                            <td className="px-2 py-4 text-center font-semibold text-slate-500 bg-teal-50/10 border-r border-slate-100">
                              {grade.uk3}
                            </td>
                            <td className="px-2 py-4 text-center font-semibold text-slate-500 bg-sky-50/10 border-r border-slate-100">
                              {grade.uk4}
                            </td>
                            <td className="px-2 py-4 text-center font-semibold text-slate-500 bg-indigo-50/10 border-r border-slate-100">
                              {grade.uk5}
                            </td>

                            {/* NILAI AKHIR */}
                            <td className="px-2 py-4 text-center font-black text-slate-800 border-r border-slate-100 bg-slate-50/20">
                              {grade.nilaiAkhir.toFixed(2)}
                            </td>
                            {/* NILAI SKALA 100 */}
                            <td className="px-2 py-4 text-center font-black text-slate-800 border-r border-slate-100 bg-slate-50/20">
                              {grade.nilaiSkala100.toFixed(2)}
                            </td>
                            {/* HURUF BADGE SQUARE */}
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-block w-8 py-1 rounded-md text-[10px] font-black text-center uppercase tracking-tight shadow-sm ${getGradeBadgeStyle(grade.gradeLetter)}`}>
                                {grade.gradeLetter}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={13} className="py-12 text-slate-400 font-bold text-sm text-center">
                            Tidak ada mata kuliah yang cocok dengan kata kunci atau filter Anda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table pagination footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4.5 flex items-center justify-between text-xs text-slate-400 font-bold">
                  <p>Menampilkan {processedGrades.length} Mata Kuliah Terpilih</p>
                  <p>Sistem Capaian Pembelajaran Lulusan Terpadu</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
