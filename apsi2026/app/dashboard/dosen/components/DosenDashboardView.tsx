'use client';

import { UserSession } from '../../../data/users';
import { BookOpen, Users, FileText, BarChart3 } from 'lucide-react';

interface DosenDashboardViewProps {
  sessionUser: UserSession;
}

export default function DosenDashboardView({ sessionUser }: DosenDashboardViewProps) {
  const stats = [
    {
      label: 'Total Kelas',
      value: '5',
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Total Mahasiswa',
      value: '120',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-50 text-green-600',
      borderColor: 'border-green-200',
    },
    {
      label: 'Tugas Terdistribusi',
      value: '12',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      label: 'Nilai Tercatat',
      value: '98%',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'bg-orange-50 text-orange-600',
      borderColor: 'border-orange-200',
    },
  ];

  const recentActivities = [
    { date: '25 May 2026', activity: 'Input nilai untuk kelas TI-2024-A' },
    { date: '24 May 2026', activity: 'Membuat assessment untuk CPL' },
    { date: '23 May 2026', activity: 'Upload materi kuliah minggu 14' },
    { date: '22 May 2026', activity: 'Review tugas dari mahasiswa' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Dosen</h1>
        <p className="text-gray-600 mt-1">Selamat datang, {sessionUser.name}</p>
        <p className="text-sm text-gray-500">Program Studi: {sessionUser.prodi}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`border-2 ${stat.borderColor} rounded-lg p-6 bg-white`}
          >
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <p className="text-xs text-gray-500 font-medium">{activity.date}</p>
                <p className="text-sm text-gray-900 mt-1">{activity.activity}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Distribusi Kelas</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Teori</span>
                <span className="text-sm font-semibold text-gray-900">3 kelas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Praktik</span>
                <span className="text-sm font-semibold text-gray-900">2 kelas</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Deadline Terdekat</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Input Nilai Akhir</span>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">3 hari</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Upload Materi</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">5 hari</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
