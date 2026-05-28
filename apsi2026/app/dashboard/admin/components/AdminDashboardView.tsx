'use client';

import { UserSession } from '../../../data/users';
import { Users, BookOpen, BarChart3, Shield, Database, AlertCircle } from 'lucide-react';

interface AdminDashboardViewProps {
  sessionUser: UserSession;
}

export default function AdminDashboardView({ sessionUser }: AdminDashboardViewProps) {
  const stats = [
    {
      label: 'Total User',
      value: '487',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Program Studi',
      value: '12',
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-green-50 text-green-600',
      borderColor: 'border-green-200',
    },
    {
      label: 'Aktivitas Hari Ini',
      value: '342',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      label: 'System Health',
      value: '99.9%',
      icon: <Shield className="w-6 h-6" />,
      color: 'bg-orange-50 text-orange-600',
      borderColor: 'border-orange-200',
    },
  ];

  const systemLogs = [
    {
      timestamp: '2026-05-28 14:35:22',
      level: 'INFO',
      message: 'User login successful - mahasiswa (I0320045)',
    },
    {
      timestamp: '2026-05-28 14:30:15',
      level: 'INFO',
      message: 'Data export requested by kaprodi (197508212002121003)',
    },
    {
      timestamp: '2026-05-28 14:25:40',
      level: 'SUCCESS',
      message: 'Database backup completed successfully',
    },
    {
      timestamp: '2026-05-28 14:20:08',
      level: 'WARNING',
      message: 'High memory usage detected (78%)',
    },
    {
      timestamp: '2026-05-28 14:15:33',
      level: 'INFO',
      message: 'New user registration - dosen (Dr. Siti Aminah)',
    },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-blue-600 bg-blue-50';
      case 'SUCCESS':
        return 'text-green-600 bg-green-50';
      case 'WARNING':
        return 'text-orange-600 bg-orange-50';
      case 'ERROR':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Selamat datang, {sessionUser.name}</p>
        <p className="text-sm text-gray-500">Status Sistem: Semua layanan berjalan normal</p>
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

      {/* System Logs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">System Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Timestamp</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Level</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Message</th>
              </tr>
            </thead>
            <tbody>
              {systemLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-600 font-mono">{log.timestamp}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              → Backup Database
            </button>
            <button className="w-full px-4 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              → Generate Reports
            </button>
            <button className="w-full px-4 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              → System Settings
            </button>
            <button className="w-full px-4 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              → View Audit Logs
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last Backup</span>
              <span className="text-sm font-semibold text-gray-900">2 hours ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database Size</span>
              <span className="text-sm font-semibold text-gray-900">2.4 GB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Server Uptime</span>
              <span className="text-sm font-semibold text-gray-900">45 days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Requests</span>
              <span className="text-sm font-semibold text-gray-900">15.2K/day</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
