'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar, { type NotifItem } from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { UserSession } from '../../data/users';
import { BookOpen, Users, BarChart3, FileText } from 'lucide-react';
import DosenDashboardView from './components/DosenDashboardView';
import KelasView from './components/KelasView';

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

export default function DosenDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kelas'>('dashboard');
  const [sessionUser, setSessionUser] = useState<UserSession | null>(null);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/dosen/notifikasi', { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) setNotifications((json.data?.items as NotifItem[]) ?? []);
    } catch { /* noop */ }
  }, []);

  const markRead = async (id: number) => {
    setNotifications((prev: NotifItem[]) => prev.map((n: NotifItem) => n.id_notifikasi === id ? { ...n, is_read: true } : n));
    try {
      await fetch('/api/dosen/notifikasi', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id_notifikasi: id }) });
    } catch { /* noop */ }
  };

  const markAllRead = async () => {
    setNotifications((prev: NotifItem[]) => prev.map((n: NotifItem) => ({ ...n, is_read: true })));
    try {
      await fetch('/api/dosen/notifikasi', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ mark_all: true }) });
    } catch { /* noop */ }
  };

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

  useEffect(() => { if (sessionUser) fetchNotifications(); }, [sessionUser, fetchNotifications]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'kelas', label: 'Upload Nilai', icon: <Users className="w-5 h-5" /> },
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
        prodiLabel="Prodi Teknik Industri UNS"
        userName={sessionUser.name}
        userNimNip={sessionUser.identifier}
        userInitials={sessionUser.initials}
        notifications={notifications}
        onNotificationsOpen={fetchNotifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeTab={activeTab}
          setActiveTab={(id: string) => setActiveTab(id as typeof activeTab)}
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
