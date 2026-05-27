"use client";

import React, { useState, useEffect, useRef } from "react";

// Types
interface CPMKGrade {
  capaian: number | null;
  perbaikan: number | null;
}

interface Student {
  id: number;
  nim: string;
  nama: string;
  cpmk1: CPMKGrade;
  cpmk2: CPMKGrade;
  cpmk3: CPMKGrade;
  initialAkhirAngka: number;
  initialAkhirHuruf: string;
  isEdited?: boolean;
}

// Initial Data representing the exact state of the provided screenshot
const initialStudentsData: Student[] = [
  {
    id: 1,
    nim: "20511012",
    nama: "GADING ANANDA SYAHRI",
    cpmk1: { capaian: 60.0, perbaikan: null },
    cpmk2: { capaian: 60.0, perbaikan: 60.0 },
    cpmk3: { capaian: 32.0, perbaikan: 55.0 },
    initialAkhirAngka: 61.71,
    initialAkhirHuruf: "C+",
  },
  {
    id: 2,
    nim: "20511153",
    nama: "AMALIA MUTIARA PUTRI CESAR",
    cpmk1: { capaian: 60.0, perbaikan: null },
    cpmk2: { capaian: 57.0, perbaikan: 57.0 },
    cpmk3: { capaian: 32.0, perbaikan: 43.0 },
    initialAkhirAngka: 56.72,
    initialAkhirHuruf: "C-",
  },
  {
    id: 3,
    nim: "20511172",
    nama: "RADEN RAFI NINDYO SURYO LAKSONO",
    cpmk1: { capaian: 60.0, perbaikan: null },
    cpmk2: { capaian: 37.0, perbaikan: null },
    cpmk3: { capaian: 6.0, perbaikan: null },
    initialAkhirAngka: 36.96,
    initialAkhirHuruf: "D",
  },
  {
    id: 4,
    nim: "20511182",
    nama: "SALMA NOVISA",
    cpmk1: { capaian: 60.0, perbaikan: null },
    cpmk2: { capaian: 57.0, perbaikan: 57.0 },
    cpmk3: { capaian: 32.0, perbaikan: 55.0 },
    initialAkhirAngka: 60.5,
    initialAkhirHuruf: "C+",
  },
  {
    id: 5,
    nim: "20511196",
    nama: "ARDHI A.AL FAHMI",
    cpmk1: { capaian: 60.0, perbaikan: null },
    cpmk2: { capaian: 37.0, perbaikan: 37.0 },
    cpmk3: { capaian: 6.0, perbaikan: null },
    initialAkhirAngka: 36.25,
    initialAkhirHuruf: "D",
  },
  {
    id: 6,
    nim: "20511214",
    nama: "ALRYADI SAPUTRA",
    cpmk1: { capaian: 60.0, perbaikan: null },
    cpmk2: { capaian: 10.0, perbaikan: 14.0 },
    cpmk3: { capaian: 6.0, perbaikan: null },
    initialAkhirAngka: 25.5,
    initialAkhirHuruf: "E",
  },
  {
    id: 7,
    nim: "20511227",
    nama: "ANANDA RAHMATULLAH GAUTAMA",
    cpmk1: { capaian: null, perbaikan: null },
    cpmk2: { capaian: null, perbaikan: null },
    cpmk3: { capaian: null, perbaikan: null },
    initialAkhirAngka: 2.86,
    initialAkhirHuruf: "F",
  },
];

// Helper SVGs rendered inline to ensure zero asset loading errors
const Icons = {
  Home: () => (
    <svg className="w-4 h-4 mr-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Book: () => (
    <svg className="w-5 h-5 mr-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  GraduationCap: () => (
    <svg className="w-5 h-5 mr-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l5 1.66m-5-1.66l-5 1.66" />
    </svg>
  ),
  Chart: () => (
    <svg className="w-5 h-5 mr-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Speaker: () => (
    <svg className="w-5 h-5 mr-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5 mr-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ChevronRight: ({ className = "w-4 h-4 text-slate-400" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronDown: ({ className = "w-4 h-4 text-slate-400" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Import: () => (
    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Reset: () => (
    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

export default function Home() {
  // Navigation & Toggle States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("cp-mata-kuliah");
  const [activeSubMenu, setActiveSubMenu] = useState("nilai-cpmk");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Student Data & Form Fields
  const [students, setStudents] = useState<Student[]>(initialStudentsData);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all"); // 'all' | 'failed' | 'remedial'

  // Editable Meta Fields
  const [metaInfo, setMetaInfo] = useState({
    academicYear: "2020 Gasal",
    lecturer: "Widodo, Prof. Ir., MSCE., Ph.D. (785110201)",
    postDate: "-",
    course: "Statics I (STS-106)",
    className: "IC",
  });
  const [isEditingMeta, setIsEditingMeta] = useState<string | null>(null);

  // Cell Editing State
  // Keep track of which cell { studentId, subject, field } is currently being edited
  const [editingCell, setEditingCell] = useState<{
    studentId: number;
    subject: "cpmk1" | "cpmk2" | "cpmk3";
    field: "capaian" | "perbaikan";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Modals & Action States
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
  const [postingProgress, setPostingProgress] = useState(0);
  const [postingSuccess, setPostingSuccess] = useState(false);

  // Toast System
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  // Show a toast message that auto-dismisses after 3.5 seconds
  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle focus on the input box when double-clicked
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Dynamic Grade Calculation
  const calculateFinalGrade = (student: Student): { score: number; letter: string } => {
    if (!student.isEdited) {
      return { score: student.initialAkhirAngka, letter: student.initialAkhirHuruf };
    }

    const c1 = student.cpmk1.perbaikan !== null ? student.cpmk1.perbaikan : student.cpmk1.capaian;
    const c2 = student.cpmk2.perbaikan !== null ? student.cpmk2.perbaikan : student.cpmk2.capaian;
    const c3 = student.cpmk3.perbaikan !== null ? student.cpmk3.perbaikan : student.cpmk3.capaian;

    const v1 = c1 === null ? 0 : c1;
    const v2 = c2 === null ? 0 : c2;
    const v3 = c3 === null ? 0 : c3;

    // Standard formula: CPMK 1 = 30%, CPMK 2 = 30%, CPMK 3 = 40%
    const score = v1 * 0.3 + v2 * 0.3 + v3 * 0.4;
    const roundedScore = Math.round(score * 100) / 100;

    let letter = "F";
    if (roundedScore >= 80) letter = "A";
    else if (roundedScore >= 75) letter = "A-";
    else if (roundedScore >= 70) letter = "B+";
    else if (roundedScore >= 65) letter = "B";
    else if (roundedScore >= 62) letter = "B-";
    else if (roundedScore >= 60) letter = "C+";
    else if (roundedScore >= 56) letter = "C";
    else if (roundedScore >= 50) letter = "C-";
    else if (roundedScore >= 35) letter = "D";
    else if (roundedScore >= 20) letter = "E";

    return { score: roundedScore, letter };
  };

  // Grade cell click handler
  const handleCellClick = (
    studentId: number,
    subject: "cpmk1" | "cpmk2" | "cpmk3",
    field: "capaian" | "perbaikan"
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const val = student[subject][field];
    setEditValue(val === null ? "" : val.toString());
    setEditingCell({ studentId, subject, field });
  };

  // Grade saving handler
  const handleSaveGrade = () => {
    if (!editingCell) return;

    const { studentId, subject, field } = editingCell;
    const cleanVal = editValue.trim();

    let newValue: number | null = null;
    if (cleanVal !== "") {
      const parsed = parseFloat(cleanVal);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        showToast("Nilai harus berupa angka antara 0 - 100", "error");
        setEditingCell(null);
        return;
      }
      newValue = Math.round(parsed * 100) / 100;
    }

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id === studentId) {
          const updatedSubject = { ...student[subject], [field]: newValue };
          return {
            ...student,
            [subject]: updatedSubject,
            isEdited: true,
          };
        }
        return student;
      })
    );

    setEditingCell(null);
    showToast("Nilai berhasil diperbarui!", "success");
  };

  // Meta info saving handler
  const handleSaveMeta = (field: string, value: string) => {
    setMetaInfo((prev) => ({ ...prev, [field]: value }));
    setIsEditingMeta(null);
    showToast("Data metadata berhasil diperbarui", "success");
  };

  // Reset Individual Student Grade
  const handleResetRow = (studentId: number) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id === studentId) {
          return {
            ...student,
            cpmk1: { capaian: null, perbaikan: null },
            cpmk2: { capaian: null, perbaikan: null },
            cpmk3: { capaian: null, perbaikan: null },
            isEdited: true,
          };
        }
        return student;
      })
    );
    showToast(`Data nilai untuk NIM tersebut berhasil di-reset`, "info");
  };

  // Reset All Grades
  const handleGlobalReset = () => {
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        cpmk1: { capaian: null, perbaikan: null },
        cpmk2: { capaian: null, perbaikan: null },
        cpmk3: { capaian: null, perbaikan: null },
        isEdited: true,
      }))
    );
    setIsResetConfirmOpen(false);
    showToast("Semua data nilai berhasil dikosongkan!", "info");
  };

  // Download Grades in CSV format
  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No,NIM,Nama,CPMK1 Capaian,CPMK1 Perbaikan,CPMK2 Capaian,CPMK2 Perbaikan,CPMK3 Capaian,CPMK3 Perbaikan,Nilai Akhir Angka,Nilai Akhir Huruf\n";

    students.forEach((student, index) => {
      const final = calculateFinalGrade(student);
      const row = [
        index + 1,
        student.nim,
        student.nama,
        student.cpmk1.capaian ?? "-",
        student.cpmk1.perbaikan ?? "-",
        student.cpmk2.capaian ?? "-",
        student.cpmk2.perbaikan ?? "-",
        student.cpmk3.capaian ?? "-",
        student.cpmk3.perbaikan ?? "-",
        final.score,
        final.letter,
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nilai_cpmk_${metaInfo.course.replace(/\s+/g, "_").toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("File CSV nilai berhasil di-download!", "success");
  };

  // Import Mock Data
  const handleImportMock = () => {
    const mockStudents: Student[] = [
      {
        id: 8,
        nim: "20511235",
        nama: "YUSUF MAULANA EFFENDI",
        cpmk1: { capaian: 75.0, perbaikan: null },
        cpmk2: { capaian: 82.0, perbaikan: null },
        cpmk3: { capaian: 80.0, perbaikan: null },
        initialAkhirAngka: 79.1,
        initialAkhirHuruf: "A-",
      },
      {
        id: 9,
        nim: "20511242",
        nama: "KARTIKA WULANDARI",
        cpmk1: { capaian: 85.0, perbaikan: null },
        cpmk2: { capaian: 90.0, perbaikan: null },
        cpmk3: { capaian: 72.0, perbaikan: null },
        initialAkhirAngka: 81.3,
        initialAkhirHuruf: "A",
      },
      {
        id: 10,
        nim: "20511261",
        nama: "HENDRA WIJAYA",
        cpmk1: { capaian: 45.0, perbaikan: 62.0 },
        cpmk2: { capaian: 40.0, perbaikan: 50.0 },
        cpmk3: { capaian: 28.0, perbaikan: 60.0 },
        initialAkhirAngka: 57.6,
        initialAkhirHuruf: "C",
      },
    ];

    setStudents((prev) => {
      // Check if they are already imported
      if (prev.some((s) => s.id === 8)) {
        showToast("Roster tambahan sudah di-import sebelumnya", "info");
        return prev;
      }
      return [...prev, ...mockStudents];
    });

    setIsImportModalOpen(false);
    showToast("3 Roster Mahasiswa berhasil di-import!", "success");
  };

  // Posting Grades to Database Simulation
  const handlePostingNilai = () => {
    setIsPostingModalOpen(true);
    setPostingProgress(0);
    setPostingSuccess(false);

    // Simulate progress bar increment
    const interval = setInterval(() => {
      setPostingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setPostingSuccess(true);
          // Set date to today
          const today = new Date();
          const dateStr = today.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          setMetaInfo((m) => ({ ...m, postDate: dateStr }));
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Filter students based on Search and Selected Filters
  const filteredStudents = students.filter((student) => {
    // Search Term Filter
    const matchesSearch =
      student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nim.includes(searchTerm);

    if (!matchesSearch) return false;

    // Sub-grade Highlight Filter
    if (gradeFilter === "failed") {
      // Students with at least one grade under 50.00
      const hasFailed =
        (student.cpmk1.capaian !== null && student.cpmk1.capaian < 50) ||
        (student.cpmk1.perbaikan !== null && student.cpmk1.perbaikan < 50) ||
        (student.cpmk2.capaian !== null && student.cpmk2.capaian < 50) ||
        (student.cpmk2.perbaikan !== null && student.cpmk2.perbaikan < 50) ||
        (student.cpmk3.capaian !== null && student.cpmk3.capaian < 50) ||
        (student.cpmk3.perbaikan !== null && student.cpmk3.perbaikan < 50);
      return hasFailed;
    }

    if (gradeFilter === "remedial") {
      // Students who have any "Perbaikan" score entered
      return (
        student.cpmk1.perbaikan !== null ||
        student.cpmk2.perbaikan !== null ||
        student.cpmk3.perbaikan !== null
      );
    }

    return true;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-[#0f172a] overflow-hidden font-sans">
      {/* Toast Popup Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-xl shadow-xl bg-white border border-slate-100 text-slate-800 animate-toast">
          <div
            className={`w-2.5 h-10 rounded-full mr-3.5 ${toast.type === "success"
              ? "bg-emerald-500"
              : toast.type === "error"
                ? "bg-rose-500"
                : "bg-amber-500"
              }`}
          />
          <div>
            <p className="text-sm font-semibold">Notifikasi</p>
            <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Background Dim Backdrop for Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      {/* Responsive layout: fixed width sidebar on desktop, sliding drawer on mobile */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-72 flex flex-col bg-[#2c4d75] text-white/95 border-r border-[#1f3a5c]/30 shadow-2xl transition-all duration-300 transform shrink-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${isSidebarOpen ? "lg:w-72 lg:opacity-100 lg:border-r lg:shadow-2xl" : "lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0 lg:shadow-none"}`}
      >
        {/* Brand/App Title Section */}
        <div className="flex items-center h-16 px-6 bg-[#1b3654] border-b border-[#152a42]/30 shrink-0">
          <div className="bg-amber-400 p-1.5 rounded-lg mr-3 shadow-md shadow-amber-400/20">
            <svg className="w-5 h-5 text-[#10365c]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89l-.26-3.86a1 1 0 01.51-.875zm13.38 0a1 1 0 01.51.875l-.26 3.86a1 1 0 01-.89.89 8.97 8.97 0 00-1.05.174v-4.102l1.69-.724zM7.3 13.139a11.386 11.386 0 013.52 0 10.582 10.582 0 01-3.52 0zm-1.8 1.402A12.03 12.03 0 0010 15c1.658 0 3.254-.334 4.5-.94v.003l-.001.383a3.375 3.375 0 01-3.185 3.37L11 18.25h-2l-.314-.002A3.375 3.375 0 015.5 14.87v-.329z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-amber-300">Learning Outcomes</h1>
            <p className="text-[10px] text-slate-300 tracking-wider uppercase font-semibold">Assessment System</p>
          </div>
        </div>

        {/* Sidebar Navigation Options */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {/* Beranda Link */}
          <button
            onClick={() => setActiveMenu("beranda")}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === "beranda"
              ? "bg-[#1f3a5c] text-white"
              : "text-slate-300 hover:bg-[#1f3a5c]/45 hover:text-white"
              }`}
          >
            <div className="flex items-center">
              <Icons.Home />
              <span>Beranda</span>
            </div>
          </button>

          {/* CP Lulusan Accodion Header */}
          <div>
            <button
              onClick={() => setActiveMenu(activeMenu === "cp-lulusan" ? "" : "cp-lulusan")}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === "cp-lulusan"
                ? "bg-[#1f3a5c] text-white"
                : "text-slate-300 hover:bg-[#1f3a5c]/45 hover:text-white"
                }`}
            >
              <div className="flex items-center">
                <Icons.GraduationCap />
                <span>CP Lulusan</span>
              </div>
              <Icons.ChevronRight
                className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === "cp-lulusan" ? "rotate-90" : ""
                  }`}
              />
            </button>
            {activeMenu === "cp-lulusan" && (
              <div className="pl-9 pr-2 py-1 mt-1 space-y-1 bg-[#1a3556]/45 rounded-lg animate-toast">
                <button className="block w-full py-2 text-left text-xs text-slate-300 hover:text-white transition cursor-pointer">
                  Ringkasan CPL
                </button>
                <button className="block w-full py-2 text-left text-xs text-slate-300 hover:text-white transition cursor-pointer">
                  Pemetaan CPL
                </button>
              </div>
            )}
          </div>

          {/* CP Mata Kuliah Header (Crimson Red Active Background matching Screenshot) */}
          <div>
            <button
              onClick={() => setActiveMenu(activeMenu === "cp-mata-kuliah" ? "" : "cp-mata-kuliah")}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === "cp-mata-kuliah"
                ? "bg-active-red text-white"
                : "text-slate-300 hover:bg-[#1f3a5c]/45 hover:text-white"
                }`}
            >
              <div className="flex items-center">
                <Icons.Book />
                <span>CP Mata Kuliah</span>
              </div>
              <Icons.ChevronRight
                className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${activeMenu === "cp-mata-kuliah" ? "rotate-90" : ""
                  }`}
              />
            </button>

            {/* Submenus expanded under CP Mata Kuliah */}
            {activeMenu === "cp-mata-kuliah" && (
              <div className="pl-4 pr-1 py-1.5 mt-1 space-y-1 bg-[#1a3556]/45 rounded-lg border-l border-active-red/50 animate-toast">
                {[
                  { id: "rps", label: "RPS Mata Kuliah" },
                  { id: "soal", label: "File Soal Ujian" },
                  { id: "verifikasi", label: "Verifikasi Soal Ujian" },
                  { id: "nilai-cpmk", label: "Nilai CPMK" },
                  { id: "portofolio", label: "Portofolio Capaian Makul" },
                  { id: "rekapitulasi", label: "Rekapitulasi CPMK" },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubMenu(sub.id)}
                    className={`w-full py-2.5 px-4 rounded text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeSubMenu === sub.id
                      ? "bg-[#244265] text-white border-r-4 border-amber-400"
                      : "text-slate-300 hover:text-white hover:bg-[#1f3a5c]/30"
                      }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Administrasi & Kinerja Accordion Link */}
          <div>
            <button
              onClick={() => setActiveMenu(activeMenu === "admin-kinerja" ? "" : "admin-kinerja")}
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-[#1f3a5c]/45 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center">
                <Icons.Chart />
                <span>Administrasi & Kinerja</span>
              </div>
              <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Pengumuman Link */}
          <button className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-[#1f3a5c]/45 hover:text-white transition-all cursor-pointer">
            <div className="flex items-center">
              <Icons.Speaker />
              <span>Pengumuman</span>
            </div>
          </button>

          {/* Master Data Accordion Link */}
          <div>
            <button
              onClick={() => setActiveMenu(activeMenu === "master-data" ? "" : "master-data")}
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-[#1f3a5c]/45 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center">
                <Icons.Settings />
                <span>Master Data</span>
              </div>
              <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </nav>

        {/* Sidebar Footer details */}
        <div className="p-4 bg-[#1b3654] border-t border-[#152a42]/30 text-center shrink-0">
          <p className="text-[10px] text-slate-400 font-bold">TEKNIK INDUSTRI</p>
          <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">Universitas Sebelas Maret (UNS)</p>
        </div>
      </aside>

      {/* --- MAIN PAGE LAYOUT --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* --- TOP NAVBAR --- */}
        <header className="h-16 flex items-center justify-between px-6 bg-primary-blue text-white shadow-md z-30 shrink-0">
          <div className="flex items-center">
            {/* Hamburger Button to Toggle Desktop Sidebar */}
            <button
              onClick={() => {
                setIsSidebarOpen(!isSidebarOpen);
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition focus:outline-none cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Title / Department metadata */}
            <div className="hidden sm:block ml-4 border-l border-white/20 pl-4">
              <span className="text-xs font-bold text-slate-300 tracking-wider">PORTAL DOSEN</span>
            </div>
          </div>

          {/* User profile dropdown selector */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full hover:bg-white/10 transition active:scale-98 focus:outline-none cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center font-bold text-[#10365c] text-sm shadow">
                AD
              </div>
              <span className="text-sm font-semibold tracking-wide hidden sm:inline">Admin</span>
              <Icons.ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Profile Dropdown Items */}
            {isProfileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 text-slate-700 z-50 text-xs animate-toast">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-[#10365c]">Admin Jurusan</p>
                    <p className="text-[10px] text-slate-400">admin.ap@ugm.ac.id</p>
                  </div>
                  <button className="flex items-center w-full px-4 py-2.5 text-left hover:bg-slate-50 hover:text-[#10365c] cursor-pointer">
                    <Icons.User /> Profil Saya
                  </button>
                  <button className="flex items-center w-full px-4 py-2.5 text-left hover:bg-slate-50 hover:text-[#10365c] cursor-pointer">
                    <Icons.Settings /> Pengaturan
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      showToast("Logout berhasil", "info");
                    }}
                    className="flex items-center w-full px-4 py-2.5 text-left text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* --- MAIN SCROLLABLE CONTAINER --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Breadcrumb Trail */}
          <nav className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-bold">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="hover:text-slate-600 transition cursor-pointer">Dashboard</span>
            <Icons.ChevronRight className="w-2.5 h-2.5 text-slate-300" />
            <span className="hover:text-slate-600 transition cursor-pointer">Nilai Capaian Makul</span>
            <Icons.ChevronRight className="w-2.5 h-2.5 text-slate-300" />
            <span className="text-slate-600 font-extrabold">Input</span>
          </nav>

          {/* Page Headers */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-baseline">
              Nilai Capaian Mata Kuliah
              <span className="text-sm font-semibold text-slate-400 ml-2.5">Daftar Nilai Capaian</span>
            </h2>
          </div>

          {/* --- COURSE CARD INFO GRID (Metadata Card) --- */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm">
              <div className="space-y-3">
                {/* Academic Year Row */}
                <div className="flex flex-col sm:flex-row sm:items-center py-1.5 bg-slate-50/50 rounded-lg px-3">
                  <span className="w-40 font-bold text-slate-500 shrink-0">Tahun Akademik</span>
                  <div className="flex-1 flex items-center justify-between mt-1 sm:mt-0">
                    {isEditingMeta === "academicYear" ? (
                      <input
                        type="text"
                        defaultValue={metaInfo.academicYear}
                        onBlur={(e) => handleSaveMeta("academicYear", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveMeta("academicYear", e.currentTarget.value)}
                        className="bg-white border border-slate-300 rounded px-2.5 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                        autoFocus
                      />
                    ) : (
                      <span className="text-slate-800 font-bold">{metaInfo.academicYear}</span>
                    )}
                    <button
                      onClick={() => setIsEditingMeta("academicYear")}
                      className="text-slate-400 hover:text-[#10365c] p-1 ml-1 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Lecturer Row */}
                <div className="flex flex-col sm:flex-row sm:items-center py-1.5 bg-slate-50/50 rounded-lg px-3">
                  <span className="w-40 font-bold text-slate-500 shrink-0">Dosen Pengampu</span>
                  <div className="flex-1 flex items-center justify-between mt-1 sm:mt-0">
                    {isEditingMeta === "lecturer" ? (
                      <input
                        type="text"
                        defaultValue={metaInfo.lecturer}
                        onBlur={(e) => handleSaveMeta("lecturer", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveMeta("lecturer", e.currentTarget.value)}
                        className="bg-white border border-slate-300 rounded px-2.5 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                        autoFocus
                      />
                    ) : (
                      <span className="text-slate-800 font-bold break-all leading-snug">{metaInfo.lecturer}</span>
                    )}
                    <button
                      onClick={() => setIsEditingMeta("lecturer")}
                      className="text-slate-400 hover:text-[#10365c] p-1 ml-1 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Posting Date Row */}
                <div className="flex flex-col sm:flex-row sm:items-center py-1.5 bg-slate-50/50 rounded-lg px-3">
                  <span className="w-40 font-bold text-slate-500 shrink-0">Tanggal Posting</span>
                  <div className="flex-1 flex items-center justify-between mt-1 sm:mt-0">
                    {isEditingMeta === "postDate" ? (
                      <input
                        type="text"
                        defaultValue={metaInfo.postDate}
                        onBlur={(e) => handleSaveMeta("postDate", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveMeta("postDate", e.currentTarget.value)}
                        className="bg-white border border-slate-300 rounded px-2.5 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                        autoFocus
                      />
                    ) : (
                      <span className="text-slate-800 font-bold">{metaInfo.postDate}</span>
                    )}
                    <button
                      onClick={() => setIsEditingMeta("postDate")}
                      className="text-slate-400 hover:text-[#10365c] p-1 ml-1 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Course Title Row */}
                <div className="flex flex-col sm:flex-row sm:items-center py-1.5 bg-slate-50/50 rounded-lg px-3">
                  <span className="w-40 font-bold text-slate-500 shrink-0">Mata Kuliah</span>
                  <div className="flex-1 flex items-center justify-between mt-1 sm:mt-0">
                    {isEditingMeta === "course" ? (
                      <input
                        type="text"
                        defaultValue={metaInfo.course}
                        onBlur={(e) => handleSaveMeta("course", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveMeta("course", e.currentTarget.value)}
                        className="bg-white border border-slate-300 rounded px-2.5 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                        autoFocus
                      />
                    ) : (
                      <span className="text-slate-800 font-bold">{metaInfo.course}</span>
                    )}
                    <button
                      onClick={() => setIsEditingMeta("course")}
                      className="text-slate-400 hover:text-[#10365c] p-1 ml-1 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Class Name Row */}
                <div className="flex flex-col sm:flex-row sm:items-center py-1.5 bg-slate-50/50 rounded-lg px-3">
                  <span className="w-40 font-bold text-slate-500 shrink-0">Kelas</span>
                  <div className="flex-1 flex items-center justify-between mt-1 sm:mt-0">
                    {isEditingMeta === "className" ? (
                      <input
                        type="text"
                        defaultValue={metaInfo.className}
                        onBlur={(e) => handleSaveMeta("className", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveMeta("className", e.currentTarget.value)}
                        className="bg-white border border-slate-300 rounded px-2.5 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                        autoFocus
                      />
                    ) : (
                      <span className="text-slate-800 font-bold">{metaInfo.className}</span>
                    )}
                    <button
                      onClick={() => setIsEditingMeta("className")}
                      className="text-slate-400 hover:text-[#10365c] p-1 ml-1 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- SEARCH & CONTROL PANEL BAR --- */}
          <div className="flex flex-col xl:flex-row gap-4 items-stretch justify-between">
            {/* Quick Action Buttons (Import, Post, Reset) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Import button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg shadow-sm font-bold text-xs tracking-wide transition active:scale-97 cursor-pointer"
              >
                <Icons.Import />
                Import Data Nilai
              </button>

              {/* Posting button */}
              <button
                onClick={handlePostingNilai}
                className="flex items-center px-4 py-2.5 bg-[#26c6da] hover:bg-[#00acc1] text-white rounded-lg shadow-sm font-bold text-xs tracking-wide transition active:scale-97 cursor-pointer"
              >
                <Icons.Upload />
                Posting Nilai
              </button>

              {/* Reset All button */}
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center px-4 py-2.5 bg-[#ef5350] hover:bg-[#d32f2f] text-white rounded-lg shadow-sm font-bold text-xs tracking-wide transition active:scale-97 cursor-pointer"
              >
                <Icons.Reset />
                Reset Data
              </button>
            </div>

            {/* Interactive Filters: Searchbar and category dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Roster Search box */}
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari NIM / Nama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                />
              </div>

              {/* Custom Grade Filter Dropdown */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#10365c] cursor-pointer font-bold"
              >
                <option value="all">Semua Nilai</option>
                <option value="failed">Perlu Remedial (CPMK &lt; 50)</option>
                <option value="remedial">Ada Nilai Perbaikan</option>
              </select>

              {/* Download CSV button */}
              <button
                onClick={handleDownloadCSV}
                className="flex items-center justify-center px-4 py-2.5 bg-[#4caf50] hover:bg-[#43a047] text-white rounded-lg shadow-sm font-bold text-xs tracking-wide transition active:scale-97 cursor-pointer"
              >
                <Icons.Download />
                Download Nilai Akhir
              </button>
            </div>
          </div>

          {/* --- EVALUATION ROSTER TABLE --- */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Table Horizontal Scrollable container */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-center">
                <thead>
                  {/* Row level 1 headers */}
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th rowSpan={2} className="px-4 py-4.5 border-r border-slate-200 w-16 text-center">No.</th>
                    <th rowSpan={2} className="px-6 py-4.5 border-r border-slate-200 text-left min-w-[220px]">Mahasiswa</th>
                    <th colSpan={8} className="px-4 py-2.5 border-b border-slate-200 font-extrabold text-slate-700 tracking-wide bg-slate-50">Nilai</th>
                    <th rowSpan={2} className="px-4 py-4.5 w-24 text-center">Aksi</th>
                  </tr>
                  {/* Row level 2 headers */}
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold">
                    {/* CPMK 1 */}
                    <th colSpan={2} className="px-2 py-3 border-r border-slate-200 w-32">CPMK 1</th>
                    {/* CPMK 2 */}
                    <th colSpan={2} className="px-2 py-3 border-r border-slate-200 w-32">CPMK 2</th>
                    {/* CPMK 3 */}
                    <th colSpan={2} className="px-2 py-3 border-r border-slate-200 w-32">CPMK 3</th>
                    {/* Final grades */}
                    <th colSpan={2} className="px-2 py-3 border-r border-slate-200 w-32 text-slate-700 font-extrabold">Akhir</th>
                  </tr>
                  {/* Row level 3 headers (Capaian vs Perbaikan, Angka vs Huruf) */}
                  <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    {/* No & Mahasiswa empty spacer */}
                    <th className="border-r border-slate-200"></th>
                    <th className="border-r border-slate-200"></th>

                    {/* CPMK 1 */}
                    <th className="py-2.5 border-r border-slate-200">Capaian</th>
                    <th className="py-2.5 border-r border-slate-200">Perbaikan</th>

                    {/* CPMK 2 */}
                    <th className="py-2.5 border-r border-slate-200">Capaian</th>
                    <th className="py-2.5 border-r border-slate-200">Perbaikan</th>

                    {/* CPMK 3 */}
                    <th className="py-2.5 border-r border-slate-200">Capaian</th>
                    <th className="py-2.5 border-r border-slate-200">Perbaikan</th>

                    {/* Akhir */}
                    <th className="py-2.5 border-r border-slate-200 text-slate-600 font-extrabold">Angka</th>
                    <th className="py-2.5 border-r border-slate-200 text-slate-600 font-extrabold">Huruf</th>

                    {/* Action empty spacer */}
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => {
                      // Dynamically calculate grades
                      const final = calculateFinalGrade(student);

                      // Check highlighting flags (scores under 50.00)
                      const isC1CapaianLow = student.cpmk1.capaian !== null && student.cpmk1.capaian < 50;
                      const isC1PerbaikanLow = student.cpmk1.perbaikan !== null && student.cpmk1.perbaikan < 50;
                      const isC2CapaianLow = student.cpmk2.capaian !== null && student.cpmk2.capaian < 50;
                      const isC2PerbaikanLow = student.cpmk2.perbaikan !== null && student.cpmk2.perbaikan < 50;
                      const isC3CapaianLow = student.cpmk3.capaian !== null && student.cpmk3.capaian < 50;
                      const isC3PerbaikanLow = student.cpmk3.perbaikan !== null && student.cpmk3.perbaikan < 50;

                      return (
                        <tr
                          key={student.id}
                          className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                        >
                          {/* Row Index */}
                          <td className="px-4 py-4 border-r border-slate-100 text-slate-400 font-bold text-center">
                            {index + 1}
                          </td>

                          {/* Student Identifiers (NIM + Name) */}
                          <td className="px-6 py-4 border-r border-slate-100 text-left">
                            <span className="block text-[10px] text-slate-400 font-bold tracking-wider">{student.nim}</span>
                            <span className="block text-slate-800 font-bold mt-0.5 leading-tight">{student.nama}</span>
                          </td>

                          {/* CPMK 1 Capaian */}
                          <td
                            onClick={() => handleCellClick(student.id, "cpmk1", "capaian")}
                            className={`border-r border-slate-100 cursor-pointer font-bold w-16 transition-all hover:bg-slate-100/50 ${isC1CapaianLow ? "bg-[#a82e2e] text-white font-extrabold" : "text-slate-600"
                              }`}
                          >
                            {editingCell?.studentId === student.id &&
                              editingCell?.subject === "cpmk1" &&
                              editingCell?.field === "capaian" ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveGrade}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()}
                                className="w-12 text-center text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                              />
                            ) : student.cpmk1.capaian !== null ? (
                              student.cpmk1.capaian.toFixed(2)
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* CPMK 1 Perbaikan */}
                          <td
                            onClick={() => handleCellClick(student.id, "cpmk1", "perbaikan")}
                            className={`border-r border-slate-100 cursor-pointer font-bold w-16 transition-all hover:bg-slate-100/50 ${isC1PerbaikanLow ? "bg-[#a82e2e] text-white font-extrabold" : "text-slate-400"
                              }`}
                          >
                            {editingCell?.studentId === student.id &&
                              editingCell?.subject === "cpmk1" &&
                              editingCell?.field === "perbaikan" ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveGrade}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()}
                                className="w-12 text-center text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                              />
                            ) : student.cpmk1.perbaikan !== null ? (
                              student.cpmk1.perbaikan.toFixed(2)
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* CPMK 2 Capaian */}
                          <td
                            onClick={() => handleCellClick(student.id, "cpmk2", "capaian")}
                            className={`border-r border-slate-100 cursor-pointer font-bold w-16 transition-all hover:bg-slate-100/50 ${isC2CapaianLow ? "bg-[#a82e2e] text-white font-extrabold" : "text-slate-600"
                              }`}
                          >
                            {editingCell?.studentId === student.id &&
                              editingCell?.subject === "cpmk2" &&
                              editingCell?.field === "capaian" ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveGrade}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()}
                                className="w-12 text-center text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                              />
                            ) : student.cpmk2.capaian !== null ? (
                              student.cpmk2.capaian.toFixed(2)
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* CPMK 2 Perbaikan */}
                          <td
                            onClick={() => handleCellClick(student.id, "cpmk2", "perbaikan")}
                            className={`border-r border-slate-100 cursor-pointer font-bold w-16 transition-all hover:bg-slate-100/50 ${isC2PerbaikanLow ? "bg-[#a82e2e] text-white font-extrabold" : "text-slate-400"
                              }`}
                          >
                            {editingCell?.studentId === student.id &&
                              editingCell?.subject === "cpmk2" &&
                              editingCell?.field === "perbaikan" ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveGrade}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()}
                                className="w-12 text-center text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                              />
                            ) : student.cpmk2.perbaikan !== null ? (
                              student.cpmk2.perbaikan.toFixed(2)
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* CPMK 3 Capaian */}
                          <td
                            onClick={() => handleCellClick(student.id, "cpmk3", "capaian")}
                            className={`border-r border-slate-100 cursor-pointer font-bold w-16 transition-all hover:bg-slate-100/50 ${isC3CapaianLow ? "bg-[#a82e2e] text-white font-extrabold" : "text-slate-600"
                              }`}
                          >
                            {editingCell?.studentId === student.id &&
                              editingCell?.subject === "cpmk3" &&
                              editingCell?.field === "capaian" ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveGrade}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()}
                                className="w-12 text-center text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                              />
                            ) : student.cpmk3.capaian !== null ? (
                              student.cpmk3.capaian.toFixed(2)
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* CPMK 3 Perbaikan */}
                          <td
                            onClick={() => handleCellClick(student.id, "cpmk3", "perbaikan")}
                            className={`border-r border-slate-100 cursor-pointer font-bold w-16 transition-all hover:bg-slate-100/50 ${isC3PerbaikanLow ? "bg-[#a82e2e] text-white font-extrabold" : "text-slate-400"
                              }`}
                          >
                            {editingCell?.studentId === student.id &&
                              editingCell?.subject === "cpmk3" &&
                              editingCell?.field === "perbaikan" ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveGrade}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()}
                                className="w-12 text-center text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#10365c]"
                              />
                            ) : student.cpmk3.perbaikan !== null ? (
                              student.cpmk3.perbaikan.toFixed(2)
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* Final Numerical Grade (Angka) */}
                          <td className="px-2 py-4 border-r border-slate-100 font-extrabold text-slate-800 text-[13px] bg-slate-50/40 w-16">
                            {final.score.toFixed(2)}
                          </td>

                          {/* Final Letter Grade (Huruf) */}
                          <td className="px-2 py-4 border-r border-slate-100 font-extrabold text-[#2c4d75] text-[13px] bg-slate-50/40 w-16">
                            {final.letter}
                          </td>

                          {/* Row Reset Button */}
                          <td className="px-4 py-4 text-center w-24">
                            <button
                              onClick={() => handleResetRow(student.id)}
                              className="inline-flex items-center px-2 py-1.5 bg-active-red hover:bg-[#b71c1c] text-white font-bold rounded shadow-sm text-[10px] tracking-wide transition active:scale-95 cursor-pointer"
                            >
                              <Icons.Trash />
                              Reset
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-slate-400 font-bold text-sm">
                        Tidak ada mahasiswa yang cocok dengan pencarian / filter Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table pagination footer details */}
            <div className="px-6 py-4.5 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-500">
              <p>Menampilkan {filteredStudents.length} dari {students.length} Mahasiswa</p>
              <p>Informasi Nilai Capaian Mata Kuliah Terkini</p>
            </div>
          </div>
        </main>
      </div>

      {/* --- MOCK ROSTER IMPORT DIALOG --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative z-10 animate-toast">
            <h3 className="text-base font-bold text-[#10365c] flex items-center">
              <svg className="w-5 h-5 mr-2 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Data Roster
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Pilih tindakan di bawah ini untuk mensimulasikan proses import roster mahasiswa. Roster baru akan ditambahkan ke tabel secara dinamis.
            </p>

            <div className="mt-5 space-y-3">
              <button
                onClick={handleImportMock}
                className="w-full flex items-center justify-between p-3.5 bg-sky-50 hover:bg-sky-100/80 border border-sky-100 rounded-xl text-left text-xs transition cursor-pointer"
              >
                <div>
                  <p className="font-bold text-[#10365c]">Gunakan File Excel Roster UGM</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Template XLSX default sistem akademik</p>
                </div>
                <Icons.ChevronRight className="text-[#10365c]" />
              </button>

              <button
                onClick={handleImportMock}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-left text-xs transition cursor-pointer"
              >
                <div>
                  <p className="font-bold text-slate-700">Simulasi Import CSV Manual</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Import roster manual berisi NIM & Nama Mahasiswa</p>
                </div>
                <Icons.ChevronRight className="text-slate-600" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3 text-xs">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-bold transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GLOBAL RESET CONFIRM DIALOG --- */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsResetConfirmOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 relative z-10 animate-toast">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-pulse">
              <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-center font-bold text-slate-800 text-sm mt-4">Reset Semua Nilai?</h3>
            <p className="text-center text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
              Tindakan ini akan mengosongkan seluruh nilai Capaian dan Perbaikan untuk semua mahasiswa. Data nilai yang ada akan hilang secara permanen.
            </p>

            <div className="mt-6 flex items-center justify-center space-x-3 text-xs">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleGlobalReset}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold shadow-sm transition cursor-pointer"
              >
                Ya, Reset Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POSTING LOADER OVERLAY MODAL --- */}
      {isPostingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 relative z-10 text-center animate-toast">
            {!postingSuccess ? (
              <>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2.5 h-2.5 bg-[#2c4d75] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2.5 h-2.5 bg-[#2c4d75] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2.5 h-2.5 bg-[#2c4d75] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                <h3 className="font-bold text-slate-700 text-sm mt-4">Memposting Nilai...</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Mengirim data nilai ke portal pusat akademik UNS</p>

                {/* Progress bar container */}
                <div className="mt-5 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#26c6da] h-2 rounded-full transition-all duration-150"
                    style={{ width: `${postingProgress}%` }}
                  />
                </div>
                <span className="inline-block mt-2 text-[10px] text-slate-400 font-bold">{postingProgress}% selesai</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-800 text-sm mt-4">Posting Nilai Sukses!</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
                  Sebanyak {students.length} data nilai mahasiswa telah berhasil disinkronisasi ke Portal SIA UNS. Tanggal posting telah diperbarui.
                </p>
                <button
                  onClick={() => setIsPostingModalOpen(false)}
                  className="mt-5 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Selesai
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
