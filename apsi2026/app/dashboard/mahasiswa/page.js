'use client';
"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardMahasiswa;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var recharts_1 = require("recharts");
var navigation_1 = require("next/navigation");
function DashboardMahasiswa() {
    var router = (0, navigation_1.useRouter)();
    var _a = (0, react_1.useState)('Ganjil 2024/2025'), selectedSemester = _a[0], setSelectedSemester = _a[1];
    var _b = (0, react_1.useState)('dashboard'), activeTab = _b[0], setActiveTab = _b[1];
    var _c = (0, react_1.useState)(null), expandedCPL = _c[0], setExpandedCPL = _c[1];
    var _d = (0, react_1.useState)('grafik'), cplSubTab = _d[0], setCplSubTab = _d[1];
    var _e = (0, react_1.useState)('semester'), sortBy = _e[0], setSortBy = _e[1];
    var _f = (0, react_1.useState)('asc'), sortOrder = _f[0], setSortOrder = _f[1];
    var _g = (0, react_1.useState)('all'), filterSemester = _g[0], setFilterSemester = _g[1];
    var _h = (0, react_1.useState)(''), searchMK = _h[0], setSearchMK = _h[1];
    var handleLogout = function () {
        router.push('/login');
    };
    var cplData = [
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
    var radarData = cplData.map(function (cpl) { return ({
        subject: cpl.name,
        nilai: cpl.nilai,
        target: cpl.target,
    }); });
    var detailCPL = [
        {
            cpl: 'CPL-1',
            deskripsi: 'Mampu menerapkan pengetahuan matematika, sains, dan teknik industri',
            nilai: 85,
            status: 'Tercapai',
            ik: [
                {
                    kode: 'IK-1.1',
                    deskripsi: 'Memahami konsep dasar matematika teknik',
                    bobot: 50,
                    nilai: 87,
                    cpmk: [
                        {
                            kode: 'CPMK-1.1',
                            deskripsi: 'Mahasiswa mampu menjelaskan konsep probabilitas',
                            bobot: 40,
                            nilai: 85,
                            matakuliah: 'Statistika Industri (TI2101)',
                            semester: 3,
                            nilaiMK: 'A'
                        },
                        {
                            kode: 'CPMK-1.2',
                            deskripsi: 'Mahasiswa mampu menghitung distribusi probabilitas',
                            bobot: 60,
                            nilai: 88,
                            matakuliah: 'Statistika Industri (TI2101)',
                            semester: 3,
                            nilaiMK: 'A'
                        }
                    ]
                },
                {
                    kode: 'IK-1.2',
                    deskripsi: 'Menerapkan metode statistika dalam analisis data',
                    bobot: 50,
                    nilai: 83,
                    cpmk: [
                        {
                            kode: 'CPMK-2.1',
                            deskripsi: 'Mahasiswa mampu melakukan uji hipotesis',
                            bobot: 100,
                            nilai: 83,
                            matakuliah: 'Statistika Industri (TI2101)',
                            semester: 3,
                            nilaiMK: 'A'
                        }
                    ]
                }
            ]
        },
        {
            cpl: 'CPL-2',
            deskripsi: 'Mampu merancang sistem terintegrasi dengan mempertimbangkan aspek teknis dan ekonomis',
            nilai: 78,
            status: 'Belum Tercapai',
            ik: [
                {
                    kode: 'IK-2.1',
                    deskripsi: 'Merancang sistem produksi yang efisien',
                    bobot: 100,
                    nilai: 78,
                    cpmk: [
                        {
                            kode: 'CPMK-3.1',
                            deskripsi: 'Mahasiswa mampu merancang tata letak pabrik',
                            bobot: 50,
                            nilai: 75,
                            matakuliah: 'Perancangan Tata Letak Pabrik (TI2102)',
                            semester: 4,
                            nilaiMK: 'B+'
                        },
                        {
                            kode: 'CPMK-3.2',
                            deskripsi: 'Mahasiswa mampu menganalisis aliran material',
                            bobot: 50,
                            nilai: 80,
                            matakuliah: 'Perancangan Tata Letak Pabrik (TI2102)',
                            semester: 4,
                            nilaiMK: 'B+'
                        }
                    ]
                }
            ]
        },
        {
            cpl: 'CPL-7',
            deskripsi: 'Mampu berkomunikasi efektif dalam tim multidisiplin',
            nilai: 0,
            status: 'Belum Ditempuh',
            ik: [
                {
                    kode: 'IK-7.1',
                    deskripsi: 'Berkomunikasi lisan dan tertulis dengan efektif',
                    bobot: 100,
                    nilai: 0,
                    cpmk: [
                        {
                            kode: 'CPMK-7.1',
                            deskripsi: 'Mahasiswa mampu mempresentasikan hasil kerja',
                            bobot: 100,
                            nilai: 0,
                            matakuliah: 'Kerja Praktek (TI3501)',
                            semester: 7,
                            nilaiMK: '-'
                        }
                    ]
                }
            ]
        }
    ];
    var mataKuliahData = [
        { semester: 'Semester 5', kode: 'TI-301', nama: 'Sistem Produksi', sks: 3, nilai: 'A', nilaiAngka: 88 },
        { semester: 'Semester 5', kode: 'TI-305', nama: 'Ergonomi', sks: 3, nilai: 'B+', nilaiAngka: 82 },
        { semester: 'Semester 5', kode: 'TI-308', nama: 'Pengendalian Kualitas', sks: 3, nilai: 'A-', nilaiAngka: 85 },
    ];
    var riwayatNilaiData = [
        { no: 1, semester: 1, kode: 'BIO3303', nama: 'Fisika Teknik Industri', sks: 2, uk1: 0, uk2: 50, uk3: 50, uk4: 0, uk5: 0, nilaiAkhir: 71.9, skala100: 71.9, huruf: 'B' },
        { no: 2, semester: 1, kode: 'BIO3304', nama: 'Praktikum Fisika Industri', sks: 1, uk1: 0, uk2: 45, uk3: 45, uk4: 0, uk5: 0, nilaiAkhir: 67.6, skala100: 67.6, huruf: 'B' },
        { no: 3, semester: 1, kode: 'BIO3305', nama: 'Kimia Dasar', sks: 2, uk1: 0, uk2: 55, uk3: 55, uk4: 0, uk5: 0, nilaiAkhir: 84.1, skala100: 84.1, huruf: 'A-' },
        { no: 4, semester: 1, kode: 'BIO3306', nama: 'Praktikum Kimia Dasar', sks: 1, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 89.2, skala100: 89.2, huruf: 'A' },
        { no: 5, semester: 2, kode: 'TI03001', nama: 'KALKULUS', sks: 3, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80.2, skala100: 80.2, huruf: 'B+' },
        { no: 6, semester: 2, kode: 'TI03002', nama: 'STATISTIKA DASAR', sks: 3, uk1: 0, uk2: 58, uk3: 58, uk4: 0, uk5: 0, nilaiAkhir: 88.1, skala100: 88.1, huruf: 'B+' },
        { no: 7, semester: 2, kode: 'TI03003', nama: 'GAMBAR TEKNIK', sks: 2, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90.37, skala100: 90.37, huruf: 'A-' },
        { no: 8, semester: 3, kode: 'TI03004', nama: 'ILMU BAHAN TEKNIK', sks: 2, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80, skala100: 80, huruf: 'B+' },
        { no: 9, semester: 3, kode: 'TI03005', nama: 'MEKANIKA TEKNIK', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
        { no: 10, semester: 3, kode: 'TI03006', nama: 'PEMROGRAMAN KOMPUTER (MATLAB/PYTHON)', sks: 2, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
        { no: 11, semester: 3, kode: 'TI03007', nama: 'STATISTIKA INDUSTRI 1', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
        { no: 12, semester: 4, kode: 'TI03008', nama: 'SISTEM INFORMASI PERUSAHAAN TERINTEGRASI', sks: 2, uk1: 0, uk2: 52, uk3: 52, uk4: 0, uk5: 0, nilaiAkhir: 80, skala100: 80, huruf: 'B+' },
        { no: 13, semester: 4, kode: 'TI03009', nama: 'SISTEM MANAJEMEN KUALITAS INDUSTRI', sks: 3, uk1: 0, uk2: 55, uk3: 55, uk4: 0, uk5: 0, nilaiAkhir: 85, skala100: 85, huruf: 'A-' },
        { no: 14, semester: 4, kode: 'TI03010', nama: 'ELEMEN MESIN', sks: 2, uk1: 0, uk2: 48, uk3: 48, uk4: 0, uk5: 0, nilaiAkhir: 75, skala100: 75, huruf: 'B' },
        { no: 15, semester: 4, kode: 'TI03011', nama: 'PERANCANGAN SISTEM KERJA & ERGONOMI', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
        { no: 16, semester: 5, kode: 'TI03012', nama: 'OTOMASI SISTEM PRODUKSI', sks: 2, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 90, skala100: 90, huruf: 'A' },
        { no: 17, semester: 5, kode: 'TI-301', nama: 'Sistem Produksi', sks: 3, uk1: 0, uk2: 60, uk3: 60, uk4: 0, uk5: 0, nilaiAkhir: 88, skala100: 88, huruf: 'A' },
        { no: 18, semester: 5, kode: 'TI-305', nama: 'Ergonomi', sks: 3, uk1: 0, uk2: 54, uk3: 54, uk4: 0, uk5: 0, nilaiAkhir: 82, skala100: 82, huruf: 'B+' },
        { no: 19, semester: 5, kode: 'TI-308', nama: 'Pengendalian Kualitas', sks: 3, uk1: 0, uk2: 56, uk3: 56, uk4: 0, uk5: 0, nilaiAkhir: 85, skala100: 85, huruf: 'A-' },
    ];
    var getFilteredAndSortedData = function () {
        var filtered = __spreadArray([], riwayatNilaiData, true);
        // Filter by semester
        if (filterSemester !== 'all') {
            filtered = filtered.filter(function (item) { return item.semester === parseInt(filterSemester); });
        }
        // Search by name or code
        if (searchMK) {
            filtered = filtered.filter(function (item) {
                return item.nama.toLowerCase().includes(searchMK.toLowerCase()) ||
                    item.kode.toLowerCase().includes(searchMK.toLowerCase());
            });
        }
        // Sort
        filtered.sort(function (a, b) {
            var comparison = 0;
            if (sortBy === 'semester') {
                comparison = a.semester - b.semester;
            }
            else if (sortBy === 'nama') {
                comparison = a.nama.localeCompare(b.nama);
            }
            else if (sortBy === 'nilai') {
                comparison = a.nilaiAkhir - b.nilaiAkhir;
            }
            else if (sortBy === 'huruf') {
                comparison = a.huruf.localeCompare(b.huruf);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        return filtered;
    };
    var filteredData = getFilteredAndSortedData();
    var overallProgress = Math.round((cplData.filter(function (cpl) { return cpl.status === 'Tercapai'; }).length / cplData.length) * 100);
    return (<div className="size-full flex flex-col bg-gray-50">
        {/* Navbar */}
        <header className="bg-indigo-800 text-white shadow-md">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl">SICPL - Portal Mahasiswa</h1>
              <span className="text-sm text-indigo-200">Prodi Teknik Industri UNS</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-indigo-700 px-4 py-2 rounded">
                <lucide_react_1.Clock className="w-4 h-4"/>
                <select value={selectedSemester} onChange={function (e) { return setSelectedSemester(e.target.value); }} className="bg-transparent border-none outline-none text-sm cursor-pointer">
                  <option value="Ganjil 2024/2025">Ganjil 2024/2025</option>
                  <option value="Genap 2023/2024">Genap 2023/2024</option>
                </select>
              </div>
              <button className="relative p-2 hover:bg-indigo-700 rounded">
                <lucide_react_1.Bell className="w-5 h-5"/>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <lucide_react_1.User className="w-5 h-5"/>
                </div>
                <div>
                  <div className="text-sm">Ahmad Fadli</div>
                  <div className="text-xs text-indigo-200">I0320045</div>
                </div>
                <button onClick={handleLogout} className="ml-2 p-2 hover:bg-indigo-700 rounded">
                  <lucide_react_1.LogOut className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <nav className="py-4">
              <ul className="space-y-1">
                <li>
                  <button onClick={function () { return setActiveTab('dashboard'); }} className={"w-full flex items-center gap-3 px-6 py-3 ".concat(activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-300')}>
                    <lucide_react_1.Home className="w-5 h-5"/>
                    <span>Dashboard</span>
                  </button>
                </li>
                <li>
                  <button onClick={function () { return setActiveTab('cpl'); }} className={"w-full flex items-center gap-3 px-6 py-3 ".concat(activeTab === 'cpl' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-300')}>
                    <lucide_react_1.Award className="w-5 h-5"/>
                    <span>Detail CPL</span>
                  </button>
                </li>
                <li>
                  <button onClick={function () { return setActiveTab('riwayat'); }} className={"w-full flex items-center gap-3 px-6 py-3 ".concat(activeTab === 'riwayat' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-300')}>
                    <lucide_react_1.BookOpen className="w-5 h-5"/>
                    <span>Riwayat Nilai</span>
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {/* Profile Card */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                    <lucide_react_1.User className="w-12 h-12 text-indigo-600"/>
                  </div>
                  <div>
                    <h2 className="text-2xl mb-1">Ahmad Fadli</h2>
                    <p className="text-indigo-100">NIM: I0320045</p>
                    <p className="text-indigo-100">Angkatan 2020 - Semester 5</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-4">
                    <p className="text-sm text-indigo-100 mb-1">IPK</p>
                    <p className="text-4xl">3.75</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm">
                    <lucide_react_1.Download className="w-4 h-4"/>
                    Download Report
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'dashboard' && (<>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">CPL Tercapai</p>
                        <p className="text-3xl">{cplData.filter(function (c) { return c.status === 'Tercapai'; }).length}<span className="text-lg text-gray-400">/10</span></p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <lucide_react_1.CheckCircle className="w-6 h-6 text-green-600"/>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2">{Math.round((cplData.filter(function (c) { return c.status === 'Tercapai'; }).length / 10) * 100)}% tercapai</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Belum Tercapai</p>
                        <p className="text-3xl">{cplData.filter(function (c) { return c.status === 'Belum Tercapai'; }).length}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <lucide_react_1.XCircle className="w-6 h-6 text-red-600"/>
                      </div>
                    </div>
                    <p className="text-xs text-red-600 mt-2">Perlu perbaikan</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Belum Ditempuh</p>
                        <p className="text-3xl">{cplData.filter(function (c) { return c.status === 'Belum Ditempuh'; }).length}</p>
                      </div>
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <lucide_react_1.MinusCircle className="w-6 h-6 text-gray-600"/>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">MK belum diambil</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Rata-rata CPL</p>
                        <p className="text-3xl">{Math.round(cplData.filter(function (c) { return c.nilai > 0; }).reduce(function (acc, c) { return acc + c.nilai; }, 0) / cplData.filter(function (c) { return c.nilai > 0; }).length)}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <lucide_react_1.TrendingUp className="w-6 h-6 text-yellow-600"/>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Target minimum: 80</p>
                  </div>
                </div>

                {/* Grafik CPL 1-10 */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
                  <div className="mb-4">
                    <h3 className="text-lg mb-1">Grafik Capaian CPL 1-10</h3>
                    <p className="text-xs text-gray-600">Nilai di atas garis merah (80) menunjukkan CPL tercapai. Abu-abu = belum ditempuh.</p>
                  </div>
                  <recharts_1.ResponsiveContainer width="100%" height={350}>
                    <recharts_1.BarChart data={cplData}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                      <recharts_1.XAxis dataKey="name"/>
                      <recharts_1.YAxis domain={[0, 100]}/>
                      <recharts_1.Tooltip />
                      <recharts_1.ReferenceLine y={80} stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" label={{
                value: 'Target Minimum: 80',
                position: 'right',
                fill: '#dc2626',
                fontSize: 12
            }}/>
                      <recharts_1.Bar dataKey="nilai" fill="#6366f1" name="Nilai CPL"/>
                    </recharts_1.BarChart>
                  </recharts_1.ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-center">
                      <p className="text-xs text-gray-600 mb-1">Tercapai (≥80)</p>
                      <p className="text-2xl text-green-600">{cplData.filter(function (c) { return c.status === 'Tercapai'; }).length}</p>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-center">
                      <p className="text-xs text-gray-600 mb-1">Belum Tercapai (&lt;80)</p>
                      <p className="text-2xl text-red-600">{cplData.filter(function (c) { return c.status === 'Belum Tercapai'; }).length}</p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center">
                      <p className="text-xs text-gray-600 mb-1">Belum Ditempuh</p>
                      <p className="text-2xl text-gray-600">{cplData.filter(function (c) { return c.status === 'Belum Ditempuh'; }).length}</p>
                    </div>
                  </div>
                </div>

                {/* Status CPL Detail */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
                  <h3 className="text-lg mb-4">Status Detail CPL 1-10</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {cplData.map(function (cpl, idx) { return (<div key={idx} className={"flex items-center justify-between p-3 border-2 rounded-lg ".concat(cpl.status === 'Tercapai' ? 'border-green-200 bg-green-50' :
                    cpl.status === 'Belum Tercapai' ? 'border-red-200 bg-red-50' :
                        'border-gray-200 bg-gray-50')}>
                        <div className="flex items-center gap-3">
                          {cpl.status === 'Tercapai' ? (<lucide_react_1.CheckCircle className="w-5 h-5 text-green-600"/>) : cpl.status === 'Belum Tercapai' ? (<lucide_react_1.XCircle className="w-5 h-5 text-red-600"/>) : (<lucide_react_1.MinusCircle className="w-5 h-5 text-gray-600"/>)}
                          <div>
                            <p className="text-sm">{cpl.name}</p>
                            <p className="text-xs text-gray-600">{cpl.kategori}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg">{cpl.nilai > 0 ? cpl.nilai : '-'}</p>
                          <span className={"px-2 py-0.5 rounded text-xs ".concat(cpl.status === 'Tercapai' ? 'bg-green-600 text-white' :
                    cpl.status === 'Belum Tercapai' ? 'bg-red-600 text-white' :
                        'bg-gray-400 text-white')}>
                            {cpl.status}
                          </span>
                        </div>
                      </div>); })}
                  </div>
                  <button onClick={function () { return setActiveTab('cpl'); }} className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                    Lihat Detail Pembentuk CPL →
                  </button>
                </div>
              </>)}

            {activeTab === 'cpl' && (<div>
                <h2 className="text-2xl mb-6">Monitoring Capaian CPL</h2>

                {/* Sub Tabs */}
                <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
                  <div className="border-b border-gray-200">
                    <div className="flex">
                      <button onClick={function () { return setCplSubTab('grafik'); }} className={"px-6 py-3 text-sm border-b-2 ".concat(cplSubTab === 'grafik' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-800')}>
                        Grafik CPL
                      </button>
                      <button onClick={function () { return setCplSubTab('lk'); }} className={"px-6 py-3 text-sm border-b-2 ".concat(cplSubTab === 'lk' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-800')}>
                        Grafik LK
                      </button>
                      <button onClick={function () { return setCplSubTab('report'); }} className={"px-6 py-3 text-sm border-b-2 ".concat(cplSubTab === 'report' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-800')}>
                        Report Tabel
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {cplSubTab === 'grafik' && (<div>
                        <h3 className="text-lg mb-4">Visualisasi Grafik CPL 1-10</h3>

                        {/* Bar Chart */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                          <recharts_1.ResponsiveContainer width="100%" height={350}>
                            <recharts_1.BarChart data={cplData}>
                              <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                              <recharts_1.XAxis dataKey="name"/>
                              <recharts_1.YAxis domain={[0, 100]}/>
                              <recharts_1.Tooltip />
                              <recharts_1.ReferenceLine y={80} stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" label={{
                    value: 'Target: 80',
                    position: 'right',
                    fill: '#dc2626',
                    fontSize: 12
                }}/>
                              <recharts_1.Bar dataKey="nilai" fill="#6366f1" name="Nilai CPL"/>
                            </recharts_1.BarChart>
                          </recharts_1.ResponsiveContainer>
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                          <h4 className="text-sm mb-4">Grafik Radar - Capaian CPL</h4>
                          <recharts_1.ResponsiveContainer width="100%" height={400}>
                            <recharts_1.RadarChart data={radarData}>
                              <recharts_1.PolarGrid />
                              <recharts_1.PolarAngleAxis dataKey="subject"/>
                              <recharts_1.PolarRadiusAxis domain={[0, 100]}/>
                              <recharts_1.Radar name="Nilai Saya" dataKey="nilai" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6}/>
                              <recharts_1.Radar name="Target" dataKey="target" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3}/>
                              <recharts_1.Legend />
                              <recharts_1.Tooltip />
                            </recharts_1.RadarChart>
                          </recharts_1.ResponsiveContainer>
                        </div>

                        {/* Summary Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="text-sm text-gray-600 mb-1">CPL Tercapai</p>
                            <p className="text-3xl text-green-600">{cplData.filter(function (c) { return c.status === 'Tercapai'; }).length}</p>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-sm text-gray-600 mb-1">Belum Tercapai</p>
                            <p className="text-3xl text-red-600">{cplData.filter(function (c) { return c.status === 'Belum Tercapai'; }).length}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Belum Ditempuh</p>
                            <p className="text-3xl text-gray-600">{cplData.filter(function (c) { return c.status === 'Belum Ditempuh'; }).length}</p>
                          </div>
                        </div>
                      </div>)}

                    {cplSubTab === 'lk' && (<div>
                        <h3 className="text-lg mb-4">Grafik LK - Detail Capaian per CPL</h3>

                        <div className="space-y-6">
                          {detailCPL.map(function (item, idx) {
                    var ikChartData = item.ik.map(function (ikItem) { return ({
                        name: ikItem.kode,
                        nilai: ikItem.nilai,
                        target: 80
                    }); });
                    return (<div key={idx} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                {/* CPL Header */}
                                <div className={"p-4 ".concat(item.status === 'Tercapai' ? 'bg-red-500' :
                            item.status === 'Belum Tercapai' ? 'bg-red-400' :
                                'bg-gray-400', " text-white")}>
                                  <h4 className="text-lg">{item.cpl}</h4>
                                </div>

                                {/* CPL Description */}
                                <div className="p-4 bg-gray-50 border-b border-gray-200">
                                  <p className="text-sm text-gray-700">{item.deskripsi}</p>
                                </div>

                                {/* Chart Section */}
                                <div className="p-6">
                                  <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-2">Nilai IK (Indikator Kinerja)</p>
                                  </div>

                                  {/* Bar Chart */}
                                  <div className="mb-6">
                                    <recharts_1.ResponsiveContainer width="100%" height={250}>
                                      <recharts_1.BarChart data={ikChartData}>
                                        <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                                        <recharts_1.XAxis dataKey="name"/>
                                        <recharts_1.YAxis domain={[0, 100]}/>
                                        <recharts_1.Tooltip />
                                        <recharts_1.ReferenceLine y={80} stroke="#16a34a" strokeWidth={2} strokeDasharray="5 5" label={{
                            value: 'Target: 80',
                            position: 'right',
                            fill: '#16a34a',
                            fontSize: 12
                        }}/>
                                        <recharts_1.Bar dataKey="nilai" fill="#86efac" name="Nilai IK"/>
                                      </recharts_1.BarChart>
                                    </recharts_1.ResponsiveContainer>
                                  </div>

                                  {/* Detail Table */}
                                  <div className="overflow-x-auto mb-4">
                                    <table className="w-full text-sm border border-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left py-2 px-3 border-b border-gray-200 text-xs">IK</th>
                                          <th className="text-left py-2 px-3 border-b border-gray-200 text-xs">Deskripsi</th>
                                          <th className="text-center py-2 px-3 border-b border-gray-200 text-xs">Capaian</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.ik.map(function (ikItem, ikIdx) { return (<tr key={ikIdx} className="hover:bg-gray-50">
                                            <td className="py-2 px-3 border-b border-gray-200">{ikItem.kode}</td>
                                            <td className="py-2 px-3 border-b border-gray-200 text-xs">{ikItem.deskripsi}</td>
                                            <td className="text-center py-2 px-3 border-b border-gray-200">
                                              {ikItem.nilai > 0 ? ikItem.nilai.toFixed(2) : '-'}
                                            </td>
                                          </tr>); })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* CPL Summary */}
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-700">Nilai CPL {item.cpl}</span>
                                      <span className={"text-xl ".concat(item.nilai >= 80 ? 'text-green-600' :
                            item.nilai > 0 ? 'text-red-600' :
                                'text-gray-600')}>
                                        {item.nilai > 0 ? item.nilai.toFixed(2) : '-'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>);
                })}
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 mb-2">
                            <strong>Keterangan:</strong>
                          </p>
                          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                            <li>Grafik bar menunjukkan nilai capaian setiap IK untuk CPL terkait</li>
                            <li>Garis putus-putus hijau menunjukkan target minimum (80)</li>
                            <li>Nilai CPL dihitung dari rata-rata berbobot semua IK yang terkait</li>
                          </ul>
                        </div>
                      </div>)}

                    {cplSubTab === 'report_old' && (<div>
                        <h3 className="text-lg mb-4">Lembar Kerja - Detail Pembentuk CPL</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Hierarki: <strong>CPL</strong> → <strong>IK/PI</strong> → <strong>CPMK</strong> → <strong>Mata Kuliah</strong>
                        </p>

                        <div className="space-y-4">
                  {detailCPL.map(function (item, idx) { return (<div key={idx} className="bg-white rounded-lg shadow border border-gray-200">
                      {/* CPL Header */}
                      <div className={"p-4 cursor-pointer ".concat(item.status === 'Tercapai' ? 'bg-green-50' :
                        item.status === 'Belum Tercapai' ? 'bg-red-50' :
                            'bg-gray-50')} onClick={function () { return setExpandedCPL(expandedCPL === idx ? null : idx); }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {expandedCPL === idx ? (<lucide_react_1.ChevronDown className="w-5 h-5 text-gray-600"/>) : (<lucide_react_1.ChevronRight className="w-5 h-5 text-gray-600"/>)}
                            <lucide_react_1.GraduationCap className={"w-6 h-6 ".concat(item.status === 'Tercapai' ? 'text-green-600' :
                        item.status === 'Belum Tercapai' ? 'text-red-600' :
                            'text-gray-600')}/>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <p className="text-lg">{item.cpl}</p>
                                <span className={"px-3 py-1 rounded text-xs ".concat(item.status === 'Tercapai' ? 'bg-green-600 text-white' :
                        item.status === 'Belum Tercapai' ? 'bg-red-600 text-white' :
                            'bg-gray-400 text-white')}>
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{item.deskripsi}</p>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600">Nilai CPL</p>
                            <p className="text-3xl">{item.nilai > 0 ? item.nilai : '-'}</p>
                            <p className="text-xs text-gray-500">Target: 80</p>
                          </div>
                        </div>
                      </div>

                      {/* IK/PI Detail - Expanded */}
                      {expandedCPL === idx && (<div className="p-4 border-t border-gray-200">
                          {item.ik.map(function (ikItem, ikIdx) { return (<div key={ikIdx} className="mb-4 last:mb-0">
                              {/* IK Header */}
                              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg mb-3">
                                <lucide_react_1.Target className="w-5 h-5 text-purple-600 mt-0.5"/>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm">{ikItem.kode}</p>
                                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                                      Bobot: {ikItem.bobot}%
                                    </span>
                                    <span className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded">
                                      Nilai: {ikItem.nilai > 0 ? ikItem.nilai : '-'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700">{ikItem.deskripsi}</p>
                                </div>
                              </div>

                              {/* CPMK Detail */}
                              <div className="ml-8 space-y-2">
                                {ikItem.cpmk.map(function (cpmkItem, cpmkIdx) { return (<div key={cpmkIdx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-start gap-3">
                                      <lucide_react_1.BookOpen className="w-5 h-5 text-blue-600 mt-0.5"/>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-sm">{cpmkItem.kode}</p>
                                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                            Bobot: {cpmkItem.bobot}%
                                          </span>
                                          <span className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded">
                                            Nilai: {cpmkItem.nilai > 0 ? cpmkItem.nilai : '-'}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-700 mb-2">{cpmkItem.deskripsi}</p>

                                        {/* Mata Kuliah */}
                                        <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-300">
                                          <lucide_react_1.BookOpen className="w-4 h-4 text-indigo-600"/>
                                          <div className="flex-1">
                                            <p className="text-xs">{cpmkItem.matakuliah}</p>
                                            <p className="text-xs text-gray-600">Semester {cpmkItem.semester}</p>
                                          </div>
                                          <span className={"px-2 py-1 rounded text-xs ".concat(cpmkItem.nilaiMK === '-' ? 'bg-gray-100 text-gray-600' :
                                    cpmkItem.nilaiMK.startsWith('A') ? 'bg-green-100 text-green-700' :
                                        'bg-yellow-100 text-yellow-700')}>
                                            Nilai: {cpmkItem.nilaiMK}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>); })}
                              </div>
                            </div>); })}
                        </div>)}
                    </div>); })}
                </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 mb-2">
                            <strong>Cara membaca:</strong>
                          </p>
                          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                            <li>Klik pada CPL untuk melihat detail IK, CPMK, dan mata kuliah pembentuknya</li>
                            <li>Nilai CPL dihitung dari bobot IK, yang dibentuk dari CPMK di setiap mata kuliah</li>
                            <li>Bobot menunjukkan kontribusi masing-masing komponen terhadap capaian CPL</li>
                          </ul>
                        </div>
                      </div>)}

                    {cplSubTab === 'report' && (<div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg">Report Tabel - Monitoring Pencapaian CPL Individu</h3>
                          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                            <lucide_react_1.Download className="w-4 h-4"/>
                            Export Excel
                          </button>
                        </div>

                        {/* Student Profile Card */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                              <lucide_react_1.User className="w-12 h-12 text-indigo-600"/>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl mb-1">Ahmad Fadli</h3>
                              <p className="text-indigo-100 text-sm">NIM: I0320045</p>
                              <p className="text-indigo-100 text-sm">Prodi Teknik Industri - Angkatan 2020</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-indigo-100">IPK</p>
                              <p className="text-3xl">3.75</p>
                              <p className="text-sm text-indigo-100">Semester 5</p>
                            </div>
                          </div>
                        </div>

                        {/* Monitoring Information */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                          <h4 className="text-lg mb-3">Monitoring Pencapaian CPL</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Tabel berikut menampilkan detail capaian pembelajaran lulusan (CPL) mahasiswa dengan informasi lengkap mengenai setiap indikator kinerja, mata kuliah pendukung, dan status pencapaian.
                          </p>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs text-gray-600">Tercapai</p>
                              <p className="text-2xl text-green-600">{cplData.filter(function (c) { return c.status === 'Tercapai'; }).length}</p>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-xs text-gray-600">Belum Tercapai</p>
                              <p className="text-2xl text-red-600">{cplData.filter(function (c) { return c.status === 'Belum Tercapai'; }).length}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs text-gray-600">Belum Ditempuh</p>
                              <p className="text-2xl text-gray-600">{cplData.filter(function (c) { return c.status === 'Belum Ditempuh'; }).length}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs text-gray-600">Rata-rata CPL</p>
                              <p className="text-2xl text-blue-600">{Math.round(cplData.filter(function (c) { return c.nilai > 0; }).reduce(function (acc, c) { return acc + c.nilai; }, 0) / cplData.filter(function (c) { return c.nilai > 0; }).length)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Summary Table */}
                        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
                          <div className="p-4 bg-gray-50 border-b border-gray-200">
                            <h4 className="text-sm">Ringkasan Capaian CPL 1-10</h4>
                          </div>
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-xs text-gray-600">No</th>
                                <th className="text-left py-3 px-4 text-xs text-gray-600">CPL</th>
                                <th className="text-left py-3 px-4 text-xs text-gray-600">Deskripsi Capaian Pembelajaran</th>
                                <th className="text-center py-3 px-4 text-xs text-gray-600">Kategori</th>
                                <th className="text-center py-3 px-4 text-xs text-gray-600">Nilai</th>
                                <th className="text-center py-3 px-4 text-xs text-gray-600">Target</th>
                                <th className="text-center py-3 px-4 text-xs text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cplData.map(function (cpl, idx) {
                    var _a;
                    return (<tr key={idx} className={"border-b border-gray-100 ".concat(cpl.status === 'Tercapai' ? 'bg-green-50' :
                            cpl.status === 'Belum Tercapai' ? 'bg-red-50' :
                                'bg-gray-50')}>
                                  <td className="py-3 px-4 text-center">{idx + 1}</td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                                      {cpl.name}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-xs">{cplData.length > idx ? ((_a = detailCPL.find(function (d) { return d.cpl === cpl.name; })) === null || _a === void 0 ? void 0 : _a.deskripsi) || 'Mampu menerapkan kompetensi di bidang teknik industri' : ''}</td>
                                  <td className="text-center py-3 px-4">
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                      {cpl.kategori}
                                    </span>
                                  </td>
                                  <td className="text-center py-3 px-4">
                                    <span className={"text-lg ".concat(cpl.nilai >= 80 ? 'text-green-600' :
                            cpl.nilai > 0 ? 'text-red-600' :
                                'text-gray-600')}>
                                      {cpl.nilai > 0 ? cpl.nilai : '-'}
                                    </span>
                                  </td>
                                  <td className="text-center py-3 px-4">{cpl.target}</td>
                                  <td className="text-center py-3 px-4">
                                    <span className={"inline-block px-3 py-1 rounded text-xs ".concat(cpl.status === 'Tercapai' ? 'bg-green-600 text-white' :
                            cpl.status === 'Belum Tercapai' ? 'bg-red-600 text-white' :
                                'bg-gray-400 text-white')}>
                                      {cpl.status}
                                    </span>
                                  </td>
                                </tr>);
                })}
                            </tbody>
                          </table>
                        </div>

                        {/* Detail Table by CPL */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg">Detail Pembentuk Nilai CPL</h4>
                            <p className="text-sm text-gray-600">Klik pada CPL untuk melihat detail IK, CPMK, dan Mata Kuliah</p>
                          </div>

                          {detailCPL.map(function (item, idx) { return (<div key={idx} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                              {/* CPL Header */}
                              <div className={"p-4 ".concat(item.status === 'Tercapai' ? 'bg-green-500' :
                        item.status === 'Belum Tercapai' ? 'bg-red-500' :
                            'bg-gray-400', " text-white")}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <lucide_react_1.GraduationCap className="w-6 h-6"/>
                                    <div>
                                      <p className="text-lg">{item.cpl}</p>
                                      <p className="text-sm opacity-90">{item.deskripsi}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm opacity-90">Nilai CPL</p>
                                    <p className="text-3xl">{item.nilai > 0 ? item.nilai : '-'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Detail Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-3 px-4 text-xs text-gray-600">IK/PI</th>
                                      <th className="text-center py-3 px-4 text-xs text-gray-600">Bobot</th>
                                      <th className="text-left py-3 px-4 text-xs text-gray-600">CPMK</th>
                                      <th className="text-center py-3 px-4 text-xs text-gray-600">Bobot</th>
                                      <th className="text-left py-3 px-4 text-xs text-gray-600">Mata Kuliah</th>
                                      <th className="text-center py-3 px-4 text-xs text-gray-600">Smt</th>
                                      <th className="text-center py-3 px-4 text-xs text-gray-600">Nilai</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.ik.map(function (ikItem, ikIdx) { return (ikItem.cpmk.map(function (cpmkItem, cpmkIdx) { return (<tr key={"".concat(ikIdx, "-").concat(cpmkIdx)} className="border-b border-gray-100 hover:bg-gray-50">
                                          {cpmkIdx === 0 && (<>
                                              <td rowSpan={ikItem.cpmk.length} className="py-3 px-4 border-r border-gray-200 bg-purple-50">
                                                <div className="text-xs">
                                                  <p className="font-semibold text-purple-700">{ikItem.kode}</p>
                                                  <p className="text-gray-600 mt-1">{ikItem.deskripsi}</p>
                                                </div>
                                              </td>
                                              <td rowSpan={ikItem.cpmk.length} className="text-center py-3 px-4 border-r border-gray-200 bg-purple-50">
                                                <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs">{ikItem.bobot}%</span>
                                              </td>
                                            </>)}
                                          <td className="py-3 px-4 bg-blue-50">
                                            <p className="text-xs font-semibold text-blue-700">{cpmkItem.kode}</p>
                                            <p className="text-xs text-gray-600 mt-1">{cpmkItem.deskripsi}</p>
                                          </td>
                                          <td className="text-center py-3 px-4 bg-blue-50">
                                            <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs">{cpmkItem.bobot}%</span>
                                          </td>
                                          <td className="py-3 px-4 text-xs">{cpmkItem.matakuliah}</td>
                                          <td className="text-center py-3 px-4">{cpmkItem.semester}</td>
                                          <td className="text-center py-3 px-4">
                                            <span className={"px-3 py-1 rounded text-xs font-semibold ".concat(cpmkItem.nilaiMK === '-' ? 'bg-gray-100 text-gray-600' :
                            cpmkItem.nilaiMK.startsWith('A') ? 'bg-green-100 text-green-700' :
                                'bg-yellow-100 text-yellow-700')}>
                                              {cpmkItem.nilaiMK}
                                            </span>
                                          </td>
                                        </tr>); })); })}
                                  </tbody>
                                </table>
                              </div>
                            </div>); })}
                        </div>

                        {/* Notes and Export Options */}
                        <div className="mt-6 grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm mb-2 text-blue-800">Informasi</h4>
                            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                              <li>Report ini menampilkan monitoring pencapaian CPL secara individual</li>
                              <li>Warna hijau = CPL tercapai (≥80), merah = belum tercapai, abu = belum ditempuh</li>
                              <li>Nilai CPL dihitung berdasarkan bobot IK dan CPMK dari mata kuliah yang telah ditempuh</li>
                            </ul>
                          </div>
                          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <h4 className="text-sm mb-3">Opsi Export Report</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <button className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                                <lucide_react_1.Download className="w-5 h-5 text-green-600"/>
                                <span className="text-xs">Excel</span>
                              </button>
                              <button className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                                <lucide_react_1.Download className="w-5 h-5 text-red-600"/>
                                <span className="text-xs">PDF</span>
                              </button>
                              <button className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                                <lucide_react_1.Download className="w-5 h-5 text-blue-600"/>
                                <span className="text-xs">CSV</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>)}
                  </div>
                </div>
              </div>)}

            {activeTab === 'riwayat' && (<div>
                <h2 className="text-2xl mb-6">Riwayat Nilai & Mata Kuliah</h2>

                {/* Header Information */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                    <div className="flex">
                      <span className="w-32 text-gray-600">Fakultas</span>
                      <span className="flex-1">: Teknik</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-gray-600">Nama</span>
                      <span className="flex-1">: Ahmad Fadli</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-gray-600">Program Studi</span>
                      <span className="flex-1">: Teknik Industri</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-gray-600">NIM</span>
                      <span className="flex-1">: I0320045</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-gray-600">Kurikulum</span>
                      <span className="flex-1">: 2020</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-gray-600">Semester</span>
                      <span className="flex-1">: 5 (Ganjil 2024/2025)</span>
                    </div>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
                      <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
                          <input type="text" placeholder="Cari nama atau kode mata kuliah..." value={searchMK} onChange={function (e) { return setSearchMK(e.target.value); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"/>
                        </div>

                        {/* Filter Semester */}
                        <div className="flex items-center gap-2">
                          <lucide_react_1.Filter className="w-4 h-4 text-gray-600"/>
                          <select value={filterSemester} onChange={function (e) { return setFilterSemester(e.target.value); }} className="px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm">
                            <option value="all">Semua Semester</option>
                            <option value="1">Semester 1</option>
                            <option value="2">Semester 2</option>
                            <option value="3">Semester 3</option>
                            <option value="4">Semester 4</option>
                            <option value="5">Semester 5</option>
                          </select>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-2">
                          <lucide_react_1.ArrowUpDown className="w-4 h-4 text-gray-600"/>
                          <select value={"".concat(sortBy, "-").concat(sortOrder)} onChange={function (e) {
                var _a = e.target.value.split('-'), col = _a[0], order = _a[1];
                setSortBy(col);
                setSortOrder(order);
            }} className="px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm">
                            <option value="semester-asc">Semester (1→5)</option>
                            <option value="semester-desc">Semester (5→1)</option>
                            <option value="nama-asc">Nama (A→Z)</option>
                            <option value="nama-desc">Nama (Z→A)</option>
                            <option value="nilai-asc">Nilai (Rendah→Tinggi)</option>
                            <option value="nilai-desc">Nilai (Tinggi→Rendah)</option>
                            <option value="huruf-asc">Huruf (A→D)</option>
                            <option value="huruf-desc">Huruf (D→A)</option>
                          </select>
                        </div>

                        {/* Export Button */}
                        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                          <lucide_react_1.Download className="w-4 h-4"/>
                          Export
                        </button>
                      </div>

                      {/* Info hasil filter */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                        <span>Menampilkan {filteredData.length} dari {riwayatNilaiData.length} mata kuliah</span>
                        {(searchMK || filterSemester !== 'all') && (<button onClick={function () {
                    setSearchMK('');
                    setFilterSemester('all');
                    setSortBy('semester');
                    setSortOrder('asc');
                }} className="text-indigo-600 hover:underline">
                            Reset Filter
                          </button>)}
                      </div>
                    </div>

                {/* Main Transcript Table */}
                <div className="bg-white rounded-lg shadow border border-gray-200 mb-6 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg">SEBELAS MARET UNIVERSITY</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th rowSpan={3} className="border border-gray-300 py-2 px-2 text-center">No</th>
                          <th rowSpan={3} className="border border-gray-300 py-2 px-2 text-center">Semester</th>
                          <th rowSpan={3} className="border border-gray-300 py-2 px-2 text-center">Kode MK</th>
                          <th rowSpan={3} className="border border-gray-300 py-2 px-2 text-left">Nama Mata Kuliah</th>
                          <th rowSpan={3} className="border border-gray-300 py-2 px-2 text-center">SKS</th>
                          <th colSpan={8} className="border border-gray-300 py-1 px-2 text-center">Nilai</th>
                        </tr>
                        <tr className="bg-blue-900 text-white">
                          <th colSpan={5} className="border border-gray-300 py-1 px-2 text-center bg-yellow-400 text-gray-900">NILAI DARI SISTEM</th>
                          <th rowSpan={2} className="border border-gray-300 py-1 px-2 text-center">NILAI AKHIR</th>
                          <th rowSpan={2} className="border border-gray-300 py-1 px-2 text-center">NILAI SKALA 100</th>
                          <th rowSpan={2} className="border border-gray-300 py-1 px-2 text-center">HURUF</th>
                        </tr>
                        <tr className="bg-blue-900 text-white text-xs">
                          <th className="border border-gray-300 py-1 px-1 text-center bg-red-400 text-white">UK1<br />(TUGAS)</th>
                          <th className="border border-gray-300 py-1 px-1 text-center bg-orange-400 text-white">UK2<br />(UTS)</th>
                          <th className="border border-gray-300 py-1 px-1 text-center bg-green-400 text-white">UK3<br />(UAS)</th>
                          <th className="border border-gray-300 py-1 px-1 text-center bg-cyan-400 text-white">UK4<br />(PARTISIPATIF)</th>
                          <th className="border border-gray-300 py-1 px-1 text-center bg-blue-400 text-white">UK5<br />(PROYEK)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map(function (item, idx) { return (<tr key={item.no} className="hover:bg-gray-50">
                            <td className="border border-gray-300 py-2 px-2 text-center">{idx + 1}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center">{item.semester}</td>
                            <td className="border border-gray-300 py-2 px-2">{item.kode}</td>
                            <td className="border border-gray-300 py-2 px-2">{item.nama}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center">{item.sks}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center bg-red-50">{item.uk1}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center bg-orange-50">{item.uk2}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center bg-green-50">{item.uk3}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center bg-cyan-50">{item.uk4}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center bg-blue-50">{item.uk5}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center">{item.nilaiAkhir.toFixed(2)}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center">{item.skala100.toFixed(2)}</td>
                            <td className="border border-gray-300 py-2 px-2 text-center">
                              <span className={"px-2 py-1 rounded text-xs font-semibold ".concat(item.huruf.startsWith('A') ? 'bg-green-100 text-green-700' :
                    item.huruf.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700')}>
                                {item.huruf}
                              </span>
                            </td>
                          </tr>); })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-lg mb-4">Ringkasan Akademik</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Total SKS Diambil</span>
                        <span className="text-sm">55 SKS</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Total SKS Lulus</span>
                        <span className="text-sm">55 SKS</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Total SKS Kurikulum</span>
                        <span className="text-sm">144 SKS</span>
                      </div>
                      <div className="flex justify-between p-3 bg-blue-50 rounded">
                        <span className="text-sm text-gray-600">IPK</span>
                        <span className="text-xl">3.75</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Predikat</span>
                        <span className="text-sm">Sangat Memuaskan</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-lg mb-4">Capaian CPL</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <lucide_react_1.CheckCircle className="w-4 h-4 text-green-600"/>
                          <span className="text-sm">CPL Tercapai</span>
                        </div>
                        <p className="text-2xl text-green-600">6<span className="text-lg text-gray-600">/10</span></p>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <lucide_react_1.XCircle className="w-4 h-4 text-red-600"/>
                          <span className="text-sm">Belum Tercapai</span>
                        </div>
                        <p className="text-2xl text-red-600">2<span className="text-lg text-gray-600">/10</span></p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <lucide_react_1.MinusCircle className="w-4 h-4 text-gray-600"/>
                          <span className="text-sm">Belum Ditempuh</span>
                        </div>
                        <p className="text-2xl text-gray-600">2<span className="text-lg text-gray-600">/10</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-lg mb-4">Informasi</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-xs text-blue-800 mb-2">
                          <strong>Keterangan Tabel:</strong>
                        </p>
                        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                          <li>Nilai CPL dihitung per mata kuliah</li>
                          <li>Kolom hijau menunjukkan CPL yang terkait</li>
                          <li>Nilai 0 atau "-" berarti tidak ada kontribusi CPL</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <lucide_react_1.Award className="w-4 h-4 text-indigo-600"/>
                          <span className="text-sm">Progress Akademik</span>
                        </div>
                        <p className="text-xs text-gray-600">38.2% dari total SKS kurikulum</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>)}
          </main>
        </div>

      <style jsx global>{"\n        @keyframes fadeIn {\n          from {\n            opacity: 0;\n            transform: scale(0.97) translateY(4px);\n          }\n          to {\n            opacity: 1;\n            transform: scale(1) translateY(0);\n          }\n        }\n        .animate-fadeIn {\n          animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n        }\n      "}</style>
    </div>);
}
