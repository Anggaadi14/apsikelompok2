'use client';

import { useState } from 'react';
import { 
  Target, CheckCircle2, XCircle, AlertTriangle, 
  FileWarning, Download, Filter, FileText, FileSpreadsheet, Image as ImageIcon,
  CheckSquare, Award, AlertCircle
} from 'lucide-react';

export default function JamuDashboardView() {
  const [filterTahun, setFilterTahun] = useState('2023/2024');
  const [filterSemester, setFilterSemester] = useState('Ganjil');
  const [filterKurikulum, setFilterKurikulum] = useState('2024');
  const [filterAngkatan, setFilterAngkatan] = useState('Semua');
  const [filterMK, setFilterMK] = useState('Semua');
  const [filterCPL, setFilterCPL] = useState('Semua');
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  const stats = [
    {
      label: 'Rata-rata Capaian CPL',
      value: '76.5%',
      target: 'Target: >70%',
      icon: <Target className="w-6 h-6" />,
      color: 'bg-indigo-50 text-indigo-600',
      borderColor: 'border-indigo-200',
    },
    {
      label: 'CPL di Bawah Target',
      value: '2 CPL',
      target: 'CPL-03, CPL-07',
      icon: <XCircle className="w-6 h-6" />,
      color: 'bg-rose-50 text-rose-600',
      borderColor: 'border-rose-200',
    },
    {
      label: 'Kualitas Asesmen',
      value: '94.2%',
      target: 'Kesesuaian Rubrik',
      icon: <CheckSquare className="w-6 h-6" />,
      color: 'bg-emerald-50 text-emerald-600',
      borderColor: 'border-emerald-200',
    },
    {
      label: 'Rekomendasi Mutu Aktif',
      value: '4 Usulan',
      target: 'Tindak Lanjut Kurikulum',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'bg-amber-50 text-amber-600',
      borderColor: 'border-amber-200',
    },
    {
      label: 'Usulan Wording Pending',
      value: '3 Draft',
      target: 'Revisi Taksonomi Bloom',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
  ];

  const targetRealisasiCPL = [
    { id: 'CPL-01', name: 'Sikap & Tata Nilai', target: 70, realisasi: 82 },
    { id: 'CPL-02', name: 'Penguasaan Pengetahuan', target: 70, realisasi: 75 },
    { id: 'CPL-03', name: 'Keterampilan Umum', target: 75, realisasi: 68 }, // di bawah target
    { id: 'CPL-04', name: 'Keterampilan Khusus I', target: 70, realisasi: 78 },
    { id: 'CPL-05', name: 'Keterampilan Khusus II', target: 70, realisasi: 72 },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header & Download */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Evaluasi Penjaminan Mutu</h1>
          <p className="text-gray-600 mt-1">Pemantauan Mutu Pembelajaran, Asesmen OBE, & Evaluasi Wording CPL/IK</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsDownloadOpen(!isDownloadOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Laporan Mutu
          </button>
          
          {isDownloadOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-500" /> Export PDF
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-500" /> Export Excel
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" /> Export Gambar (PNG)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Filter Analisis Mutu</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tahun Ajar</label>
            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full text-sm border-gray-300 rounded-md py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
              <option>2024/2025</option><option>2023/2024</option><option>2022/2023</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Semester</label>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="w-full text-sm border-gray-300 rounded-md py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
              <option>Ganjil</option><option>Genap</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kurikulum</label>
            <select value={filterKurikulum} onChange={e => setFilterKurikulum(e.target.value)} className="w-full text-sm border-gray-300 rounded-md py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
              <option>2024</option><option>2020</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Angkatan</label>
            <select value={filterAngkatan} onChange={e => setFilterAngkatan(e.target.value)} className="w-full text-sm border-gray-300 rounded-md py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
              <option>Semua</option><option>2024</option><option>2023</option><option>2022</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CPL</label>
            <select value={filterCPL} onChange={e => setFilterCPL(e.target.value)} className="w-full text-sm border-gray-300 rounded-md py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
              <option>Semua</option><option>CPL-01</option><option>CPL-02</option><option>CPL-03</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mata Kuliah</label>
            <select value={filterMK} onChange={e => setFilterMK(e.target.value)} className="w-full text-sm border-gray-300 rounded-md py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
              <option>Semua</option><option>Perancangan Sistem</option><option>Ergonomi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className={`border ${stat.borderColor} rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <p className="text-xs font-medium text-gray-500 mt-2 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{stat.target}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warning & Mutu Evaluation Alerts */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 text-rose-800">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Anomali & CPL Kritis (JAMU)</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border border-rose-100 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-900">CPL-03 Keterampilan Umum</span>
                  <span className="text-xs font-semibold text-rose-600">68% vs Target 75%</span>
                </div>
                <p className="text-xs text-gray-500">Capaian di bawah standar minimum penjaminan mutu pada 2 angkatan terakhir.</p>
              </div>
              <div className="bg-white p-3 rounded border border-rose-100 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-900">IK-03.1 (Rumusan Deskriptor)</span>
                  <span className="text-xs font-semibold text-amber-600">Butuh Wording Review</span>
                </div>
                <p className="text-xs text-gray-500">Kata kerja operasional pada IK ini kurang spesifik dan sulit diukur dengan rubrik saat ini.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 text-slate-800">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Temuan Sebaran Nilai</h3>
            </div>
            <div className="space-y-2">
              <div className="bg-white p-3 rounded border border-slate-100 text-xs shadow-sm space-y-1">
                <div className="flex justify-between font-medium text-gray-700">
                  <span>MK Ergonomi (Kelas A)</span>
                  <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Skewed Positif</span>
                </div>
                <p className="text-[11px] text-gray-500">95% Mahasiswa mendapat nilai A. Perlu verifikasi standar rubrik penilaian.</p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-100 text-xs shadow-sm space-y-1">
                <div className="flex justify-between font-medium text-gray-700">
                  <span>MK Perancangan Sistem (Kelas B)</span>
                  <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">Rubrik Tidak Sesuai</span>
                </div>
                <p className="text-[11px] text-gray-500">Pemetaan media asesmen UK-4 ke CPMK tidak memiliki bobot yang konsisten.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Target vs Realisasi Capaian CPL */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Target vs Realisasi Capaian CPL (Analisis Mutu {filterTahun})</h2>
          
          <div className="space-y-6">
            {targetRealisasiCPL.map((cpl, i) => {
              const isWarning = cpl.realisasi < cpl.target;
              return (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{cpl.id}</h4>
                      <p className="text-xs text-gray-500">{cpl.name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${isWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {cpl.realisasi}%
                      </span>
                      <span className="text-xs text-gray-400 font-medium ml-1">/ {cpl.target}% Target</span>
                    </div>
                  </div>
                  
                  <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    {/* Target Line Marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-gray-800 z-10"
                      style={{ left: `${cpl.target}%` }}
                      title={`Target: ${cpl.target}%`}
                    ></div>
                    
                    {/* Realisasi Bar */}
                    <div 
                      className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${cpl.realisasi}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
