'use client';

import { UserSession } from '../../../data/users';
import { Users, BookOpen, FileCheck, CheckSquare, XCircle, FileText, Upload, Filter, UserCheck, Download } from 'lucide-react';
import { useState } from 'react';

interface AdminDashboardViewProps {
  sessionUser: UserSession;
}

export default function AdminDashboardView({ sessionUser }: AdminDashboardViewProps) {
  const [filterTahun, setFilterTahun] = useState('2025/2026');
  const [filterSemester, setFilterSemester] = useState('Ganjil');
  const [filterKurikulum, setFilterKurikulum] = useState('2024');

  const stats = [
    {
      label: 'Data Mahasiswa',
      value: '1,248',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Data Dosen',
      value: '84',
      icon: <UserCheck className="w-6 h-6" />,
      color: 'bg-indigo-50 text-indigo-600',
      borderColor: 'border-indigo-200',
    },
    {
      label: 'Data CPL/IK/CPMK',
      value: '432',
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-green-50 text-green-600',
      borderColor: 'border-green-200',
    },
    {
      label: 'Mata Kuliah Tayang',
      value: '56',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      label: 'Upload Nilai Masuk',
      value: '38/56',
      icon: <CheckSquare className="w-6 h-6" />,
      color: 'bg-teal-50 text-teal-600',
      borderColor: 'border-teal-200',
    },
    {
      label: 'Data Belum Lengkap',
      value: '12',
      icon: <XCircle className="w-6 h-6" />,
      color: 'bg-red-50 text-red-600',
      borderColor: 'border-red-200',
    },
  ];

  const systemLogs = [
    {
      timestamp: 'Hari ini, 14:35',
      level: 'INFO',
      message: 'Dosen Dr. Siti Aminah upload nilai MK Pemodelan Sistem (TIE301)',
    },
    {
      timestamp: 'Hari ini, 14:10',
      level: 'ERROR',
      message: 'Upload nilai ditolak karena kode kelas (A2) tidak sesuai dengan jadwal',
    },
    {
      timestamp: 'Hari ini, 13:45',
      level: 'SUCCESS',
      message: 'Admin memperbarui mapping CPMK-IK untuk MK Ergonomi',
    },
    {
      timestamp: 'Hari ini, 11:20',
      level: 'INFO',
      message: 'Kaprodi mengunduh report CPL angkatan 2023',
    },
    {
      timestamp: 'Hari ini, 09:15',
      level: 'SUCCESS',
      message: 'Data mahasiswa baru angkatan 2025 berhasil disinkronisasi',
    },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-blue-600 bg-blue-50 border border-blue-200';
      case 'SUCCESS':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'WARNING':
        return 'text-orange-600 bg-orange-50 border border-orange-200';
      case 'ERROR':
        return 'text-red-600 bg-red-50 border border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Selamat datang, {sessionUser.name}</p>
          <p className="text-sm text-gray-500">Ringkasan data akademik Program Studi</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option>2025/2026</option>
            <option>2024/2025</option>
            <option>2023/2024</option>
          </select>
          <select 
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option>Ganjil</option>
            <option>Genap</option>
          </select>
          <select 
            value={filterKurikulum}
            onChange={(e) => setFilterKurikulum(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option>2024</option>
            <option>2020</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`border ${stat.borderColor} rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Logs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Aktivitas Sistem Akademik</h2>
            </div>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800">Lihat Semua</button>
          </div>
          <div className="p-0">
            <div className="divide-y divide-gray-100">
              {systemLogs.map((log, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 flex items-start gap-4 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    <span className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${
                      log.level === 'INFO' ? 'bg-blue-500' : 
                      log.level === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{log.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-fit">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Upload Data Mahasiswa</span>
              <Upload className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
            </button>
            <button className="w-full flex items-center justify-between p-3 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Upload Data CPL/IK/CPMK</span>
              <Upload className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
            </button>
            <button className="w-full flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Kelola Kelas Tayang</span>
              <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button className="w-full flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Validasi Upload Nilai</span>
              <CheckSquare className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button className="w-full flex items-center justify-between p-3 border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 rounded-lg transition-colors group mt-4">
              <span className="text-sm font-medium">Download Template Master</span>
              <Download className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
