'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { UserSession } from '../../data/users';
import { Users, Settings, Database, Shield } from 'lucide-react';
import AdminDashboardView from './components/AdminDashboardView';
import UserManagementView from './components/UserManagementView';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users'>('dashboard');
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
    { id: 'dashboard', label: 'Dashboard', icon: <Database className="w-5 h-5" /> },
    { id: 'users', label: 'Manajemen User', icon: <Users className="w-5 h-5" /> },
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
        portalTitle="SICPL - Admin Panel"
        userName={sessionUser.name}
        userRole="Administrator"
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
            {activeTab === 'dashboard' && <AdminDashboardView sessionUser={sessionUser} />}
            {activeTab === 'users' && <UserManagementView sessionUser={sessionUser} />}
          </div>
        </main>
      </div>
    </div>
  );
}
