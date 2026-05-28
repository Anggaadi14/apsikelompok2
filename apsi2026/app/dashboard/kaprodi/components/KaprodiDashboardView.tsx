'use client';

import { UserSession } from '../../../data/users';
import { TrendingUp, Users, Award, BookOpen } from 'lucide-react';

interface KaprodiDashboardViewProps {
  sessionUser: UserSession;
}

export default function KaprodiDashboardView({ sessionUser }: KaprodiDashboardViewProps) {
  const stats = [
    {
      label: 'Total Mahasiswa',
      value: '245',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Rata-rata IPK',
      value: '3.45',
      icon: <Award className="w-6 h-6" />,
      color: 'bg-green-50 text-green-600',
      borderColor: 'border-green-200',
    },
    {
      label: 'Lulus Tepat Waktu',
      value: '92%',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      label: 'Total MataKuliah',
      value: '48',
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-orange-50 text-orange-600',
      borderColor: 'border-orange-200',
    },
  ];

  const performanceData = [
    { semester: 'Ganjil 2023/2024', mahasiswa: 60, lulus: 56, rata_ipk: 3.42 },
    { semester: 'Genap 2023/2024', mahasiswa: 65, lulus: 62, rata_ipk: 3.48 },
    { semester: 'Ganjil 2024/2025', mahasiswa: 120, lulus: 110, rata_ipk: 3.45 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Kaprodi</h1>
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

      {/* Performance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Performa Akademik Per Semester</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Semester</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mahasiswa</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lulus</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rata-rata IPK</th>
              </tr>
            </thead>
            <tbody>
              {performanceData.map((data, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">{data.semester}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{data.mahasiswa}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{data.lulus}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{data.rata_ipk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
