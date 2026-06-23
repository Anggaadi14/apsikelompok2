'use client';

import { UserSession } from '../../../data/users';
import { Users, BookOpen, FileCheck, CheckSquare, XCircle, FileText, Upload, Filter, UserCheck, Download, Loader2, AlertCircle, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';

interface AdminDashboardViewProps {
  sessionUser: UserSession;
  onNavigate: (tab: string) => void;
}

type Level = 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING';

interface StatsData {
  mahasiswa: number;
  dosen: number;
  cpl: number;
  ik: number;
  cpmk: number;
  obe_total: number;
  mk_tayang: number;
  upload_masuk: number;
  upload_total: number;
  data_belum_lengkap: number;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  level: Level;
  message: string;
  source: 'upload_nilai' | 'user';
}

interface TaOption { kode: string; semester: string; is_active: 0 | 1; }
interface KurOption { id_kurikulum: number; kode: string; nama: string; is_active: 0 | 1; }

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

function parseTaKode(kode: string): { ta: string; sem: string } {
  // "2025/2026-Ganjil" -> ta="2025/2026", sem="Ganjil"
  const m = kode.match(/^(\d{4}\/\d{4})-(.+)$/);
  return m ? { ta: m[1], sem: m[2] } : { ta: kode, sem: '' };
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return diffHr === 0 ? `${diffMin} menit lalu` : `${diffHr} jam lalu`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDashboardView({ sessionUser, onNavigate }: AdminDashboardViewProps) {
  // Filter state — default akan di-set dari TA aktif setelah fetch.
  const [filterTaKode, setFilterTaKode] = useState<string>('');
  const [filterKur, setFilterKur] = useState<string>('');
  const [taOptions, setTaOptions] = useState<TaOption[]>([]);
  const [kurOptions, setKurOptions] = useState<KurOption[]>([]);

  // Data state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dropdown options (TA + Kurikulum) sekali di awal
  useEffect(() => {
    (async () => {
      try {
        const [taRes, kurRes] = await Promise.all([
          fetch('/api/admin/tahun-akademik', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/admin/kurikulum',      { headers: authHeaders(), cache: 'no-store' }).catch(() => null),
        ]);
        const taJson = taRes ? await taRes.json().catch(() => ({})) : {};
        if (taJson?.success && Array.isArray(taJson.data)) {
          setTaOptions(taJson.data as TaOption[]);
          const active = (taJson.data as TaOption[]).find((t) => t.is_active === 1);
          if (active) setFilterTaKode(active.kode);
          else if ((taJson.data as TaOption[]).length) setFilterTaKode((taJson.data as TaOption[])[0].kode);
        }
        if (kurRes) {
          const kurJson = await kurRes.json().catch(() => ({}));
          if (kurJson?.success && Array.isArray(kurJson.data)) {
            setKurOptions(kurJson.data as KurOption[]);
            const active = (kurJson.data as KurOption[]).find((k) => k.is_active === 1);
            if (active) setFilterKur(active.kode);
          }
        }
      } catch {
        // ignore, akan pakai default kosong
      }
    })();
  }, []);

  const { ta, sem } = parseTaKode(filterTaKode);

  const fetchStats = useCallback(async () => {
    if (!filterTaKode && taOptions.length === 0) return; // belum siap
    setLoadingStats(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (ta)  p.set('ta', ta);
      if (sem) p.set('sem', sem);
      if (filterKur) p.set('kur', filterKur);
      const res = await fetch(`/api/admin/dashboard-stats?${p.toString()}`, { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setError(json.message || 'Gagal memuat statistik.');
      else setStats(json.data as StatsData);
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setLoadingStats(false); }
  }, [ta, sem, filterKur, filterTaKode, taOptions.length]);

  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/admin/dashboard-activity?limit=10', { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) setActivity(json.data as ActivityItem[]);
    } catch { /* noop */ }
    finally { setLoadingActivity(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const refresh = () => { fetchStats(); fetchActivity(); };

  const statCards = [
    { label: 'Data Mahasiswa',      value: stats ? stats.mahasiswa.toLocaleString('id-ID') : '-', icon: <Users className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600', borderColor: 'border-blue-200' },
    { label: 'Data Dosen',          value: stats ? stats.dosen.toLocaleString('id-ID')     : '-', icon: <UserCheck className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600', borderColor: 'border-indigo-200' },
    { label: 'Data CPL/IK/CPMK',    value: stats ? stats.obe_total.toLocaleString('id-ID') : '-', icon: <BookOpen className="w-6 h-6" />, color: 'bg-green-50 text-green-600', borderColor: 'border-green-200',
      sub: stats ? `${stats.cpl} CPL \u00B7 ${stats.ik} IK \u00B7 ${stats.cpmk} CPMK` : undefined },
    { label: 'Mata Kuliah Tayang',  value: stats ? stats.mk_tayang.toLocaleString('id-ID') : '-', icon: <FileText className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600', borderColor: 'border-purple-200' },
    { label: 'Upload Nilai Masuk',  value: stats ? `${stats.upload_masuk}/${stats.upload_total}` : '-', icon: <CheckSquare className="w-6 h-6" />, color: 'bg-teal-50 text-teal-600', borderColor: 'border-teal-200' },
    { label: 'Data Belum Lengkap',  value: stats ? stats.data_belum_lengkap.toLocaleString('id-ID') : '-', icon: <XCircle className="w-6 h-6" />, color: 'bg-red-50 text-red-600', borderColor: 'border-red-200' },
  ];

  const getLevelColor = (level: Level) => {
    switch (level) {
      case 'INFO':    return 'text-blue-600 bg-blue-50 border border-blue-200';
      case 'SUCCESS': return 'text-green-600 bg-green-50 border border-green-200';
      case 'WARNING': return 'text-orange-600 bg-orange-50 border border-orange-200';
      case 'ERROR':   return 'text-red-600 bg-red-50 border border-red-200';
      default:        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };
  const getDotColor = (level: Level) =>
    level === 'SUCCESS' ? 'bg-green-500' : level === 'ERROR' ? 'bg-red-500' : level === 'WARNING' ? 'bg-orange-500' : 'bg-blue-500';

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Selamat datang, {sessionUser.name}</p>
          <p className="text-sm text-gray-500">Ringkasan data akademik Program Studi</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterTaKode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterTaKode(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            {taOptions.length === 0 && <option value="">Tahun Akademik</option>}
            {taOptions.map((t: TaOption) => (
              <option key={t.kode} value={t.kode}>{t.kode}{t.is_active === 1 ? ' (aktif)' : ''}</option>
            ))}
          </select>
          <select
            value={filterKur}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterKur(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            {kurOptions.length === 0 && <option value="">Kurikulum</option>}
            {kurOptions.map((k: KurOption) => (
              <option key={k.id_kurikulum} value={k.kode}>{k.kode}{k.is_active === 1 ? ' (aktif)' : ''}</option>
            ))}
          </select>
          <button
            onClick={refresh}
            title="Refresh data"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s, idx) => (
          <div key={idx} className={`border ${s.borderColor} rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative`}>
            <div className={`${s.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : s.icon}
            </div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            {s.sub && <p className="text-[11px] text-gray-500 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Aktivitas Sistem Akademik</h2>
            </div>
            <button onClick={fetchActivity} className="text-sm text-indigo-600 font-medium hover:text-indigo-800">Refresh</button>
          </div>
          <div className="p-0">
            {loadingActivity ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat aktivitas&hellip;
              </div>
            ) : activity.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">Belum ada aktivitas tercatat.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activity.map((log: ActivityItem) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 flex items-start gap-4 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      <span className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${getDotColor(log.level)}`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{log.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(log.timestamp)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-fit">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            <button type="button" onClick={() => onNavigate('upload')} className="w-full flex items-center justify-between p-3 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Upload Data Mahasiswa</span>
              <Upload className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
            </button>
            <button type="button" onClick={() => onNavigate('upload')} className="w-full flex items-center justify-between p-3 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Upload Data CPL/IK/CPMK</span>
              <Upload className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
            </button>
            <button type="button" onClick={() => onNavigate('upload')} className="w-full flex items-center justify-between p-3 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Upload Data Dosen</span>
              <UserCheck className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
            </button>
            <button type="button" onClick={() => onNavigate('kelas')} className="w-full flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Kelola Kelas Tayang</span>
              <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button type="button" onClick={() => onNavigate('users')} className="w-full flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors group">
              <span className="text-sm font-medium">Manajemen User</span>
              <Users className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button type="button" onClick={() => onNavigate('upload')} className="w-full flex items-center justify-between p-3 border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 rounded-lg transition-colors group mt-4">
              <span className="text-sm font-medium">Download Template Master</span>
              <Download className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}