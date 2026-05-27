"use client";

import React from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { DashboardLayout } from "@/app/components/DashboardLayout";

export default function DosenDashboard() {
  return (
    <ProtectedRoute allowedRoles={["dosen"]}>
      <DashboardLayout
        title="Dashboard Dosen"
        subtitle="Kelola kelas dan penilaian mahasiswa"
      >
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Stats Cards */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Kelas Aktif
              </p>
              <p className="text-3xl font-bold text-blue-900">6</p>
              <p className="text-xs text-blue-700 mt-2">Sedang mengajar</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Total Mahasiswa
              </p>
              <p className="text-3xl font-bold text-green-900">187</p>
              <p className="text-xs text-green-700 mt-2">Keseluruhan kelas</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Penilaian Tertunda
              </p>
              <p className="text-3xl font-bold text-orange-900">23</p>
              <p className="text-xs text-orange-700 mt-2">Segera input</p>
            </div>
          </div>

          {/* Dosen Functions */}
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Manajemen Pembelajaran
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Kelola Kelas</p>
              <p className="text-sm text-gray-600 mt-1">
                Lihat daftar mahasiswa dan materi pembelajaran
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Input Nilai</p>
              <p className="text-sm text-gray-600 mt-1">
                Masukkan nilai UTS, UAS, dan komponen lainnya
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Mapping CPL</p>
              <p className="text-sm text-gray-600 mt-1">
                Kelola pemetaan CPL untuk setiap mata kuliah
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Laporan Pembelajaran</p>
              <p className="text-sm text-gray-600 mt-1">
                Generate laporan prestasi mahasiswa
              </p>
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
