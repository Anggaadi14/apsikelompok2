'use client';

import { useState } from 'react';
import {
  User,
  LogOut,
  Home,
  Award,
  BookOpen,
  Bell,
  Clock,
  TrendingUp,
  CheckCircle,
  Download,
  ChevronDown,
  ChevronRight,
  XCircle,
  MinusCircle,
  ArrowUpDown,
  Search,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';

export default function DashboardMahasiswa() {
  const [selectedSemester, setSelectedSemester] = useState('Ganjil 2024/2025');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedCPL, setExpandedCPL] = useState<number | null>(null);
  const [cplSubTab, setCplSubTab] = useState('grafik');
  const [sortBy, setSortBy] = useState<'semester' | 'nama' | 'nilai' | 'huruf'>('semester');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [searchMK, setSearchMK] = useState('');

  const handleLogout = () => {
    window.location.href = '/login';
  };

  const cplData = [
    { name: 'CPL-1', nilai: 85, target: 80, status: 'Tercapai', kategori: 'Pengetahuan' },
    { name: 'CPL-2', nilai: 78, target: 80, status: 'Belum Tercapai', kategori: 'Keterampilan Khusus' },
    { name: 'CPL-3', nilai: 92, target: 80, status: 'Tercapai', kategori: 'Keterampilan Umum' },
    { name: 'CPL-4', nilai: 88, target: 80, status: 'Tercapai', kategori: 'Pengetahuan' },
    { name: 'CPL-5', nilai: 75, target: 80, status: 'Belum Tercapai', kategori: 'Keterampilan Khusus' },
    { name: 'CPL-6', nilai: 90, target: 80, status: 'Tercapai', kategori: 'Sikap' },
    { name: 'CPL-7', nilai: 0, target: 80, status: 'Belum Ditempuh', kategori: 'Keterampilan Umum' },
    { name: 'CPL-8', nilai: 86, target: 80, status: 'Tercapai', kategori: 'Pengetahuan' },
    { name: 'CPL-9', nilai: 0, target: 80, status: 'Belum Ditempuh', kategori: 'Sikap' },
    { name: 'CPL-10', nilai: 83, target: 80, status: 'Tercapai', kategori: 'Keterampilan Khusus' },
  ];

  const radarData = cplData.map(cpl => ({
    subject: cpl.name,
    nilai: cpl.nilai,
    target: cpl.target,
  }));

  const riwayatNilaiData = [
    { no: 1, semester: 1, kode: 'BIO3303', nama: 'Fisika Teknik Industri', sks: 2, uk1: 0, uk2: 50, uk3: 50, uk4: 0, uk5: 0, nilaiAkhir: 71.9, skala100: 71.9, huruf: 'B' },
    { no: 2, semester: 1, kode: 'BIO3304', nama: 'Praktikum Fisika Industri', sks: 1, uk1: 0, uk2: 45, uk3: 45, uk4: 0, uk5: 0, nilaiAkhir: 67.6, skala100: 67.6, huruf: 'B' },
    { no: 3, semester: 2, kode: 'TI03001', nama: 'KALKULUS', sks: 3, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80.2, skala100: 80.2, huruf: 'B+' },
    { no: 4, semester: 3, kode: 'TI03005', nama: 'MEKANIKA TEKNIK', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
    { no: 5, semester: 5, kode: 'TI-301', nama: 'Sistem Produksi', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 88, skala100: 88, huruf: 'A' },
  ];

  const getFilteredAndSortedData = () => {
    let filtered = [...riwayatNilaiData];
    if (filterSemester !== 'all') {
      filtered = filtered.filter(item => item.semester === parseInt(filterSemester));
    }
    if (searchMK) {
      filtered = filtered.filter(item =>
        item.nama.toLowerCase().includes(searchMK.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchMK.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'semester') comparison = a.semester - b.semester;
      else if (sortBy === 'nama') comparison = a.nama.localeCompare(b.nama);
      else if (sortBy === 'nilai') comparison = a.nilaiAkhir - b.nilaiAkhir;
      else if (sortBy === 'huruf') comparison = a.huruf.localeCompare(b.huruf);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return filtered;
  };

  const filteredData = getFilteredAndSortedData();

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Navbar */}
      <header className="bg-indigo-800 text-white shadow-md">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl">SICPL - Portal Mahasiswa</h1>
          <div className="flex items-center gap-4">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-indigo-700 text-white text-sm px-4 py-2 rounded border-none outline-none cursor-pointer"
            >
              <option>Ganjil 2024/2025</option>
              <option>Genap 2023/2024</option>
            </select>
            <Bell className="w-5 h-5 cursor-pointer" />
            <button onClick={handleLogout} className="p-2 hover:bg-indigo-700 rounded">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200">
          <nav className="py-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-6 py-3 ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : 'text-gray-700'}`}
            >
              <Home className="w-5 h-5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('cpl')}
              className={`w-full flex items-center gap-3 px-6 py-3 ${activeTab === 'cpl' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : 'text-gray-700'}`}
            >
              <Award className="w-5 h-5" /> Detail CPL
            </button>
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`w-full flex items-center gap-3 px-6 py-3 ${activeTab === 'riwayat' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : 'text-gray-700'}`}
            >
              <BookOpen className="w-5 h-5" /> Riwayat Nilai
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <p className="text-sm text-gray-600">CPL Tercapai</p>
                  <p className="text-3xl mt-2">{cplData.filter(c => c.status === 'Tercapai').length}/10</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <p className="text-sm text-gray-600">Belum Tercapai</p>
                  <p className="text-3xl mt-2">{cplData.filter(c => c.status === 'Belum Tercapai').length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <p className="text-sm text-gray-600">Belum Ditempuh</p>
                  <p className="text-3xl mt-2">{cplData.filter(c => c.status === 'Belum Ditempuh').length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <p className="text-sm text-gray-600">Rata-rata CPL</p>
                  <p className="text-3xl mt-2">{Math.round(cplData.filter(c => c.nilai > 0).reduce((a, c) => a + c.nilai, 0) / cplData.filter(c => c.nilai > 0).length)}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg mb-4">Grafik Capaian CPL 1-10</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={cplData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <ReferenceLine y={80} stroke="#dc2626" strokeWidth={2} />
                    <Bar dataKey="nilai" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Detail CPL Tab */}
          {activeTab === 'cpl' && (
            <div>
              <h2 className="text-2xl mb-6">Monitoring Capaian CPL</h2>

              {/* Sub Tabs untuk Detail CPL */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="border-b border-gray-200 flex">
                  <button
                    onClick={() => setCplSubTab('grafik')}
                    className={`px-6 py-3 text-sm font-semibold border-b-2 ${cplSubTab === 'grafik' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600'}`}
                  >
                    Grafik CPL
                  </button>
                  <button
                    onClick={() => setCplSubTab('lk')}
                    className={`px-6 py-3 text-sm font-semibold border-b-2 ${cplSubTab === 'lk' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600'}`}
                  >
                    Grafik LK
                  </button>
                  <button
                    onClick={() => setCplSubTab('report')}
                    className={`px-6 py-3 text-sm font-semibold border-b-2 ${cplSubTab === 'report' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600'}`}
                  >
                    Report Tabel
                  </button>
                </div>

                <div className="p-6">
                  {/* TAB 1: Grafik CPL */}
                  {cplSubTab === 'grafik' && (
                    <div className="space-y-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm mb-4">Bar Chart CPL 1-10</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={cplData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <ReferenceLine y={80} stroke="#dc2626" strokeWidth={2} label="Target: 80" />
                            <Bar dataKey="nilai" fill="#6366f1" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm mb-4">Radar Chart - Capaian CPL</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis domain={[0, 100]} />
                            <Radar name="Nilai Saya" dataKey="nilai" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                            <Radar name="Target" dataKey="target" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                            <Legend />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm">CPL Tercapai</p>
                          <p className="text-3xl text-green-600">{cplData.filter(c => c.status === 'Tercapai').length}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <p className="text-sm">Belum Tercapai</p>
                          <p className="text-3xl text-red-600">{cplData.filter(c => c.status === 'Belum Tercapai').length}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-sm">Belum Ditempuh</p>
                          <p className="text-3xl text-gray-600">{cplData.filter(c => c.status === 'Belum Ditempuh').length}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Grafik LK */}
                  {cplSubTab === 'lk' && (
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <p className="text-blue-800"><strong>Grafik LK</strong></p>
                      <p className="text-sm text-blue-700 mt-2">Menampilkan detail capaian per CPL dengan breakdown IK dan CPMK.</p>
                      <p className="text-sm text-blue-700 mt-4">Sub-tab ini menunjukkan visualisasi Indikator Kinerja (IK) dan Capaian Pembelajaran Mata Kuliah (CPMK) untuk setiap CPL dengan grafik dan tabel detail.</p>
                    </div>
                  )}

                  {/* TAB 3: Report Tabel */}
                  {cplSubTab === 'report' && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg">Report Tabel - Monitoring CPL Individu</h3>
                        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          <Download className="w-4 h-4" />
                          Export Excel
                        </button>
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left py-3 px-4 text-xs">No</th>
                              <th className="text-left py-3 px-4 text-xs">CPL</th>
                              <th className="text-left py-3 px-4 text-xs">Deskripsi</th>
                              <th className="text-center py-3 px-4 text-xs">Nilai</th>
                              <th className="text-center py-3 px-4 text-xs">Target</th>
                              <th className="text-center py-3 px-4 text-xs">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {cplData.map((cpl, idx) => (
                              <tr key={idx} className={cpl.status === 'Tercapai' ? 'bg-green-50' : cpl.status === 'Belum Tercapai' ? 'bg-red-50' : 'bg-gray-50'}>
                                <td className="py-3 px-4">{idx + 1}</td>
                                <td className="py-3 px-4 font-semibold">{cpl.name}</td>
                                <td className="py-3 px-4 text-xs">Capaian Pembelajaran</td>
                                <td className="text-center py-3 px-4">{cpl.nilai > 0 ? cpl.nilai : '-'}</td>
                                <td className="text-center py-3 px-4">{cpl.target}</td>
                                <td className="text-center py-3 px-4">
                                  <span className={`px-3 py-1 rounded text-xs font-semibold ${cpl.status === 'Tercapai' ? 'bg-green-600 text-white' : cpl.status === 'Belum Tercapai' ? 'bg-red-600 text-white' : 'bg-gray-400 text-white'}`}>
                                    {cpl.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Riwayat Nilai Tab */}
          {activeTab === 'riwayat' && (
            <div>
              <h2 className="text-2xl mb-6">Riwayat Nilai</h2>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
                <div className="flex gap-4 items-center">
                  <input
                    type="text"
                    placeholder="Cari nama atau kode..."
                    value={searchMK}
                    onChange={(e) => setSearchMK(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="all">Semua Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="5">Semester 5</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="py-2 px-3 text-center">No</th>
                        <th className="py-2 px-3 text-center">Sem</th>
                        <th className="py-2 px-3">Kode</th>
                        <th className="py-2 px-3">Nama Mata Kuliah</th>
                        <th className="py-2 px-3 text-center">SKS</th>
                        <th className="py-2 px-3 text-center">Nilai Akhir</th>
                        <th className="py-2 px-3 text-center">Skala 100</th>
                        <th className="py-2 px-3 text-center">Huruf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredData.map((item, idx) => (
                        <tr key={item.no} className="hover:bg-gray-50">
                          <td className="py-2 px-3 text-center">{idx + 1}</td>
                          <td className="py-2 px-3 text-center">{item.semester}</td>
                          <td className="py-2 px-3">{item.kode}</td>
                          <td className="py-2 px-3">{item.nama}</td>
                          <td className="py-2 px-3 text-center">{item.sks}</td>
                          <td className="py-2 px-3 text-center">{item.nilaiAkhir.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">{item.skala100.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-[9px] font-semibold ${item.huruf.startsWith('A') ? 'bg-green-100 text-green-700' : item.huruf.startsWith('B') ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {item.huruf}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
