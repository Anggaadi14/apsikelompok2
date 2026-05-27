// app/components/mahasiswa/Sidebar.tsx

import { Award, BookOpen, Home } from 'lucide-react';
import type { TabType } from './types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems: { tab: TabType; label: string; icon: React.ReactNode }[] = [
  { tab: 'dashboard', label: 'Dashboard',    icon: <Home    className="w-5 h-5" /> },
  { tab: 'cpl',       label: 'Detail CPL',   icon: <Award   className="w-5 h-5" /> },
  { tab: 'riwayat',   label: 'Riwayat Nilai',icon: <BookOpen className="w-5 h-5" /> },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="py-4">
        <ul className="space-y-1">
          {navItems.map(({ tab, label, icon }) => (
            <li key={tab}>
              <button
                onClick={() => onTabChange(tab)}
                className={`w-full flex items-center gap-3 px-6 py-3 border-l-4 ${
                  activeTab === tab
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-300'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}