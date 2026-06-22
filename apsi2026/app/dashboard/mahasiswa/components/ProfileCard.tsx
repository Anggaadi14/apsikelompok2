'use client';

import { User, Download } from 'lucide-react';

interface ProfileCardProps {
  name: string;
  nim: string;
  angkatan: number;
  semester: number;
  rataCpl: number;
  onDownloadReport?: () => void;
}

export default function ProfileCard({
  name,
  nim,
  angkatan,
  semester,
  rataCpl,
  onDownloadReport,
}: ProfileCardProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl shadow-md mb-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-xl -translate-y-6 translate-x-6 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full filter blur-lg translate-y-6 -translate-x-6 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-white/20 shadow-inner shrink-0">
            <User className="w-12 h-12 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">{name}</h2>
            <p className="text-indigo-100 text-sm font-medium">NIM: {nim}</p>
            <p className="text-indigo-200 text-xs mt-1">
              Angkatan {angkatan} &bull; Semester {semester}
            </p>
          </div>
        </div>
        <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-4">
          <div className="text-left sm:text-right">
            <p className="text-xs text-indigo-200 uppercase tracking-wider font-bold">Rata-rata CPL</p>
            <p className="text-4xl font-extrabold tracking-tight mt-0.5">{rataCpl.toFixed(1)}</p>
          </div>
          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm font-semibold shadow transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
