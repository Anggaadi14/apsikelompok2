'use client';

import React from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  items: SidebarItem[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  brandFooter?: string;
  copyrightFooter?: string;
}

export default function Sidebar({
  items,
  activeTab,
  setActiveTab,
  brandFooter = 'SISTEM CAPAIAN KELULUSAN',
  copyrightFooter = 'Departemen Teknik Industri © 2026',
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto shrink-0 z-10 flex flex-col justify-between">
      <nav className="py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium tracking-wide transition-all border-l-4 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-300'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-center mt-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{brandFooter}</p>
        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{copyrightFooter}</p>
      </div>
    </aside>
  );
}
