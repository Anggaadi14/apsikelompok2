'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { RiwayatNilaiItem } from '../data';

interface RiwayatViewProps {
  riwayatNilaiData: RiwayatNilaiItem[];
}

export default function RiwayatView({ riwayatNilaiData }: RiwayatViewProps) {
  const [searchMK, setSearchMK] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [sortBy, setSortBy] = useState('no-asc');
  const [isExporting, setIsExporting] = useState(false);

  // Filter & Sort Logic
  const getFilteredData = () => {
    let data = [...riwayatNilaiData];

    // Search filter
    if (searchMK.trim() !== '') {
      const query = searchMK.toLowerCase();
      data = data.filter(
        (item) =>
          item.kode.toLowerCase().includes(query) || item.nama.toLowerCase().includes(query)
      );
    }

    // Semester filter
    if (filterSemester !== 'all') {
      data = data.filter((item) => item.semester.toString() === filterSemester);
    }

    // Sorting
    data.sort((a, b) => {
      if (sortBy === 'no-asc') return a.no - b.no;
      if (sortBy === 'no-desc') return b.no - a.no;
      if (sortBy === 'sks-desc') return b.sks - a.sks;
      if (sortBy === 'nilai-desc') return b.nilaiAkhir - a.nilaiAkhir;
      return 0;
    });

    return data;
  };

  const filteredData = getFilteredData();

  // Summary Metrics
  const totalSKS = filteredData.reduce((acc, curr) => acc + curr.sks, 0);
  const totalPoints = filteredData.reduce((acc, curr) => {
    let indexValue = 0;
    if (curr.huruf === 'A') indexValue = 4.0;
    else if (curr.huruf === 'A-') indexValue = 3.7;
    else if (curr.huruf === 'B+') indexValue = 3.3;
    else if (curr.huruf === 'B') indexValue = 3.0;
    else if (curr.huruf === 'B-') indexValue = 2.7;
    else if (curr.huruf === 'C+') indexValue = 2.3;
    else if (curr.huruf === 'C') indexValue = 2.0;
    else if (curr.huruf === 'D') indexValue = 1.0;
    
    return acc + indexValue * curr.sks;
  }, 0);
  const calculatedGPA = totalSKS > 0 ? (totalPoints / totalSKS).toFixed(2) : '0.00';

  // Export CSV Simulation
  const handleExportCSV = () => {
    if (isExporting) return;
    setIsExporting(true);

    setTimeout(() => {
      setIsExporting(false);
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'No,Semester,Kode MK,Nama Mata Kuliah,SKS,UK1,UK2,UK3,UK4,UK5,Nilai Akhir,Skala 100,Huruf\n';

      filteredData.forEach((row) => {
        const rowData = [
          row.no,
          row.semester,
          row.kode,
          row.nama,
          row.sks,
          row.uk1,
          row.uk2,
          row.uk3,
          row.uk4,
          row.uk5,
          row.nilaiAkhir.toFixed(2),
          row.skala100.toFixed(2),
          row.huruf,
        ].join(',');
        csvContent += rowData + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Transkrip_CPL_Mahasiswa.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1000);
  };

  // Grade badge styling based on value
  const getGradeBadgeStyle = (letter: string) => {
    switch (letter) {
      case 'A':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'A-':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'B+':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'B':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'B-':
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'C+':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'C':
        return 'bg-orange-50 text-orange-700 border border-orange-100';
      default:
        return 'bg-rose-50 text-rose-700 border border-rose-100';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Transkrip Nilai Akademik</h2>
          <p className="text-xs text-gray-500 mt-0.5">Daftar lengkap perolehan evaluasi mata kuliah per semester</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-sm shadow hover:shadow-md transition active:scale-95 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      {/* Filter widgets */}
      <div className="bg-white p-4 rounded-xl shadow border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pencarian Mata Kuliah</label>
          <input
            type="text"
            value={searchMK}
            onChange={(e) => setSearchMK(e.target.value)}
            placeholder="Cari Kode atau Nama MK..."
            className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-slate-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Filter Semester</label>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-slate-700 bg-white"
          >
            <option value="all">Semua Semester</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Urutkan Berdasarkan</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-slate-700 bg-white"
          >
            <option value="no-asc">Nomor (Terlama)</option>
            <option value="no-desc">Nomor (Terbaru)</option>
            <option value="sks-desc">SKS Terbesar</option>
            <option value="nilai-desc">Nilai Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Calculated Transcript Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total MK Terfilter</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{filteredData.length}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total SKS Terfilter</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{totalSKS}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">IP Semester Terfilter</p>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">{calculatedGPA}</p>
        </div>
      </div>

      {/* Transcript Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[900px]">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-500 w-12 text-center">No</th>
                <th className="py-3 px-4 font-bold text-slate-500 w-16 text-center">Smt</th>
                <th className="py-3 px-4 font-bold text-slate-500 w-24">Kode MK</th>
                <th className="py-3 px-4 font-bold text-slate-500">Nama Mata Kuliah</th>
                <th className="py-3 px-4 font-bold text-slate-500 w-16 text-center">SKS</th>
                <th className="py-3 px-3 font-bold text-slate-500 w-12 text-center bg-slate-100/30">UK1</th>
                <th className="py-3 px-3 font-bold text-slate-500 w-12 text-center bg-slate-100/30">UK2</th>
                <th className="py-3 px-3 font-bold text-slate-500 w-12 text-center bg-slate-100/30">UK3</th>
                <th className="py-3 px-3 font-bold text-slate-500 w-12 text-center bg-slate-100/30">UK4</th>
                <th className="py-3 px-3 font-bold text-slate-500 w-12 text-center bg-slate-100/30">UK5</th>
                <th className="py-3 px-4 font-bold text-slate-500 w-24 text-center">Akhir</th>
                <th className="py-3 px-4 font-bold text-slate-500 w-24 text-center">Skala 100</th>
                <th className="py-3 px-4 font-bold text-slate-500 w-20 text-center">Huruf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">{row.semester}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-900">{row.kode}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{row.nama}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{row.sks}</td>
                    <td className="py-3 px-3 text-center text-slate-600 bg-slate-50/30">{row.uk1}</td>
                    <td className="py-3 px-3 text-center text-slate-600 bg-slate-50/30">{row.uk2}</td>
                    <td className="py-3 px-3 text-center text-slate-600 bg-slate-50/30">{row.uk3}</td>
                    <td className="py-3 px-3 text-center text-slate-600 bg-slate-50/30">{row.uk4}</td>
                    <td className="py-3 px-3 text-center text-slate-600 bg-slate-50/30">{row.uk5}</td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-800 text-sm">
                      {row.nilaiAkhir.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-500">
                      {row.skala100.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center align-middle">
                      <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-extrabold text-center w-12 ${getGradeBadgeStyle(row.huruf)}`}>
                        {row.huruf}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-8 px-4 text-center text-gray-500 font-semibold italic">
                    Tidak ada mata kuliah yang cocok dengan kriteria pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
