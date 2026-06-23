'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserSession } from '../../../data/users';
import { BookOpen, Users, FileText, BarChart3, AlertCircle, Loader2 } from 'lucide-react';

interface DosenDashboardViewProps {
  sessionUser: UserSession;
}

type Kelas = {
  id_kelas: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  tahun_akademik: string;
  semester: string;
  peran_di_kelas: 'koordinator' | 'anggota';
  jumlah_mahasiswa: number;
  id_mata_kuliah: number;
};

export default function DosenDashboardView({ sessionUser }: DosenDashboardViewProps) {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalKelas = kelas.length;
    const totalMahasiswa = kelas.reduce((sum, k) => sum + (k.jumlah_mahasiswa || 0), 0);
    const totalMKUnik = new Set(kelas.map((k) => k.id_mata_kuliah)).size;
    const jumlahKoordinator = kelas.filter((k) => k.peran_di_kelas === 'koordinator').length;
    return { totalKelas, totalMahasiswa, totalMKUnik, jumlahKoordinator };
  }, [kelas]);

  const statCards = [
    {
      label: 'Total Kelas',
      value: String(stats.totalKelas),
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Total Mahasiswa',
      value: String(stats.totalMahasiswa),
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-50 text-green-600',
      borderColor: 'border-green-200',
    },
    {
      label: 'Mata Kuliah non Pengajaran',
      value: String(stats.totalMKUnik),
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-600',
      borderColor: 'border-purple-200',
    },

  ];

  // Distribusi semester berdasarkan tahun akademik + semester
  const distribusiPeran = useMemo(() => {
    const koordinator = kelas.filter((k) => k.peran_di_kelas === 'koordinator').length;
    const anggota = kelas.filter((k) => k.peran_di_kelas === 'anggota').length;
    return { koordinator, anggota };
  }, [kelas]);

  // Kelas terbaru (urutan dari API sudah descending TA + semester)
  const kelasTerbaru = useMemo(() => kelas.slice(0, 4), [kelas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Dosen</h1>
        <p className="text-gray-600 mt-1">Selamat datang, {sessionUser.name}</p>
        {sessionUser.prodi && (
          <p className="text-sm text-gray-500">Program Studi: {sessionUser.prodi}</p>
        )}
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`border-2 ${stat.borderColor} rounded-lg p-6 bg-white`}
          >
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {loading ? (
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin inline" />
              ) : (
                stat.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Kelas Terbaru + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kelas terbaru */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Kelas Periode Terbaru</h2>
            <p className="text-xs text-gray-500 mt-1">Diurutkan berdasarkan tahun akademik dan semester</p>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              </div>
            ) : kelasTerbaru.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Belum ada kelas pengampuan tercatat.
              </div>
            ) : (
              kelasTerbaru.map((k) => (
                <div key={k.id_kelas} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        <span className="font-mono text-indigo-700 mr-2">{k.kode_mk}</span>
                        {k.nama_mk}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {k.tahun_akademik} • {k.semester} • {k.sks} SKS
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        k.peran_di_kelas === 'koordinator'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {k.peran_di_kelas === 'koordinator' ? 'Koordinator' : 'Anggota'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Status Input Nilai</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Upload Nilai SIAKAD</span>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                  Tersedia
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Edit Manual per Sel</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Buka tab <strong>Kelola Kelas</strong> untuk mulai input nilai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}