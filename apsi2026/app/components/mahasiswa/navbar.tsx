"use client";

import { Bell, Clock, LogOut, User } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

interface NavbarProps {
  selectedSemester: string;
  onSemesterChange: (v: string) => void;
  onLogout: () => void;
}

export function Navbar({
  selectedSemester,
  onSemesterChange,
  onLogout,
}: NavbarProps) {
  const { user } = useAuth();

  return (
    <header className="bg-indigo-800 text-white shadow-md">
      <div className="px-6 py-4 flex items-center justify-between">

        {/* Kiri */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl">SICPL - Portal Mahasiswa</h1>
          <span className="text-sm text-indigo-200">
            Prodi {user?.prodi ?? "Tidak diketahui"}
          </span>
        </div>

        {/* Kanan */}
        <div className="flex items-center gap-4">

          {/* Semester */}
          <div className="flex items-center gap-2 bg-indigo-700 px-4 py-2 rounded">
            <Clock className="w-4 h-4" />
            <select
              value={selectedSemester}
              onChange={(e) => onSemesterChange(e.target.value)}
              className="bg-transparent border-none outline-none text-sm cursor-pointer"
            >
              <option value="Ganjil 2024/2025">Ganjil 2024/2025</option>
              <option value="Genap 2023/2024">Genap 2023/2024</option>
            </select>
          </div>

          {/* Notifikasi */}
          <button className="relative p-2 hover:bg-indigo-700 rounded">
            <Bell className="w-5 h-5" />
          </button>

          {/* USER INFO (FIXED) */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>

            <div className="leading-tight">
              <div className="text-sm font-medium">
                {user?.name ?? "-"}
              </div>

              <div className="text-xs text-indigo-200">
                {user?.nim ?? "-"}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="ml-2 p-2 hover:bg-indigo-700 rounded"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}