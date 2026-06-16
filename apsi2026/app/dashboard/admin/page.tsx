'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { UserSession } from '../../data/users';
import {
  Users, Database, LayoutDashboard, Target,
  CheckSquare, ListChecks, BookOpen, MonitorPlay,
  GitMerge, Scale, UploadCloud
} from 'lucide-react';
import AdminDashboardView from './components/AdminDashboardView';
import UserManagementView from './components/UserManagementView';
import UploadDataMasterView from './components/UploadDataMasterView';
import GenericManageView from './components/GenericManageView';
import CplManagementView from './components/CplManagementView';
import IkManagementView from './components/IkManagementView';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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
      if (userObj.role !== 'admin') {
        router.push(`/dashboard/${userObj.role}`);
      } else {
        setSessionUser(userObj);
      }
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'users', label: 'Manajemen User', icon: <Users className="w-5 h-5" /> },
    { id: 'upload', label: 'Upload Data Master', icon: <UploadCloud className="w-5 h-5" /> },
    { id: 'cpl', label: 'Kelola CPL', icon: <Target className="w-5 h-5" /> },
    { id: 'ik', label: 'Kelola IK', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'cpmk', label: 'Kelola CPMK', icon: <ListChecks className="w-5 h-5" /> },
    { id: 'matkul', label: 'Kelola Mata Kuliah', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'kelas', label: 'Kelola Kelas Tayang', icon: <MonitorPlay className="w-5 h-5" /> },
    { id: 'mapping', label: 'Mapping CPMK-IK', icon: <GitMerge className="w-5 h-5" /> },
    { id: 'bobot', label: 'Kelola Bobot', icon: <Scale className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    router.push('/');
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardView sessionUser={sessionUser} />;
      case 'users':
        return <UserManagementView sessionUser={sessionUser} />;
      case 'upload':
        return <UploadDataMasterView sessionUser={sessionUser} />;
      case 'cpl':
        return <CplManagementView sessionUser={sessionUser} />;
      case 'ik':
        return <IkManagementView sessionUser={sessionUser} />;
      case 'cpmk':
        return <GenericManageView sessionUser={sessionUser} title="Kelola CPMK" description="Manajemen Capaian Pembelajaran Mata Kuliah (CPMK)" />;
      case 'matkul':
        return <GenericManageView sessionUser={sessionUser} title="Kelola Mata Kuliah" description="Manajemen Data Mata Kuliah dan Kurikulum" />;
      case 'kelas':
        return <GenericManageView sessionUser={sessionUser} title="Kelola Kelas Tayang" description="Manajemen Pembukaan Kelas per Semester" />;
      case 'mapping':
        return <GenericManageView sessionUser={sessionUser} title="Mapping CPMK-IK-CPL" description="Pemetaan hubungan antara CPMK, IK, dan CPL" />;
      case 'bobot':
        return <GenericManageView sessionUser={sessionUser} title="Kelola Bobot" description="Manajemen Bobot Evaluasi dan Penilaian" />;
      default:
        return <AdminDashboardView sessionUser={sessionUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
      <Navbar
        portalTitle="SICPL - Admin Panel"
        prodiLabel="Pusat Data Akademik UNS"
        userName={sessionUser.name}
        userNimNip={sessionUser.identifier}
        userInitials={sessionUser.initials}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}