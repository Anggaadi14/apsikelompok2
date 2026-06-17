'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Clock, Bell, User, LogOut, KeyRound, ChevronDown } from 'lucide-react';

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
  onLogout: () => void;
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
  onLogout,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

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
          <button
            onClick={() => {}}
            className="relative p-2 hover:bg-indigo-700 rounded cursor-pointer transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-indigo-800" />
            )}
          </button>

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