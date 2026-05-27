"use client";

import React from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { DashboardLayout } from "@/app/components/DashboardLayout";

export default function KaprodiDashboard() {
  return (
    <ProtectedRoute allowedRoles={["kaprodi"]}>
      <DashboardLayout
        title="Dashboard Ketua Program Studi"
        subtitle="Kelola program studi dan data akademik"
      >
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Stats Cards */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Total Mahasiswa
              </p>
              <p className="text-3xl font-bold text-blue-900">842</p>
              <p className="text-xs text-blue-700 mt-2">Semester Ganjil 2024/2025</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Dosen Aktif
              </p>
              <p className="text-3xl font-bold text-green-900">45</p>
              <p className="text-xs text-green-700 mt-2">Mengajar</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                CPL Tercapai (Rata-rata)
              </p>
              <p className="text-3xl font-bold text-purple-900">73%</p>
              <p className="text-xs text-purple-700 mt-2">Target 80%</p>
            </div>
          </div>

          {/* Kaprodi Functions */}
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Fungsi Kaprodi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Kelola Kurikulum</p>
              <p className="text-sm text-gray-600 mt-1">
                Atur CPL, RPS, dan struktur mata kuliah
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Monitoring Nilai</p>
              <p className="text-sm text-gray-600 mt-1">
                Lihat rekapitulasi nilai mahasiswa
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Approasi Perubahan</p>
              <p className="text-sm text-gray-600 mt-1">
                Verifikasi perubahan data akademik
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Laporan Akreditasi</p>
              <p className="text-sm text-gray-600 mt-1">
                Generate laporan untuk akreditasi program
              </p>
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
