'use client';

import { Clock, Bell, User, LogOut } from 'lucide-react';

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
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-transparent border-none outline-none text-sm cursor-pointer text-white"
              >
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem} className="text-slate-800">
                    {sem}
                  </option>
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-extrabold text-sm border border-indigo-500 shadow">
              {userInitials}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <div className="text-sm font-semibold leading-none">{userName}</div>
              <div className="text-[10px] text-indigo-200 mt-1 font-medium">{userNimNip}</div>
            </div>
            <button
              onClick={onLogout}
              className="ml-1 p-2 hover:bg-indigo-700 rounded cursor-pointer transition active:scale-95 text-indigo-200 hover:text-white"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
