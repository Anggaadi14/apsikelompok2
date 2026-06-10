'use client';

import { UserSession } from '../../../data/users';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface UploadDataMasterViewProps {
  sessionUser: UserSession;
}

export default function UploadDataMasterView({ sessionUser }: UploadDataMasterViewProps) {
  const [selectedType, setSelectedType] = useState('mahasiswa');
  
  const uploadTypes = [
    { id: 'mahasiswa', label: 'Data Mahasiswa', desc: 'Upload daftar mahasiswa aktif' },
    { id: 'dosen', label: 'Data Dosen', desc: 'Upload daftar dosen pengajar' },
    { id: 'matkul', label: 'Mata Kuliah', desc: 'Upload kurikulum dan daftar mata kuliah' },
    { id: 'cpl_ik_cpmk', label: 'CPL, IK & CPMK', desc: 'Upload master data CPL, IK, dan CPMK' },
    { id: 'kelas_tayang', label: 'Kelas Tayang', desc: 'Upload data kelas yang tayang semester ini' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Data Master</h1>
        <p className="text-gray-600 mt-1">Fasilitas unggah massal untuk memperbarui data akademik sistem.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Sidebar: Select Data Type */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-fit">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Pilih Jenis Data</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {uploadTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full text-left p-4 transition-colors ${
                  selectedType === type.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`w-5 h-5 ${selectedType === type.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-medium ${selectedType === type.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content: Upload Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Template Download */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Download Template</h3>
            <p className="text-sm text-gray-600 mb-4">
              Gunakan template Excel standar untuk menghindari error saat proses upload data.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              Download Template {uploadTypes.find(t => t.id === selectedType)?.label}
            </button>
          </div>

          {/* Upload Box */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Upload File</h3>
            <p className="text-sm text-gray-600 mb-6">
              Pilih file Excel (.xlsx atau .xls) yang sudah diisi sesuai format template.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-indigo-400 transition-colors cursor-pointer group">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Klik untuk memilih file</p>
              <p className="text-xs text-gray-500">atau drag and drop file ke area ini</p>
              <p className="text-xs text-gray-400 mt-4">Maksimal ukuran file: 10MB</p>
            </div>

            {/* Validation Info (Static Demo) */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Catatan Penting</h4>
                <ul className="mt-1 text-xs text-blue-800 list-disc list-inside space-y-1">
                  <li>Pastikan tidak ada duplikasi data (contoh: NIM / NIP yang sama).</li>
                  <li>Data yang sudah ada dalam sistem akan di-update (ditimpa) jika kunci primary sama.</li>
                  <li>Proses upload mungkin memakan waktu beberapa menit tergantung ukuran file.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Mulai Proses Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
