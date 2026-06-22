'use client';

import { UserSession } from '../../../data/users';
import { Search, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MahasiswaListViewProps {
  sessionUser: UserSession;
}

type MahasiswaRow = {
  id_mahasiswa: number;
  nim: string;
  nama: string;
  angkatan: number | null;
  cpl: number | null;
  semester: number | null;
  status: string;
  jumlah_kelas: number;
};

type Summary = {
  total: number;
  rata_cpl: number | null;
  rata_semester: number | null;
};
type Option = { value: string; label: string };
type FilterOptions = {
  tahun: string[];
  semester: string[];
  angkatan: string[];
  cpl: Option[];
  kelas: Option[];
};

function authHeaders(): Record<string, string> {
  const raw = sessionStorage.getItem('currentUser');
  return raw ? { 'x-user-session': raw } : {};
}

export default function MahasiswaListView({ sessionUser }: MahasiswaListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterSemester, setFilterSemester] = useState('Semua');
  const [filterAngkatan, setFilterAngkatan] = useState('Semua');
  const [filterCpl, setFilterCpl] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [mahasiswaList, setMahasiswaList] = useState<MahasiswaRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, rata_cpl: null, rata_semester: null });
  const [options, setOptions] = useState<FilterOptions>({ tahun: [], semester: [], angkatan: [], cpl: [], kelas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (filterTahun !== 'Semua') params.set('ta', filterTahun);
      if (filterSemester !== 'Semua') params.set('semester', filterSemester);
      if (filterAngkatan !== 'Semua') params.set('angkatan', filterAngkatan);
      if (filterCpl !== 'Semua') params.set('cpl', filterCpl);
      if (filterKelas !== 'Semua') params.set('kelas', filterKelas);

      setLoading(true);
      setError('');
      fetch(`/api/kaprodi/mahasiswa?${params.toString()}`, {
        headers: authHeaders(),
        cache: 'no-store',
        signal: ctrl.signal,
      })
        .then(async (res) => {
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memuat mahasiswa.');
          setMahasiswaList(json.data.items ?? []);
          setSummary(json.data.summary ?? { total: 0, rata_cpl: null, rata_semester: null });
          setOptions(json.data.options ?? { tahun: [], semester: [], angkatan: [], cpl: [], kelas: [] });
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setError(err.message || 'Gagal memuat mahasiswa.');
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchTerm, filterTahun, filterSemester, filterAngkatan, filterCpl, filterKelas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Mahasiswa</h1>
        <p className="text-gray-600 mt-1">Mengelola data mahasiswa {sessionUser.prodi}</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Filter Data Mahasiswa</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <FilterSelect label="Tahun Ajar" value={filterTahun} onChange={setFilterTahun} values={options.tahun} />
          <FilterSelect label="Semester" value={filterSemester} onChange={setFilterSemester} values={options.semester} />
          <FilterSelect label="Angkatan" value={filterAngkatan} onChange={setFilterAngkatan} values={options.angkatan} />
          <FilterSelect label="CPL" value={filterCpl} onChange={setFilterCpl} options={options.cpl} />
          <FilterSelect label="Kelas" value={filterKelas} onChange={setFilterKelas} options={options.kelas} />
        </div>
      </div>

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
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">NIM</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Angkatan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rata-rata CPL</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Semester</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {mahasiswaList.length > 0 ? (
                mahasiswaList.map((mhs) => (
                  <tr key={mhs.id_mahasiswa} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">{mhs.nim}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{mhs.nama}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{mhs.angkatan ?? '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                        {mhs.cpl ?? '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">{mhs.semester ?? '-'}</td>
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
                    {loading ? 'Memuat data mahasiswa...' : 'Tidak ada data mahasiswa yang ditemukan'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Mahasiswa</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : summary.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Rata-rata CPL</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.rata_cpl ?? '-'}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Rata-rata Semester</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.rata_semester ?? '-'}</p>
        </div>
      </div>
    </div>
  );
}

function FilterSelect(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  values?: string[];
  options?: Option[];
}) {
  const options = props.options ?? (props.values ?? []).map((v) => ({ value: v, label: v }));
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full text-sm border-gray-300 rounded-md py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="Semua">Semua</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
