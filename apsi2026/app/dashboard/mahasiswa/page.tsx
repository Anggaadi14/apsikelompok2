'use client';
// app/dashboard/mahasiswa/page.tsx
//
// PERUBAHAN dari Tahap 2:
//   - cplData, detailCPL, riwayatNilaiData TIDAK lagi dari data.ts
//   - Ketiganya sekarang di-fetch dari API:
//       GET /api/mahasiswa/cpl     → cplData + detailCpl
//       GET /api/mahasiswa/riwayat → riwayatNilaiData
//   - data.ts tetap ada sebagai fallback jika API gagal (development safety)
//   - Loading state per tab (dashboard, cpl, riwayat) ditambahkan
//
// Yang TIDAK berubah:
//   - ProfileCard, Navbar, Sidebar → sudah konek API di Tahap 2
//   - DashboardView, CplView, RiwayatView → tidak ada perubahan komponen

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import ProfileCard from './components/ProfileCard';
import DashboardView from './components/DashboardView';
import CplView from './components/CplView';
import RiwayatView from './components/RiwayatView';
// Fallback jika API gagal (hanya untuk development)
import { cplData as cplDataFallback, detailCPL as detailCPLFallback, riwayatNilaiData as riwayatFallback } from './data';
import { Home, Award, BookOpen } from 'lucide-react';
import { UserSession } from '../../data/users';
import { CplDataItem, DetailCplItem, RiwayatNilaiItem } from './data';

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
  const [activeTab, setActiveTab]               = useState<'dashboard' | 'cpl' | 'riwayat'>('dashboard');
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

  // State: riwayat nilai (BARU di Tahap 3)
  const [riwayatData, setRiwayatData]           = useState<RiwayatNilaiItem[]>(riwayatFallback);
  const [riwayatLoading, setRiwayatLoading]     = useState(false);
  const [riwayatError, setRiwayatError]         = useState<string | null>(null);

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
          // Hanya update jika data dari API tidak kosong
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
        // Fallback ke data.ts sudah di-set sebagai initial state
      } finally {
        setCplLoading(false);
      }
    };

    // Riwayat nilai (BARU Tahap 3)
    const loadRiwayat = async () => {
      setRiwayatLoading(true);
      setRiwayatError(null);
      try {
        const result = await fetchWithSession('/api/mahasiswa/riwayat');
        if (result.success && result.data?.length > 0) {
          setRiwayatData(result.data as RiwayatNilaiItem[]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat nilai';
        setRiwayatError(msg);
        console.error('[Dashboard] fetch riwayat error — pakai fallback data.ts:', err);
      } finally {
        setRiwayatLoading(false);
      }
    };

    loadProfile();
    loadSemesters();
    loadCpl();
    loadRiwayat();
  }, [sessionUser, fetchWithSession]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    router.push('/');
  };

  const handleDownloadReport = () => {
    const displayName  = profile?.nama_mahasiswa ?? sessionUser?.name ?? '-';
    const displayNim   = profile?.nim             ?? sessionUser?.identifier ?? '-';
    const displayIpk   = profile?.ipk             ?? 0;
    const displayProdi = profile?.prodi           ?? 'Teknik Industri UNS';

    const tercapaiCount     = cplData.filter((c) => c.status === 'Tercapai').length;
    const belumTercapai     = cplData.filter((c) => c.status === 'Belum Tercapai').length;
    const belumDitempuh     = cplData.filter((c) => c.status === 'Belum Ditempuh').length;
    const nilaiValid        = cplData.filter((c) => c.nilai > 0);
    const avgCpl            = nilaiValid.length > 0
      ? (nilaiValid.reduce((s, c) => s + c.nilai, 0) / nilaiValid.length).toFixed(1)
      : '0.0';

    const reportContent = `SICPL - PORTAL MAHASISWA
=========================
Laporan Capaian Pembelajaran Lulusan (CPL)
Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}

Mahasiswa       : ${displayName}
NIM             : ${displayNim}
Program Studi   : ${displayProdi}
IPK Kumulatif   : ${displayIpk}
Semester Aktif  : ${selectedSemester}

======================================
Ringkasan Capaian CPL
======================================
CPL Tercapai (≥80) : ${tercapaiCount} dari ${cplData.length}
CPL Belum Tercapai : ${belumTercapai}
CPL Belum Ditempuh : ${belumDitempuh}
Rata-rata Nilai CPL: ${avgCpl}
Target Minimum     : 80

======================================
Rincian Nilai CPL
======================================
${cplData.map((c) =>
  `${c.name.padEnd(7)} | ${c.nilai > 0 ? c.nilai.toString().padStart(5) : '  -  '} | ${c.status.toUpperCase().padEnd(17)} | ${c.kategori}`
).join('\n')}

======================================
Catatan:
Nilai CPL dihitung dari kontribusi CPMK melalui Indikator Kinerja (IK)
sesuai kurikulum OBE Prodi Teknik Industri UNS.
======================================
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `Laporan_CPL_${displayNim}_${displayName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard',     icon: <Home    className="w-5 h-5" /> },
    { id: 'cpl',       label: 'Detail CPL',    icon: <Award   className="w-5 h-5" /> },
    { id: 'riwayat',   label: 'Riwayat Nilai', icon: <BookOpen className="w-5 h-5" /> },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  if (!sessionUser) return <LoadingSpinner />;

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
        notificationsCount={cplData.filter(c => c.status === 'Belum Tercapai').length}
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

          {/* Error banner CPL (tidak memblokir halaman) */}
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
            ipk={profile?.ipk             ?? 0}
            onDownloadReport={handleDownloadReport}
          />

          {/* Loading profil kecil */}
          {profileLoading && (
            <p className="text-xs text-gray-400 text-center mt-1 mb-2">
              Memuat data profil...
            </p>
          )}

          {/* Tab views — sekarang pakai data dari API */}
          <div className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              cplLoading
                ? <TabLoading message="Menghitung data CPL dari database..." />
                : <DashboardView cplData={cplData} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'cpl' && (
              cplLoading
                ? <TabLoading message="Memuat detail IK dan CPMK..." />
                : <CplView cplData={cplData} detailCplData={detailCpl} />
            )}
            {activeTab === 'riwayat' && (
              riwayatLoading
                ? <TabLoading message="Memuat transkrip nilai..." />
                : <RiwayatView riwayatNilaiData={riwayatData} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
