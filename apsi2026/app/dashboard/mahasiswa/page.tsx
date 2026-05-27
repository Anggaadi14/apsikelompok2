"use client";

import React, { useState, useEffect } from "react";

// Types for CPL Data
interface CPLData {
  id: number;
  code: string;
  name: string;
  score: number | null;
  status: "tercapai" | "belum_tercapai" | "belum_ditempuh";
  courses: { code: string; name: string; sks: number; grade: number }[];
}

// Types for Semester Grades
interface CourseGrade {
  code: string;
  name: string;
  sks: number;
  semester: number;
  gradeNumber: number;
  gradeLetter: string;
  cplMapped: string[];
}

const cplListInitial: CPLData[] = [
  {
    id: 1,
    code: "CPL 1",
    name: "Sikap dan Tata Nilai (Menerapkan nilai-nilai Pancasila dan etika profesi)",
    score: 82,
    status: "tercapai",
    courses: [
      { code: "UNI101", name: "Pendidikan Pancasila", sks: 2, grade: 85 },
      { code: "TIN102", name: "Etika Profesi Teknik Industri", sks: 2, grade: 79 },
    ],
  },
  {
    id: 2,
    code: "CPL 2",
    name: "Penguasaan Pengetahuan (Menguasai konsep matematika, sains, dan prinsip rekayasa)",
    score: 78,
    status: "belum_tercapai",
    courses: [
      { code: "TIN103", name: "Kalkulus I", sks: 3, grade: 75 },
      { code: "TIN104", name: "Fisika Dasar", sks: 3, grade: 81 },
    ],
  },
  {
    id: 3,
    code: "CPL 3",
    name: "Keterampilan Kerja Umum (Mampu menerapkan pemikiran logis, kritis, dan sistematis)",
    score: 88,
    status: "tercapai",
    courses: [
      { code: "TIN201", name: "Metodologi Penelitian", sks: 2, grade: 90 },
      { code: "TIN202", name: "Statistika Industri I", sks: 3, grade: 86 },
    ],
  },
  {
    id: 4,
    code: "CPL 4",
    name: "Keterampilan Kerja Khusus (Mampu merancang, memperbaiki, dan mengoperasikan sistem terintegrasi)",
    score: 85,
    status: "tercapai",
    courses: [
      { code: "TIN301", name: "Perencanaan dan Pengendalian Produksi", sks: 3, grade: 88 },
      { code: "TIN302", name: "Desain Sistem Kerja & Ergonomi", sks: 4, grade: 82 },
    ],
  },
  {
    id: 5,
    code: "CPL 5",
    name: "Mampu memformulasi dan menyelesaikan masalah rekayasa sistem industri",
    score: 75,
    status: "belum_tercapai",
    courses: [
      { code: "TIN205", name: "Penelitian Operasional I", sks: 3, grade: 70 },
      { code: "TIN206", name: "Analisa Keputusan", sks: 2, grade: 80 },
    ],
  },
  {
    id: 6,
    code: "CPL 6",
    name: "Mampu merancang eksperimen dan menganalisis data rekayasa",
    score: null,
    status: "belum_ditempuh",
    courses: [],
  },
  {
    id: 7,
    code: "CPL 7",
    name: "Mampu menggunakan metode, keterampilan, dan peralatan teknik modern untuk praktik rekayasa",
    score: 86,
    status: "tercapai",
    courses: [
      { code: "TIN305", name: "Simulasi Komputer", sks: 3, grade: 92 },
      { code: "TIN306", name: "Sistem Informasi Industri", sks: 3, grade: 80 },
    ],
  },
  {
    id: 8,
    code: "CPL 8",
    name: "Memiliki tanggung jawab profesional, sosial, dan kepedulian lingkungan",
    score: null,
    status: "belum_ditempuh",
    courses: [],
  },
  {
    id: 9,
    code: "CPL 9",
    name: "Mampu berkomunikasi secara efektif baik lisan maupun tulisan",
    score: 83,
    status: "tercapai",
    courses: [
      { code: "UNI105", name: "Bahasa Inggris Akademik", sks: 2, grade: 85 },
      { code: "TIN208", name: "Presentasi Teknis", sks: 2, grade: 81 },
    ],
  },
  {
    id: 10,
    code: "CPL 10",
    name: "Mampu belajar sepanjang hayat dan beradaptasi terhadap perubahan",
    score: null,
    status: "belum_ditempuh",
    courses: [],
  },
];

const courseGradesInitial: CourseGrade[] = [
  // Semester 1
  { code: "UNI101", name: "Pendidikan Pancasila", sks: 2, semester: 1, gradeNumber: 85, gradeLetter: "A", cplMapped: ["CPL 1"] },
  { code: "TIN103", name: "Kalkulus I", sks: 3, semester: 1, gradeNumber: 75, gradeLetter: "B+", cplMapped: ["CPL 2"] },
  { code: "TIN104", name: "Fisika Dasar", sks: 3, semester: 1, gradeNumber: 81, gradeLetter: "A", cplMapped: ["CPL 2"] },
  { code: "UNI105", name: "Bahasa Inggris Akademik", sks: 2, semester: 1, gradeNumber: 85, gradeLetter: "A", cplMapped: ["CPL 9"] },
  { code: "TIN101", name: "Pengantar Teknik Industri", sks: 2, semester: 1, gradeNumber: 80, gradeLetter: "A-", cplMapped: ["CPL 2"] },
  // Semester 2
  { code: "TIN102", name: "Etika Profesi Teknik Industri", sks: 2, semester: 2, gradeNumber: 79, gradeLetter: "B+", cplMapped: ["CPL 1"] },
  { code: "TIN202", name: "Statistika Industri I", sks: 3, semester: 2, gradeNumber: 86, gradeLetter: "A", cplMapped: ["CPL 3"] },
  { code: "TIN206", name: "Analisa Keputusan", sks: 2, semester: 2, gradeNumber: 80, gradeLetter: "A-", cplMapped: ["CPL 5"] },
  { code: "TIN207", name: "Gambar Teknik", sks: 2, semester: 2, gradeNumber: 78, gradeLetter: "B+", cplMapped: ["CPL 7"] },
  // Semester 3
  { code: "TIN201", name: "Metodologi Penelitian", sks: 2, semester: 3, gradeNumber: 90, gradeLetter: "A", cplMapped: ["CPL 3"] },
  { code: "TIN205", name: "Penelitian Operasional I", sks: 3, semester: 3, gradeNumber: 70, gradeLetter: "B", cplMapped: ["CPL 5"] },
  { code: "TIN208", name: "Presentasi Teknis", sks: 2, semester: 3, gradeNumber: 81, gradeLetter: "A", cplMapped: ["CPL 9"] },
  { code: "TIN302", name: "Desain Sistem Kerja & Ergonomi", sks: 4, semester: 3, gradeNumber: 82, gradeLetter: "A-", cplMapped: ["CPL 4"] },
  // Semester 4
  { code: "TIN301", name: "Perencanaan dan Pengendalian Produksi", sks: 3, semester: 4, gradeNumber: 88, gradeLetter: "A", cplMapped: ["CPL 4"] },
  { code: "TIN305", name: "Simulasi Komputer", sks: 3, semester: 4, gradeNumber: 92, gradeLetter: "A", cplMapped: ["CPL 7"] },
  { code: "TIN306", name: "Sistem Informasi Industri", sks: 3, semester: 4, gradeNumber: 80, gradeLetter: "A-", cplMapped: ["CPL 7"] },
];

export default function StudentDashboard() {
  // Navigation tabs: 'dashboard' | 'detail-cpl' | 'riwayat-nilai'
  const [activeTab, setActiveTab] = useState<"dashboard" | "detail-cpl" | "riwayat-nilai">("dashboard");
  const [activeSemesterDropdown, setActiveSemesterDropdown] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState("Ganjil 2024/2025");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // States for dynamic interactions
  const [hoveredCpl, setHoveredCpl] = useState<CPLData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [highlightedStat, setHighlightedStat] = useState<string | null>(null);

  // Riwayat Nilai Semester Filter
  const [transcriptSemesterFilter, setTranscriptSemesterFilter] = useState<string>("all");

  // Detail CPL Active Expanded Card
  const [expandedCplCard, setExpandedCplCard] = useState<number | null>(null);

  // Simulation loading / Download actions
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
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
            
            // Create a pseudo download file link
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

  // Calculations for GPA and SKS
  const getFilteredGrades = () => {
    if (transcriptSemesterFilter === "all") return courseGradesInitial;
    return courseGradesInitial.filter(g => g.semester.toString() === transcriptSemesterFilter);
  };

  const calculateSksAndGPA = () => {
    const grades = getFilteredGrades();
    const totalSks = grades.reduce((acc, curr) => acc + curr.sks, 0);
    const weightedPoints = grades.reduce((acc, curr) => {
      let val = 0;
      if (curr.gradeLetter === "A") val = 4.0;
      else if (curr.gradeLetter === "A-") val = 3.7;
      else if (curr.gradeLetter === "B+") val = 3.3;
      else if (curr.gradeLetter === "B") val = 3.0;
      else if (curr.gradeLetter === "B-") val = 2.7;
      else if (curr.gradeLetter === "C+") val = 2.3;
      else if (curr.gradeLetter === "C") val = 2.0;
      else if (curr.gradeLetter === "C-") val = 1.7;
      else if (curr.gradeLetter === "D") val = 1.0;
      return acc + (val * curr.sks);
    }, 0);
    const gpa = totalSks > 0 ? (weightedPoints / totalSks).toFixed(2) : "0.00";
    return { totalSks, gpa };
  };

  const { totalSks, gpa } = calculateSksAndGPA();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Dynamic Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-xl shadow-xl bg-white border border-slate-100 text-slate-800 animate-bounce transition-all duration-300">
          <div
            className={`w-3 h-10 rounded-full mr-3.5 ${
              toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-rose-500" : "bg-sky-500"
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
          className={`bg-white border-r border-slate-200 shrink-0 w-64 md:w-72 flex flex-col justify-between transition-all duration-300 z-40 absolute md:relative inset-y-0 left-0 md:translate-x-0 ${
            isMobileMenuOpen ? "translate-x-0 pt-16 md:pt-0" : "-translate-x-full"
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
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                      triggerToast(`Berpindah ke halaman ${item.label}`, "success");
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all border-l-4 cursor-pointer ${
                      isActive
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
            <span className="text-indigo-600 font-extrabold">{activeTab}</span>
          </nav>

          {/* TAB 1: DASHBOARD (MAIN FIGMA VISUALS) */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* --- 1. PROFILE BANNER CARD (PURPLE GRADIENT) --- */}
              <div className="bg-gradient-to-r from-violet-700 via-indigo-700 to-fuchsia-700 text-white rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 transform hover:scale-[1.005] transition-all duration-300 border border-violet-800/10">
                {/* Floating blurred ambient shapes to look premium */}
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

                  {/* Download button with simulated progress bar */}
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
                {/* Stat 1: CPL Tercapai */}
                <div
                  onClick={() => setHighlightedStat(highlightedStat === "tercapai" ? null : "tercapai")}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    highlightedStat === "tercapai" ? "ring-2 ring-emerald-500 scale-[1.02]" : "border-slate-200 hover:scale-[1.01]"
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

                {/* Stat 2: Belum Tercapai */}
                <div
                  onClick={() => setHighlightedStat(highlightedStat === "belum_tercapai" ? null : "belum_tercapai")}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    highlightedStat === "belum_tercapai" ? "ring-2 ring-rose-500 scale-[1.02]" : "border-slate-200 hover:scale-[1.01]"
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

                {/* Stat 3: Belum Ditempuh */}
                <div
                  onClick={() => setHighlightedStat(highlightedStat === "belum_ditempuh" ? null : "belum_ditempuh")}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    highlightedStat === "belum_ditempuh" ? "ring-2 ring-slate-400 scale-[1.02]" : "border-slate-200 hover:scale-[1.01]"
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

                {/* Stat 4: Rata-rata CPL */}
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

              {/* --- 3. CP CAPAIAN CHART CARD (PREMIUM SVG PLOT) --- */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-6 relative">
                <div>
                  <h3 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Grafik Capaian CPL 1-10</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Nilai di atas garis merah (80) menunjukkan CPL tercapai. Abu-abu / kosong = belum ditempuh.
                  </p>
                </div>

                {/* Custom bar chart builder using highly layout-perfect SVG and tooltips */}
                <div className="relative pt-6 min-h-[280px] w-full select-none">
                  {/* Grid Lines and Axis values */}
                  <div className="absolute inset-0 flex flex-col justify-between text-[10px] font-bold text-slate-400 py-8 pointer-events-none">
                    <div className="w-full flex items-center gap-2">
                      <span className="w-6 text-right shrink-0">100</span>
                      <div className="flex-1 border-b border-dashed border-slate-200" />
                    </div>
                    {/* The Target Line 80 with visual emphasis */}
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

                  {/* Columns Section */}
                  <div className="h-[200px] flex items-end pl-8 pr-2 pb-8 relative z-20 gap-3 md:gap-4 lg:gap-6">
                    {cplListInitial.map((cpl) => {
                      const hasScore = cpl.score !== null;
                      const scoreVal = cpl.score ?? 0;
                      // Height calculates relative to 100 max
                      const heightPercent = `${scoreVal}%`;
                      
                      // Check if matches the stat filter highlights
                      const isHighlighted = highlightedStat === null || cpl.status === highlightedStat;
                      
                      return (
                        <div
                          key={cpl.id}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          {/* Columns render */}
                          {hasScore ? (
                            <div
                              style={{ height: heightPercent }}
                              onMouseEnter={(e) => {
                                setHoveredCpl(cpl);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({
                                  x: e.currentTarget.offsetLeft + rect.width / 2,
                                  y: 200 - (scoreVal * 1.5), // dynamic relative height
                                });
                              }}
                              onMouseLeave={() => setHoveredCpl(null)}
                              className={`w-full rounded-t-lg transition-all duration-500 ease-out cursor-pointer relative shadow-sm ${
                                isHighlighted
                                  ? "bg-indigo-500/90 group-hover:bg-indigo-600 shadow-indigo-100 group-hover:scale-x-105 group-hover:shadow-md"
                                  : "bg-indigo-200/40 opacity-30"
                              }`}
                            >
                              {/* Glowing cap inside the column */}
                              <div className={`absolute top-0 inset-x-0 h-1.5 rounded-t-lg bg-indigo-300/40`} />
                              
                              {/* Inner Text score */}
                              <span className="absolute -top-6 inset-x-0 text-[10px] font-black text-center text-indigo-700 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {scoreVal}
                              </span>
                            </div>
                          ) : (
                            /* Unaccomplished dashed column visual block */
                            <div
                              className={`w-full h-[15%] border-2 border-dashed rounded-t-lg bg-slate-50 transition-all duration-300 flex items-center justify-center ${
                                isHighlighted ? "border-slate-300" : "border-slate-200/50 opacity-30"
                              }`}
                              title="Belum Ditempuh"
                            >
                              <span className="text-[9px] font-black text-slate-400 tracking-wider">-</span>
                            </div>
                          )}

                          {/* X-axis code labels */}
                          <span className={`absolute -bottom-6 text-[10px] font-extrabold tracking-tight transition-colors duration-200 ${
                            hasScore ? "text-slate-600 group-hover:text-indigo-700" : "text-slate-400"
                          }`}>
                            {cpl.code}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* PREMIUM CUSTOM HOVER TOOLTIP */}
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
                      {/* Accordion Card Header Click Trigger */}
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
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              cpl.status === "tercapai"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : cpl.status === "belum_tercapai"
                                ? "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
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

                      {/* Expanded Section Details */}
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

          {/* TAB 3: RIWAYAT NILAI */}
          {activeTab === "riwayat-nilai" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">Riwayat Nilai & Transkrip</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Daftar seluruh nilai mata kuliah yang telah ditempuh per semester beserta pemetaan CPL-nya.
                  </p>
                </div>

                {/* Filter Semester active selector */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                  {["all", "1", "2", "3", "4"].map((sem) => (
                    <button
                      key={sem}
                      onClick={() => {
                        setTranscriptSemesterFilter(sem);
                        triggerToast(`Filter semester diubah ke: ${sem === "all" ? "Semua Semester" : `Semester ${sem}`}`, "success");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        transcriptSemesterFilter === sem
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {sem === "all" ? "Semua" : `Sem ${sem}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Summary SKS & GPA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Kredit SKS Diambil</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalSks} SKS</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Indeks Prestasi Kumulatif (IPK)</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{transcriptSemesterFilter === "all" ? "3.75" : gpa}</p>
                  </div>
                </div>
              </div>

              {/* Table Transcript */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-center">
                        <th className="px-4 py-4 w-12 text-center">No.</th>
                        <th className="px-4 py-4 w-28 text-left">Kode MK</th>
                        <th className="px-6 py-4 text-left">Nama Mata Kuliah</th>
                        <th className="px-4 py-4 w-16 text-center">Semester</th>
                        <th className="px-4 py-4 w-16 text-center">SKS</th>
                        <th className="px-4 py-4 w-24 text-center">Nilai Angka</th>
                        <th className="px-4 py-4 w-20 text-center">Nilai Huruf</th>
                        <th className="px-4 py-4 w-32 text-center">Capaian CPL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-center font-semibold text-slate-700">
                      {getFilteredGrades().length > 0 ? (
                        getFilteredGrades().map((grade, index) => (
                          <tr key={grade.code} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3.5 text-center text-slate-400 font-bold">{index + 1}</td>
                            <td className="px-4 py-3.5 text-left font-bold text-slate-500">{grade.code}</td>
                            <td className="px-6 py-3.5 text-left font-bold text-slate-800">{grade.name}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-500">Semester {grade.semester}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-600">{grade.sks}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-800">{grade.gradeNumber.toFixed(2)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-block px-2.5 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-black">
                                {grade.gradeLetter}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {grade.cplMapped.map((c) => (
                                  <span
                                    key={c}
                                    className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-slate-400 font-bold text-sm text-center">
                            Tidak ada nilai terdaftar untuk filter ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs text-slate-400 font-bold">
                  <p>Menampilkan {getFilteredGrades().length} Mata Kuliah Terpilih</p>
                  <p>Sistem Capaian Pembelajaran Lulusan Terpadu</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Embedded visual styling configurations specifically for dynamic tooltip fading and mobile responsive layouts */}
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
