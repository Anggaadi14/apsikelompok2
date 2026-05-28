'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import ProfileCard from './components/ProfileCard';
import DashboardView from './components/DashboardView';
import CplView from './components/CplView';
import RiwayatView from './components/RiwayatView';
import { cplData, detailCPL, riwayatNilaiData } from './data';
import { Home, Award, BookOpen } from 'lucide-react';
import { UserSession } from '../../data/users';

export default function MahasiswaDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cpl' | 'riwayat'>('dashboard');
  const [selectedSemester, setSelectedSemester] = useState('Ganjil 2024/2025');
  const [sessionUser, setSessionUser] = useState<UserSession | null>(null);

  // Auth Guard check
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
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { id: 'cpl', label: 'Detail CPL', icon: <Award className="w-5 h-5" /> },
    { id: 'riwayat', label: 'Riwayat Nilai', icon: <BookOpen className="w-5 h-5" /> },
  ];

  // Simulation handlers
  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    router.push('/');
  };

  const handleDownloadReport = () => {
    // Generate text/plain representation of the CPL Report
    const tercapaiCount = cplData.filter((c) => c.status === 'Tercapai').length;
    const reportContent = `SICPL - PORTAL MAHASISWA
=========================
Laporan Capaian Pembelajaran Lulusan (CPL)

Mahasiswa       : ${sessionUser?.name}
NIM             : ${sessionUser?.identifier}
Prodi           : Teknik Industri UNS
IPK Kumulatif   : 3.75
Semester Aktif  : ${selectedSemester}

Ringkasan Capaian CPL:
- Tercapai (>=80): ${tercapaiCount} dari ${cplData.length}
- Target Kelulusan Minimum: 80

Rincian Nilai CPL:
${cplData.map((c) => `- ${c.name}: ${c.nilai > 0 ? c.nilai : 'Belum Ditempuh'} (${c.status.toUpperCase()})`).join('\n')}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_CPL_${sessionUser?.identifier}_${sessionUser?.name?.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 font-bold tracking-wider uppercase mt-4">Memverifikasi Sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
      {/* Shared generic Navbar */}
      <Navbar
        portalTitle="SICPL - Portal Mahasiswa"
        prodiLabel="Prodi Teknik Industri UNS"
        userName={sessionUser.name}
        userNimNip={sessionUser.identifier}
        userInitials={sessionUser.initials}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        availableSemesters={['Ganjil 2024/2025', 'Genap 2023/2024']}
        notificationsCount={1}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Aside Drawer navigation */}
        <Sidebar items={sidebarItems} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Scrollable primary content layout */}
        <main className="flex-1 overflow-y-auto p-6">
          <ProfileCard
            name={sessionUser.name}
            nim={sessionUser.identifier}
            angkatan={2020}
            semester={5}
            ipk={3.75}
            onDownloadReport={handleDownloadReport}
          />

          <div className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              <DashboardView cplData={cplData} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'cpl' && (
              <CplView cplData={cplData} detailCplData={detailCPL} />
            )}
            {activeTab === 'riwayat' && (
              <RiwayatView riwayatNilaiData={riwayatNilaiData} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
