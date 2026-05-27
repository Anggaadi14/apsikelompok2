"use client";

import React from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { DashboardLayout } from "@/app/components/DashboardLayout";

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout
        title="Admin Dashboard"
        subtitle="Kelola seluruh sistem APSI"
      >
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Stats Cards */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Total Pengguna
              </p>
              <p className="text-3xl font-bold text-blue-900">1,245</p>
              <p className="text-xs text-blue-700 mt-2">↑ 12% bulan ini</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Program Studi
              </p>
              <p className="text-3xl font-bold text-green-900">18</p>
              <p className="text-xs text-green-700 mt-2">Aktif</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Mata Kuliah
              </p>
              <p className="text-3xl font-bold text-purple-900">342</p>
              <p className="text-xs text-purple-700 mt-2">Terdaftar</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <p className="text-gray-600 text-sm font-medium mb-2">
                Transaksi Hari Ini
              </p>
              <p className="text-3xl font-bold text-orange-900">127</p>
              <p className="text-xs text-orange-700 mt-2">Aktif</p>
            </div>
          </div>

          {/* Admin Options */}
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Kelola Sistem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Manajemen Pengguna</p>
              <p className="text-sm text-gray-600 mt-1">
                Tambah, edit, atau hapus pengguna sistem
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Pengaturan Sistem</p>
              <p className="text-sm text-gray-600 mt-1">
                Konfigurasi parameter dan setting global
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Laporan Sistem</p>
              <p className="text-sm text-gray-600 mt-1">
                Lihat laporan aktivitas dan log sistem
              </p>
            </button>
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:shadow-lg transition text-left">
              <p className="font-semibold text-gray-900">Backup & Restore</p>
              <p className="text-sm text-gray-600 mt-1">
                Kelola backup data dan restore sistem
              </p>
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
