'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { UserSession } from '../../data/users';
import { BookOpen, Users, BarChart3, FileText } from 'lucide-react';
import DosenDashboardView from './components/DosenDashboardView';
import KelasView from './components/KelasView';

export default function DosenDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kelas'>('dashboard');
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
      if (userObj.role !== 'dosen') {
        router.push(`/dashboard/${userObj.role}`);
      } else {
        setSessionUser(userObj);
      }
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'kelas', label: 'Kelola Kelas', icon: <Users className="w-5 h-5" /> },
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
      <Navbar
        portalTitle="SICPL - Portal Dosen"
        userName={sessionUser.name}
        userRole="Dosen"
        userInitials={sessionUser.initials}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as typeof activeTab)}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {activeTab === 'dashboard' && <DosenDashboardView sessionUser={sessionUser} />}
            {activeTab === 'kelas' && <KelasView sessionUser={sessionUser} />}
          </div>
        </main>
      </div>
    </div>
  );
}
