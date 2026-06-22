'use client';

import { UserSession } from '../../../data/users';
import { Search, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MahasiswaListViewProps {
  sessionUser: UserSession;
}

type MahasiswaRow = {
  id_mahasiswa: number;
  nim: string;
  nama: string;
  angkatan: number | null;
  ipk: number | null;
  semester: number | null;
  status: string;
  jumlah_kelas: number;
};

type Summary = {
  total: number;
  rata_ipk: number | null;
  rata_semester: number | null;
};

function authHeaders(): Record<string, string> {
  const raw = sessionStorage.getItem('currentUser');
  return raw ? { 'x-user-session': raw } : {};
}

export default function MahasiswaListView({ sessionUser }: MahasiswaListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mahasiswaList, setMahasiswaList] = useState<MahasiswaRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, rata_ipk: null, rata_semester: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('q', searchTerm.trim());

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
          setSummary(json.data.summary ?? { total: 0, rata_ipk: null, rata_semester: null });
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
  }, [searchTerm]);

  const handleExportData = () => {
    const csvContent = [
      ['NIM', 'Nama', 'Angkatan', 'IPK', 'Semester', 'Status', 'Jumlah Kelas'],
      ...mahasiswaList.map((m) => [
        m.nim,
        m.nama,
        m.angkatan ?? '',
        m.ipk ?? '',
        m.semester ?? '',
        m.status,
        m.jumlah_kelas,
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Mahasiswa</h1>
        <p className="text-gray-600 mt-1">Mengelola data mahasiswa {sessionUser.prodi}</p>
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
        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">IPK Est.</th>
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
                        {mhs.ipk ?? '-'}
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
          <p className="text-sm text-gray-600">Rata-rata IPK Est.</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.rata_ipk ?? '-'}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Rata-rata Semester</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.rata_semester ?? '-'}</p>
        </div>
      </div>
    </div>
  );
}
