'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Target, XCircle, AlertTriangle,
  Download, Filter, FileText, FileSpreadsheet, Image as ImageIcon,
  CheckSquare, AlertCircle
} from 'lucide-react';

type Option = { value: string; label: string };
type CplChartRow = { id: string; name: string; target: number; realisasi: number; deskripsi?: string };
type CriticalIk = { kode: string; nilai: number; target: number; deskripsi: string; cpl: string };
type DashboardData = {
  options: {
    tahun: string[];
    semester: string[];
    kurikulum: Option[];
    angkatan: string[];
    cpl: Option[];
    mata_kuliah: Option[];
  };
  stats: {
    rata_cpl: number;
    cpl_belum: number;
    cpl_belum_label: string;
  };
  mutu: {
    kualitas_asesmen: number;
    rekomendasi_aktif: number;
    wording_pending: number;
  };
  targetRealisasiCPL: CplChartRow[];
  criticalCpl: CplChartRow[];
  criticalIk: CriticalIk[];
};

function authHeaders(): Record<string, string> {
  const raw = sessionStorage.getItem('currentUser');
  return raw ? { 'x-user-session': raw } : {};
}

export default function JamuDashboardView() {
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterSemester, setFilterSemester] = useState('Semua');
  const [filterKurikulum, setFilterKurikulum] = useState('Semua');
  const [filterAngkatan, setFilterAngkatan] = useState('Semua');
  const [filterMK, setFilterMK] = useState('Semua');
  const [filterCPL, setFilterCPL] = useState('Semua');
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (filterTahun !== 'Semua') params.set('ta', filterTahun);
    if (filterSemester !== 'Semua') params.set('sem', filterSemester);
    if (filterKurikulum !== 'Semua') params.set('kur', filterKurikulum);
    if (filterAngkatan !== 'Semua') params.set('angkatan', filterAngkatan);
    if (filterMK !== 'Semua') params.set('mk', filterMK);
    if (filterCPL !== 'Semua') params.set('cpl', filterCPL);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    fetch(`/api/jamu/dashboard?${params.toString()}`, {
      headers: authHeaders(),
      cache: 'no-store',
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memuat dashboard mutu.');
        setData(json.data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Gagal memuat dashboard mutu.');
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [filterTahun, filterSemester, filterKurikulum, filterAngkatan, filterMK, filterCPL]);

  const stats = useMemo(() => [
    {
      label: 'Rata-rata Capaian CPL',
      value: data ? `${data.stats.rata_cpl}%` : '-',
      target: 'Target: mengikuti CPL',
      icon: <Target className="w-6 h-6" />,
      color: 'bg-indigo-50 text-indigo-600',
      borderColor: 'border-indigo-200',
    },
    {
      label: 'CPL di Bawah Target',
      value: data ? `${data.stats.cpl_belum} CPL` : '-',
      target: data?.stats.cpl_belum_label || '-',
      icon: <XCircle className="w-6 h-6" />,
      color: 'bg-rose-50 text-rose-600',
      borderColor: 'border-rose-200',
    },
    {
      label: 'Kualitas Asesmen',
      value: data ? `${data.mutu.kualitas_asesmen}%` : '-',
      target: 'Berdasar kelengkapan upload',
      icon: <CheckSquare className="w-6 h-6" />,
      color: 'bg-emerald-50 text-emerald-600',
      borderColor: 'border-emerald-200',
    },
    {
      label: 'Rekomendasi Mutu Aktif',
      value: data ? `${data.mutu.rekomendasi_aktif} Usulan` : '-',
      target: 'Draft/terkirim',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'bg-amber-50 text-amber-600',
      borderColor: 'border-amber-200',
    },
    {
      label: 'Usulan Wording Pending',
      value: data ? `${data.mutu.wording_pending} Draft` : '-',
      target: 'Menunggu review',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
  ], [data]);
  const criticalCpl = data?.criticalCpl ?? [];
  const criticalIk = data?.criticalIk ?? [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
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

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Filter Analisis Mutu</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <FilterSelect label="Tahun Ajar" value={filterTahun} onChange={setFilterTahun} values={data?.options.tahun ?? []} />
          <FilterSelect label="Semester" value={filterSemester} onChange={setFilterSemester} values={data?.options.semester ?? []} />
          <FilterSelect label="Kurikulum" value={filterKurikulum} onChange={setFilterKurikulum} options={data?.options.kurikulum ?? []} />
          <FilterSelect label="Angkatan" value={filterAngkatan} onChange={setFilterAngkatan} values={data?.options.angkatan ?? []} />
          <FilterSelect label="CPL" value={filterCPL} onChange={setFilterCPL} options={data?.options.cpl ?? []} />
          <FilterSelect label="Mata Kuliah" value={filterMK} onChange={setFilterMK} options={data?.options.mata_kuliah ?? []} />
        </div>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{error}</div>}

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
              <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
            </div>
            <p className="text-xs font-medium text-gray-500 mt-2 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{stat.target}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 text-rose-800">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Anomali & CPL Kritis (JAMU)</h3>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-rose-700 mb-2">CPL Kritis</h4>
                <div className="space-y-3">
                  {criticalCpl.slice(0, 4).map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded border border-rose-100 shadow-sm">
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-bold text-gray-900">{item.id}</span>
                      </div>
                      <p className="text-xs text-gray-500">{item.deskripsi || item.name || 'Perlu validasi mutu lanjutan.'}</p>
                    </div>
                  ))}
                  {!loading && criticalCpl.length === 0 && (
                    <p className="text-xs text-rose-700">Tidak ada CPL kritis pada filter ini.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2">IK Bermasalah</h4>
                <div className="space-y-3">
                  {criticalIk.slice(0, 4).map((item) => (
                    <div key={item.kode} className="bg-white p-3 rounded border border-amber-100 shadow-sm">
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-bold text-gray-900">{item.kode}</span>
                      </div>
                      <p className="text-xs text-gray-500">{item.deskripsi || 'Perlu validasi mutu lanjutan.'}</p>
                    </div>
                  ))}
                  {!loading && criticalIk.length === 0 && (
                    <p className="text-xs text-amber-700">Tidak ada IK bermasalah pada filter ini.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 text-slate-800">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Temuan Sebaran Nilai</h3>
            </div>
            <div className="space-y-2">
              {criticalIk.slice(0, 3).map((ik) => (
                <div key={ik.kode} className="bg-white p-3 rounded border border-slate-100 text-xs shadow-sm space-y-1">
                  <div className="flex justify-between font-medium text-gray-700 gap-3">
                    <span>{ik.kode}</span>
                    <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Perlu Review</span>
                  </div>
                  <p className="text-[11px] text-gray-500">{ik.deskripsi}</p>
                </div>
              ))}
              {!loading && !data?.criticalIk.length && <p className="text-xs text-slate-600">Tidak ada temuan IK bermasalah.</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Target vs Realisasi Capaian CPL (Analisis Mutu {filterTahun})</h2>

          <div className="space-y-6">
            {(data?.targetRealisasiCPL ?? []).map((cpl) => {
              const isWarning = cpl.realisasi < cpl.target;
              return (
                <div key={cpl.id}>
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
                    <div className="absolute top-0 bottom-0 w-1 bg-gray-800 z-10" style={{ left: `${Math.min(cpl.target, 100)}%` }} />
                    <div
                      className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(cpl.realisasi, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!loading && !data?.targetRealisasiCPL.length && (
              <div className="py-16 text-center text-sm text-gray-500">Belum ada data CPL untuk filter ini.</div>
            )}
          </div>
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
