'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Clock, Bell, User, LogOut, KeyRound, ChevronDown } from 'lucide-react';

export interface NotifItem {
  id_notifikasi: number;
  judul: string;
  pesan: string;
  is_read: boolean;
  created_at: string;
}

interface NavbarProps {
  portalTitle: string;
  prodiLabel: string;
  userName: string;
  userNimNip: string;
  userInitials: string;
  selectedSemester?: string;
  setSelectedSemester?: (semester: string) => void;
  availableSemesters?: string[];
  notificationsCount?: number;
  notifications?: NotifItem[];
  onNotificationsOpen?: () => void;
  onMarkRead?: (id: number) => void;
  onMarkAllRead?: () => void;
  onLogout: () => void;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Navbar({
  portalTitle,
  prodiLabel,
  userName,
  userNimNip,
  userInitials,
  selectedSemester,
  setSelectedSemester,
  availableSemesters = ['Ganjil 2024/2025', 'Genap 2023/2024'],
  notificationsCount = 0,
  notifications,
  onNotificationsOpen,
  onMarkRead,
  onMarkAllRead,
  onLogout,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const hasNotifFeed = notifications !== undefined;
  const unreadCount = hasNotifFeed ? notifications!.filter((n) => !n.is_read).length : notificationsCount;

  useEffect(() => {
    if (!open && !notifOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setNotifOpen(false); } };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, notifOpen]);

  const toggleNotif = () => {
    if (!hasNotifFeed) return;
    setNotifOpen((v) => {
      const next = !v;
      if (next) onNotificationsOpen?.();
      return next;
    });
  };

  return (
    <header className="bg-indigo-800 text-white shadow-md z-30 shrink-0">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">{portalTitle}</h1>
          <span className="text-sm text-indigo-200 hidden sm:inline border-l border-indigo-700 pl-4">{prodiLabel}</span>
        </div>
        <div className="flex items-center gap-4">
          {selectedSemester && setSelectedSemester && (
            <div className="flex items-center gap-2 bg-indigo-700 px-4 py-2 rounded">
              <Clock className="w-4 h-4" />
              <select
                value={selectedSemester}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedSemester(e.target.value)}
                className="bg-transparent border-none outline-none text-sm cursor-pointer text-white"
              >
                {availableSemesters.map((sem: string) => (
                  <option key={sem} value={sem} className="text-slate-800">{sem}</option>
                ))}
              </select>
            </div>
          )}
          <div ref={notifRef} className="relative">
            <button
              onClick={toggleNotif}
              className="relative p-2 hover:bg-indigo-700 rounded cursor-pointer transition active:scale-95"
              aria-label="Notifications"
              aria-haspopup={hasNotifFeed ? 'menu' : undefined}
              aria-expanded={hasNotifFeed ? notifOpen : undefined}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-indigo-800" />
              )}
            </button>

            {hasNotifFeed && notifOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
                  {unreadCount > 0 && onMarkAllRead && (
                    <button onClick={onMarkAllRead} className="text-xs text-indigo-600 font-medium hover:text-indigo-800">
                      Tandai semua dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                  {(notifications ?? []).length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">Tidak ada notifikasi.</div>
                  ) : (
                    notifications!.map((n: NotifItem) => (
                      <button
                        key={n.id_notifikasi}
                        onClick={() => !n.is_read && onMarkRead?.(n.id_notifikasi)}
                        className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-indigo-50/40' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />}
                          <div className={n.is_read ? 'pl-3.5' : ''}>
                            <p className="text-sm font-medium text-gray-900">{n.judul}</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.pesan}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setOpen((v: boolean) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-indigo-700 rounded-full cursor-pointer transition active:scale-95"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-extrabold text-sm border border-indigo-500 shadow">{userInitials}</div>
              <div className="hidden md:flex flex-col text-left">
                <div className="text-sm font-semibold leading-none">{userName}</div>
                <div className="text-[10px] text-indigo-200 mt-1 font-medium">{userNimNip}</div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-200 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div role="menu" className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                  <p className="text-[11px] text-gray-500 truncate">{userNimNip}</p>
                </div>
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700">
                  <User className="w-4 h-4" /> Profil Saya
                </Link>
                <Link href="/change-password" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700">
                  <KeyRound className="w-4 h-4" /> Ubah Password
                </Link>
                <div className="border-t border-gray-100" />
                <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}