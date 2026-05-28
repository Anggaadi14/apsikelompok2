'use client';

import { UserSession } from '../../../data/users';
import { Search, Download } from 'lucide-react';
import { useState } from 'react';

interface MahasiswaListViewProps {
  sessionUser: UserSession;
}

export default function MahasiswaListView({ sessionUser }: MahasiswaListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const mahasiswaList = [
    {
      nim: 'I0320045',
      nama: 'Ahmad Fadli',
      angkatan: 2020,
      ipk: 3.75,
      semester: 8,
      status: 'Aktif',
    },
    {
      nim: 'I0320046',
      nama: 'Siti Nurhaliza',
      angkatan: 2020,
      ipk: 3.82,
      semester: 8,
      status: 'Aktif',
    },
    {
      nim: 'I0320047',
      nama: 'Budi Santoso',
      angkatan: 2020,
      ipk: 3.45,
      semester: 8,
      status: 'Aktif',
    },
    {
      nim: 'I0321001',
      nama: 'Dewi Kusuma',
      angkatan: 2021,
      ipk: 3.65,
      semester: 6,
      status: 'Aktif',
    },
    {
      nim: 'I0321002',
      nama: 'Ricky Hermawan',
      angkatan: 2021,
      ipk: 3.55,
      semester: 6,
      status: 'Aktif',
    },
    {
      nim: 'I0322001',
      nama: 'Maya Puspita',
      angkatan: 2022,
      ipk: 3.72,
      semester: 4,
      status: 'Aktif',
    },
  ];

  const filteredMahasiswa = mahasiswaList.filter(
    (m) =>
      m.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nim.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportData = () => {
    const csvContent = [
      ['NIM', 'Nama', 'Angkatan', 'IPK', 'Semester', 'Status'],
      ...filteredMahasiswa.map((m) => [
        m.nim,
        m.nama,
        m.angkatan,
        m.ipk,
        m.semester,
        m.status,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_mahasiswa_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Mahasiswa</h1>
        <p className="text-gray-600 mt-1">Mengelola data mahasiswa {sessionUser.prodi}</p>
      </div>

      {/* Search & Export */}
      <div className="flex gap-4 items-end">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan NIM atau Nama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">NIM</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Angkatan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">IPK</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Semester</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMahasiswa.length > 0 ? (
                filteredMahasiswa.map((mhs, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">{mhs.nim}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{mhs.nama}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{mhs.angkatan}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                        {mhs.ipk}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">{mhs.semester}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <span className="inline-block px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                        {mhs.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data mahasiswa yang ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Mahasiswa</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filteredMahasiswa.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Rata-rata IPK</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(
              filteredMahasiswa.reduce((sum, m) => sum + m.ipk, 0) / filteredMahasiswa.length
            ).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Rata-rata Semester</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(
              filteredMahasiswa.reduce((sum, m) => sum + m.semester, 0) / filteredMahasiswa.length
            ).toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}
