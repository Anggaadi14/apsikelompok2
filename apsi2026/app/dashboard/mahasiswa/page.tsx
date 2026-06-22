'use client';
// app/dashboard/mahasiswa/page.tsx
//
// PERUBAHAN dari Tahap 2:
//   - cplData, detailCPL TIDAK lagi dari data.ts
//   - Keduanya sekarang di-fetch dari API:
//       GET /api/mahasiswa/cpl → cplData + detailCpl
//   - data.ts tetap ada sebagai fallback jika API gagal (development safety)
//   - Loading state per tab (dashboard, cpl) ditambahkan
//   - <CplView /> sekarang menerima prop `profile` agar kartu profil di tab
//     Report tidak lagi hardcode "Ahmad Fadli / 3.75".
//   - Tab "Riwayat Nilai" dihapus (sudah tercover di tab Detail CPL).

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import ProfileCard from './components/ProfileCard';
import DashboardView from './components/DashboardView';
import CplView from './components/CplView';
// Fallback jika API gagal (hanya untuk development)
import {
  cplData as cplDataFallback,
  detailCPL as detailCPLFallback,
} from './data';
import { Home, Award } from 'lucide-react';
import { UserSession } from '../../data/users';
import { CplDataItem, DetailCplItem } from './data';

// ─────────────────────────────────────────────
// Tipe data dari API
// ─────────────────────────────────────────────
interface ProfileData {
  nim: string;
  nama_mahasiswa: string;
  angkatan: number;
  semester_aktif: number;
  ipk: number;
  prodi: string;
}

type JsPdfWithAutoTable = { lastAutoTable?: { finalY?: number } };

// ─────────────────────────────────────────────
// Komponen loading
// ─────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-bold tracking-wider uppercase mt-4">
          Memverifikasi Sesi...
        </p>
      </div>
    </div>
  );
}

// Loading placeholder untuk konten tab
function TabLoading({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-semibold">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Komponen utama
// ─────────────────────────────────────────────
export default function MahasiswaDashboard() {
  const router = useRouter();

  // State: navigasi
  const [activeTab, setActiveTab]               = useState<'dashboard' | 'cpl'>('dashboard');
  const [selectedSemester, setSelectedSemester] = useState('Ganjil 2024/2025');

  // State: session
  const [sessionUser, setSessionUser]           = useState<UserSession | null>(null);

  // State: data profil (dari Tahap 2)
  const [profile, setProfile]                   = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading]     = useState(false);
  const [profileError, setProfileError]         = useState<string | null>(null);

  // State: daftar semester (dari Tahap 2)
  const [availableSemesters, setAvailableSemesters] = useState<string[]>(['Ganjil 2024/2025']);

  // State: CPL data (BARU di Tahap 3)
  const [cplData, setCplData]                   = useState<CplDataItem[]>(cplDataFallback);
  const [detailCpl, setDetailCpl]               = useState<DetailCplItem[]>(detailCPLFallback);
  const [cplLoading, setCplLoading]             = useState(false);
  const [cplError, setCplError]                 = useState<string | null>(null);

  // ── Auth Guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const rawUser = sessionStorage.getItem('currentUser');
    if (!rawUser) {
      router.push('/');
      return;
    }
    try {
      const userObj = JSON.parse(rawUser) as UserSession;
      if (userObj.role !== 'mahasiswa') {
        router.push(`/dashboard/${userObj.role}`);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSessionUser(userObj);
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  // ── Helper fetch dengan session header ─────────────────────────────────
  const fetchWithSession = useCallback(
    async (url: string) => {
      if (!sessionUser) throw new Error('Session belum tersedia');
      const res = await fetch(url, {
        headers: {
          'X-User-Session': JSON.stringify(sessionUser),
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    [sessionUser]
  );

  // ── Fetch semua data setelah session tersedia ──────────────────────────
  useEffect(() => {
    if (!sessionUser) return;

    // Profile (sama dengan Tahap 2)
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const result = await fetchWithSession('/api/mahasiswa/profile');
        setProfile(result.data as ProfileData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat profil';
        setProfileError(msg);
        console.error('[Dashboard] fetch profile error:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    // Semester (sama dengan Tahap 2)
    const loadSemesters = async () => {
      try {
        const result = await fetchWithSession('/api/mahasiswa/semester');
        const semesters = result.data as string[];
        if (semesters.length > 0) {
          setAvailableSemesters(semesters);
          setSelectedSemester(semesters[0]);
        }
      } catch (err) {
        console.warn('[Dashboard] fetch semester gagal, pakai default:', err);
      }
    };

    // CPL (BARU Tahap 3)
    const loadCpl = async () => {
      setCplLoading(true);
      setCplError(null);
      try {
        const result = await fetchWithSession('/api/mahasiswa/cpl');
        if (result.success && result.data) {
          if (result.data.cplData?.length > 0) {
            setCplData(result.data.cplData);
          }
          if (result.data.detailCpl?.length > 0) {
            setDetailCpl(result.data.detailCpl);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat data CPL';
        setCplError(msg);
        console.error('[Dashboard] fetch CPL error — pakai fallback data.ts:', err);
      } finally {
        setCplLoading(false);
      }
    };

    loadProfile();
    loadSemesters();
    loadCpl();
  }, [sessionUser, fetchWithSession]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    router.push('/');
  };

  const handleDownloadReport = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const displayName  = profile?.nama_mahasiswa ?? sessionUser?.name ?? '-';
    const displayNim   = profile?.nim             ?? sessionUser?.identifier ?? '-';
    const displayProdi = profile?.prodi           ?? 'Teknik Industri UNS';

    const tercapaiCount = cplData.filter((c) => c.status === 'Tercapai').length;
    const belumTercapai = cplData.filter((c) => c.status === 'Belum Tercapai').length;
    const belumDitempuh = cplData.filter((c) => c.status === 'Belum Ditempuh').length;
    const nilaiValid    = cplData.filter((c) => c.nilai > 0);
    const avgCpl        = nilaiValid.length > 0
      ? (nilaiValid.reduce((s, c) => s + c.nilai, 0) / nilaiValid.length).toFixed(1)
      : '0.0';

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SICPL - Portal Mahasiswa', marginX, 16);
    doc.setFontSize(11);
    doc.text('Laporan Capaian Pembelajaran Lulusan (CPL)', marginX, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      marginX,
      29,
    );

    doc.setFontSize(10);
    const profileLines = [
      `Mahasiswa      : ${displayName}`,
      `NIM            : ${displayNim}`,
      `Program Studi  : ${displayProdi}`,
      `Rata-rata CPL  : ${avgCpl}`,
      `Semester Aktif : ${selectedSemester}`,
    ];
    profileLines.forEach((line, i) => doc.text(line, marginX, 38 + i * 5.5));

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Tercapai: ${tercapaiCount}/${cplData.length}   ·   Belum Tercapai: ${belumTercapai}   ·   Belum Ditempuh: ${belumDitempuh}   ·   Rata-rata CPL: ${avgCpl}`,
      marginX,
      68,
    );
    doc.setFont('helvetica', 'normal');

    autoTable(doc, {
      startY: 73,
      margin: { left: marginX, right: marginX },
      head: [['No', 'CPL', 'Deskripsi', 'Kategori', 'Nilai', 'Target', 'Status']],
      body: cplData.map((c, idx) => {
        const description =
          detailCpl.find((d) => d.cpl === c.name)?.deskripsi ??
          'Mampu menerapkan kompetensi rekayasa tingkat lanjut di bidang teknik industri';
        return [idx + 1, c.name, description, c.kategori, c.nilai > 0 ? c.nilai : '-', c.target, c.status];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 16 }, 4: { cellWidth: 14 }, 5: { cellWidth: 14 } },
    });

    let cursorY = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 73) + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Pembentuk Nilai CPL', marginX, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');

    for (const item of detailCpl) {
      if (cursorY > pageHeight - 40) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.cpl} — ${item.status} (${item.nilai > 0 ? item.nilai.toFixed(1) : '-'})`, marginX, cursorY);
      doc.setFont('helvetica', 'normal');
      cursorY += 5;

      const rows: (string | number)[][] = [];
      for (const ikItem of item.ik) {
        ikItem.cpmk.forEach((c, idx) => {
          rows.push([
            idx === 0 ? `${ikItem.kode} (${ikItem.bobot}%)` : '',
            c.kode,
            c.matakuliah,
            c.semester || '-',
            c.nilaiMK,
          ]);
        });
      }

      if (rows.length === 0) {
        doc.setFontSize(9);
        doc.text('Belum ada IK/CPMK pembentuk.', marginX, cursorY);
        cursorY += 8;
        continue;
      }

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['IK/PI', 'CPMK', 'Mata Kuliah', 'Smt', 'Nilai']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: { 3: { cellWidth: 10 }, 4: { cellWidth: 14 } },
      });
      cursorY = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? cursorY) + 8;
    }

    doc.save(`Laporan_CPL_${displayNim}_${String(displayName).replace(/\s+/g, '_')}.pdf`);
  };

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard',  icon: <Home  className="w-5 h-5" /> },
    { id: 'cpl',       label: 'Detail CPL', icon: <Award className="w-5 h-5" /> },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  if (!sessionUser) return <LoadingSpinner />;

  const nilaiCplValid = cplData.filter((c) => c.nilai > 0);
  const rataCpl = nilaiCplValid.length > 0
    ? nilaiCplValid.reduce((sum, cpl) => sum + cpl.nilai, 0) / nilaiCplValid.length
    : 0;

  // Profile yang diteruskan ke CplView (Report tab) — fallback aman ke session
  const cplProfile = {
    nama:  profile?.nama_mahasiswa ?? sessionUser.name,
    nim:   profile?.nim             ?? sessionUser.identifier,
    prodi: profile?.prodi           ?? 'TI UNS',
    ipk:   profile?.ipk             ?? 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
      <Navbar
        portalTitle="SICPL - Portal Mahasiswa"
        prodiLabel={profile?.prodi ?? 'Prodi Teknik Industri UNS'}
        userName={sessionUser.name}
        userNimNip={sessionUser.identifier}
        userInitials={sessionUser.initials}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        availableSemesters={availableSemesters}
        notificationsCount={cplData.filter((c) => c.status === 'Belum Tercapai').length}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={sidebarItems} activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Error banner profil */}
          {profileError && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              ⚠️ Gagal memuat data profil dari server. Menampilkan data dari sesi login.
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-1 text-amber-500">({profileError})</span>
              )}
            </div>
          )}

          {/* Error banner CPL */}
          {cplError && (
            <div className="mb-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
              ⚠️ Data CPL diambil dari sumber fallback (data.ts).
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-1 text-orange-500">({cplError})</span>
              )}
            </div>
          )}

          {/* ProfileCard */}
          <ProfileCard
            name={profile?.nama_mahasiswa ?? sessionUser.name}
            nim={profile?.nim             ?? sessionUser.identifier}
            angkatan={profile?.angkatan   ?? 0}
            semester={profile?.semester_aktif ?? 0}
            rataCpl={rataCpl}
            onDownloadReport={handleDownloadReport}
          />

          {profileLoading && (
            <p className="text-xs text-gray-400 text-center mt-1 mb-2">
              Memuat data profil...
            </p>
          )}

          {/* Tab views */}
          <div className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              cplLoading
                ? <TabLoading message="Menghitung data CPL dari database..." />
                : <DashboardView cplData={cplData} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'cpl' && (
              cplLoading
                ? <TabLoading message="Memuat detail IK dan CPMK..." />
                : <CplView cplData={cplData} detailCplData={detailCpl} profile={cplProfile} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
