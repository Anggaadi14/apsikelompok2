"use client";

import { Download, User } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

export function ProfileCard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg mb-6">
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-indigo-600" />
          </div>

          <div>
            <h2 className="text-2xl mb-1">{user.name}</h2>
            <p className="text-indigo-100">NIM: {user.nim ?? "-"}</p>
            <p className="text-indigo-100">
              Angkatan {user.angkatan ?? "-"} - Semester {user.semester ?? "-"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="mb-4">
            <p className="text-sm text-indigo-100 mb-1">IPK</p>
            <p className="text-4xl">{user.ipk ?? "-"}</p>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm">
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>

      </div>
    </div>
  );
}