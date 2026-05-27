"use client";

import { useAuth } from "@/app/context/AuthContext";


interface DashboardTabProps {
  onNavigateToCpl: () => void;
}

export function DashboardTab({ onNavigateToCpl }: DashboardTabProps) {
  const { user } = useAuth()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl shadow">
            <p className="text-gray-500">IPK</p>
            <h2 className="text-2xl font-bold">
            {user?.ipk ?? "-"}
            </h2>
        </div>

        <div className="p-4 bg-white rounded-xl shadow">
            <p className="text-gray-500">SKS Lulus</p>
            <h2 className="text-2xl font-bold">
            {user?.semester ? user.semester * 18 : "-"}
            </h2>
        </div>

         <div className="p-4 bg-white rounded-xl shadow">
            <p className="text-gray-500">Semester</p>
            <h2 className="text-2xl font-bold">
            {user?.semester ?? "-"}
            </h2>
        </div>
      </div>

      <button
        onClick={onNavigateToCpl}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Lihat CPL
      </button>
    </div>
  );
}