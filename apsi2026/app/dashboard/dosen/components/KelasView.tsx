'use client';

import { UserSession } from '../../../data/users';
import { Search, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface KelasViewProps {
  sessionUser: UserSession;
}

export default function KelasView({ sessionUser }: KelasViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const kelasData = [
    {
      kode: 'TI-2024-A',
      nama: 'Analisis Sistem Industri',
      sks: 3,
      mahasiswa: 35,
      nilai_rata: 3.6,
      semester: 6,
    },
    {
      kode: 'TI-2024-B',
      nama: 'Desain Sistem Industri',
      sks: 3,
      mahasiswa: 32,
      nilai_rata: 3.55,
      semester: 6,
    },
    {
      kode: 'TI-2023-A',
      nama: 'Operations Research',
      sks: 3,
      mahasiswa: 28,
      nilai_rata: 3.45,
      semester: 4,
    },
    {
      kode: 'TI-2023-LAB',
      nama: 'Lab Operations Research',
      sks: 1,
      mahasiswa: 28,
      nilai_rata: 3.5,
      semester: 4,
    },
    {
      kode: 'TI-2022-A',
      nama: 'Metode Kuantitatif Lanjutan',
      sks: 3,
      mahasiswa: 25,
      nilai_rata: 3.65,
      semester: 2,
    },
  ];

  const filteredKelas = kelasData.filter(
    (k) =>
      k.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.kode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kelola Kelas</h1>
        <p className="text-gray-600 mt-1">Mengelola semua kelas yang diajar</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan kode atau nama kelas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Kelas Cards */}
      <div className="space-y-3">
        {filteredKelas.length > 0 ? (
          filteredKelas.map((kelas, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{kelas.nama}</h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                      {kelas.kode}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Semester {kelas.semester} • {kelas.sks} SKS
                  </p>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Mahasiswa</p>
                      <p className="text-lg font-bold text-gray-900">{kelas.mahasiswa}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Rata-rata Nilai</p>
                      <p className="text-lg font-bold text-gray-900">{kelas.nilai_rata}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Total SKS</p>
                      <p className="text-lg font-bold text-gray-900">{kelas.sks}</p>
                    </div>
                  </div>
                </div>

                <button className="text-gray-400 hover:text-gray-600">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  Kelola Nilai
                </button>
                <button className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  Presensi
                </button>
                <button className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  Materi
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Tidak ada kelas yang ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}
