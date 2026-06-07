'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserSession } from '../../../data/users';
import { Search, ChevronRight, Loader2, AlertCircle, Users as UsersIcon } from 'lucide-react';
import KelasDetailView from './KelasDetailView';

interface KelasViewProps {
  sessionUser: UserSession;
}

type Kelas = {
  id_kelas: number;
  kode_kelas: string | null;
  tahun_akademik: string;
  semester: string;
  kuota: number | null;
  id_mata_kuliah: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  kode_kurikulum: string;
  nama_kurikulum: string;
  peran_di_kelas: 'koordinator' | 'anggota';
  jumlah_mahasiswa: number;
};

export default function KelasView({ sessionUser }: KelasViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = sessionStorage.getItem('currentUser') ?? '';
        const res = await fetch('/api/dosen/kelas', {
          headers: { 'x-user-session': raw },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message ?? `HTTP ${res.status}`);
        }
        if (!cancelled) setKelas(json.data.kelas as Kelas[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat daftar kelas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredKelas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return kelas;
    return kelas.filter(
      (k) =>
        k.nama_mk.toLowerCase().includes(q) ||
        k.kode_mk.toLowerCase().includes(q) ||
        (k.kode_kelas ?? '').toLowerCase().includes(q),
    );
  }, [kelas, searchTerm]);

  // ── Mode detail ─────────────────────────────────────────────────────────
  if (selectedId !== null) {
    return (
      <KelasDetailView
        sessionUser={sessionUser}
        idKelas={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  // ── Mode list ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kelola Kelas</h1>
        <p className="text-gray-600 mt-1">Mengelola semua kelas yang diampu</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Gagal memuat data</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan kode atau nama mata kuliah..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Kelas Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Memuat daftar kelas...</p>
          </div>
        ) : filteredKelas.length > 0 ? (
          filteredKelas.map((kelasItem) => (
            <div
              key={kelasItem.id_kelas}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">{kelasItem.nama_mk}</h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full font-mono">
                      {kelasItem.kode_mk}
                    </span>
                    {kelasItem.kode_kelas && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        Kelas {kelasItem.kode_kelas}
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        kelasItem.peran_di_kelas === 'koordinator'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {kelasItem.peran_di_kelas === 'koordinator' ? 'Koordinator' : 'Anggota'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {kelasItem.tahun_akademik} • {kelasItem.semester} • {kelasItem.sks} SKS •
                    Kurikulum {kelasItem.kode_kurikulum}
                  </p>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Mahasiswa</p>
                      <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                        <UsersIcon className="w-4 h-4 text-gray-400" />
                        {kelasItem.jumlah_mahasiswa}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Kuota</p>
                      <p className="text-lg font-bold text-gray-900">
                        {kelasItem.kuota ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">SKS</p>
                      <p className="text-lg font-bold text-gray-900">{kelasItem.sks}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedId(kelasItem.id_kelas)}
                  className="text-gray-400 hover:text-indigo-600 transition"
                  title="Buka detail kelas"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedId(kelasItem.id_kelas)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Kelola Nilai
                </button>
                <button
                  disabled
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed"
                  title="Tersedia di tahap selanjutnya"
                >
                  Presensi
                </button>
                <button
                  disabled
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed"
                  title="Tersedia di tahap selanjutnya"
                >
                  Materi
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              {kelas.length === 0
                ? 'Anda belum terdaftar sebagai pengampu kelas manapun.'
                : 'Tidak ada kelas yang cocok dengan pencarian.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}