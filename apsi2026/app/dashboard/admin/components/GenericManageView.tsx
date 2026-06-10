'use client';

import { UserSession } from '../../../data/users';
import { Settings, AlertCircle } from 'lucide-react';

interface GenericManageViewProps {
  sessionUser: UserSession;
  title: string;
  description: string;
}

export default function GenericManageView({ sessionUser, title, description }: GenericManageViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Modul {title} Sedang Dikembangkan</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Halaman ini disiapkan untuk fungsionalitas pengelolaan data master terkait {title.toLowerCase()}.
        </p>
        
        <div className="mt-8 flex justify-center">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Fitur ini akan segera tersedia di versi berikutnya.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
