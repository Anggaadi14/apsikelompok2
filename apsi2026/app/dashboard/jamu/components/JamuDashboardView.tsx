'use client';

import { UserSession } from '../../../data/users';
import {
  Target, CheckCircle2, XCircle, AlertTriangle,
  FileWarning, Download, Filter, FileText, FileSpreadsheet, Image as ImageIcon
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface JamuDashboardViewProps {
  sessionUser: UserSession;
}

type Option = { value: string; label: string };
type CplChartRow = { id: string; name: string; target: number; realisasi: number; deskripsi?: string };
type CriticalIk = { kode: string; nilai: number; target: number; deskripsi: string; cpl: string };
type IncompleteClass = { id_kelas: number; label: string; status: string };
type JsPdfWithAutoTable = { lastAutoTable?: { finalY?: number } };
type DashboardData = {
  options: {
    tahun: string[];
    semester: string[];
    kurikulum: Option[];
    angkatan: string[];
    cpl: Option[];
    mata_kuliah: Option[];
    kelas: Option[];
  };
  stats: {
    rata_cpl: number;
    cpl_tercapai: number;
    cpl_total: number;
    cpl_belum: number;
    cpl_belum_label: string;
    ik_bermasalah: number;
    mk_belum_upload: number;
  };
  targetRealisasiCPL: CplChartRow[];
  criticalCpl: CplChartRow[];
  criticalIk: CriticalIk[];
  incompleteClasses: IncompleteClass[];
};

function authHeaders(): Record<string, string> {
  const raw = sessionStorage.getItem('currentUser');
  return raw ? { 'x-user-session': raw } : {};
}

export default function JamuDashboardView({ sessionUser }: JamuDashboardViewProps) {
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterSemester, setFilterSemester] = useState('Semua');
  const [filterAngkatan, setFilterAngkatan] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
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
    if (filterAngkatan !== 'Semua') params.set('angkatan', filterAngkatan);
    if (filterKelas !== 'Semua') params.set('kelas', filterKelas);
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
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memuat dashboard.');
        setData(json.data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Gagal memuat dashboard.');
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [filterTahun, filterSemester, filterAngkatan, filterKelas, filterCPL]);

  const stats = useMemo(() => {
    const s = data?.stats;
    return [
      {
        label: 'Rata-rata Capaian CPL',
        value: s ? String(s.rata_cpl) : '-',
        target: 'Target: mengikuti CPL',
        icon: <Target className="w-6 h-6" />,
        color: 'bg-indigo-50 text-indigo-600',
        borderColor: 'border-indigo-200',
      },
      {
        label: 'CPL Tercapai Target',
        value: s ? `${s.cpl_tercapai} / ${s.cpl_total}` : '-',
        target: 'CPL aman',
        icon: <CheckCircle2 className="w-6 h-6" />,
        color: 'bg-emerald-50 text-emerald-600',
        borderColor: 'border-emerald-200',
      },
      {
        label: 'CPL Belum Tercapai',
        value: s ? String(s.cpl_belum) : '-',
        target: s?.cpl_belum_label || '-',
        icon: <XCircle className="w-6 h-6" />,
        color: 'bg-rose-50 text-rose-600',
        borderColor: 'border-rose-200',
      },
      {
        label: 'IK Bermasalah',
        value: s ? `${s.ik_bermasalah} IK` : '-',
        target: 'Perlu evaluasi',
        icon: <AlertTriangle className="w-6 h-6" />,
        color: 'bg-amber-50 text-amber-600',
        borderColor: 'border-amber-200',
      },
      {
        label: 'MK Belum Upload Nilai',
        value: s ? `${s.mk_belum_upload} MK` : '-',
        target: 'Sesuai filter',
        icon: <FileWarning className="w-6 h-6" />,
        color: 'bg-slate-50 text-slate-600',
        borderColor: 'border-slate-200',
      },
    ];
  }, [data]);

  const targetRealisasiCPL = data?.targetRealisasiCPL ?? [];
  const criticalCpl = data?.criticalCpl ?? [];
  const criticalIk = data?.criticalIk ?? [];
  const radarData = targetRealisasiCPL.map((cpl) => ({
    subject: cpl.id,
    realisasi: cpl.realisasi,
    target: cpl.target,
    name: cpl.name,
  }));

  const handleDownloadPdf = async () => {
    setIsDownloadOpen(false);
    if (!data) return;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SICPL - Portal JAMU', marginX, 16);
    doc.setFontSize(11);
    doc.text('Laporan Monitoring OBE Program Studi', marginX, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      marginX,
      29,
    );

    doc.setFontSize(9);
    const filterLine = `Tahun Ajar: ${filterTahun}  ·  Semester: ${filterSemester}  ·  Angkatan: ${filterAngkatan}  ·  CPL: ${filterCPL}  ·  Kelas: ${filterKelas}`;
    doc.text(doc.splitTextToSize(`Filter: ${filterLine}`, 180), marginX, 37);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      doc.splitTextToSize(
        `Rata-rata CPL: ${data.stats.rata_cpl}   ·   Tercapai: ${data.stats.cpl_tercapai}/${data.stats.cpl_total}   ·   Belum Tercapai: ${data.stats.cpl_belum}   ·   IK Bermasalah: ${data.stats.ik_bermasalah}   ·   MK Belum Upload: ${data.stats.mk_belum_upload}`,
        180,
      ),
      marginX,
      50,
    );
    doc.setFont('helvetica', 'normal');

    autoTable(doc, {
      startY: 58,
      margin: { left: marginX, right: marginX },
      head: [['CPL', 'Nama', 'Target', 'Realisasi', 'Status']],
      body: targetRealisasiCPL.map((c) => [
        c.id,
        c.name,
        c.target,
        c.realisasi,
        c.realisasi >= c.target ? 'Tercapai' : 'Belum Tercapai',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    let cursorY = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 58) + 10;
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CPL & IK Kritis', marginX, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 5;

    const criticalRows = [
      ...criticalCpl.map((c) => [c.id, c.deskripsi || c.name, c.realisasi, c.target]),
      ...criticalIk.map((ik) => [ik.kode, ik.deskripsi, ik.nilai, ik.target]),
    ];

    if (criticalRows.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['Kode', 'Deskripsi', 'Nilai', 'Target']],
        body: criticalRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [225, 29, 72] },
      });
      cursorY = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? cursorY) + 10;
    } else {
      doc.setFontSize(9);
      doc.text('Tidak ada CPL/IK kritis pada filter ini.', marginX, cursorY);
      cursorY += 10;
    }

    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Status Data Belum Lengkap', marginX, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 5;

    const incomplete = data.incompleteClasses ?? [];
    if (incomplete.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['Mata Kuliah / Kelas', 'Status']],
        body: incomplete.map((k) => [k.label, k.status]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 116, 139] },
      });
    } else {
      doc.setFontSize(9);
      doc.text('Semua kelas pada filter ini sudah punya upload nilai sukses.', marginX, cursorY);
    }

    doc.save(`Laporan_OBE_JAMU_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitoring OBE Penjaminan Mutu</h1>
          <p className="text-gray-600 mt-1">Pemantauan Ketercapaian CPL & IK Program Studi {sessionUser.prodi}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDownloadOpen(!isDownloadOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>

          {isDownloadOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
              <button
                onClick={handleDownloadPdf}
                disabled={!data}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
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
          <h2 className="text-sm font-semibold text-gray-700">Filter Analisis OBE</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <FilterSelect label="Tahun Ajar" value={filterTahun} onChange={setFilterTahun} values={data?.options.tahun ?? []} />
          <FilterSelect label="Semester" value={filterSemester} onChange={setFilterSemester} values={data?.options.semester ?? []} />
          <FilterSelect label="Angkatan" value={filterAngkatan} onChange={setFilterAngkatan} values={data?.options.angkatan ?? []} />
          <FilterSelect label="CPL" value={filterCPL} onChange={setFilterCPL} options={data?.options.cpl ?? []} />
          <FilterSelect label="Kelas" value={filterKelas} onChange={setFilterKelas} options={data?.options.kelas ?? []} />
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
              <h3 className="font-bold text-sm">Warning: CPL & IK Kritis</h3>
            </div>
            <div className="space-y-5">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-rose-700 mb-2">CPL Kritis</h4>
                <div className="space-y-3">
                  {criticalCpl.slice(0, 4).map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded border border-rose-100 shadow-sm">
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-bold text-gray-900">{item.id}</span>
                      </div>
                      <p className="text-xs text-gray-500">{item.deskripsi || item.name || 'Perlu evaluasi lanjutan.'}</p>
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
                      <p className="text-xs text-gray-500">{item.deskripsi || 'Perlu evaluasi lanjutan.'}</p>
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
              <FileWarning className="w-5 h-5" />
              <h3 className="font-bold text-sm">Status Data Belum Lengkap</h3>
            </div>
            <div className="space-y-2">
              {(data?.incompleteClasses ?? []).map((item) => (
                <div key={item.id_kelas} className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100 text-xs shadow-sm gap-3">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-100 whitespace-nowrap">{item.status}</span>
                </div>
              ))}
              {!loading && !data?.incompleteClasses.length && (
                <p className="text-xs text-slate-600">Semua kelas pada filter ini sudah punya upload nilai sukses.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Grafik Radar Capaian CPL</h2>
            <p className="text-xs text-gray-500 mb-4">Visualisasi realisasi dan target CPL 1-10 program studi.</p>

            <div className="h-[400px] w-full flex justify-center">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar name="Realisasi" dataKey="realisasi" stroke="#6366f1" fill="#6366f1" fillOpacity={0.45} />
                    <Radar name="Target" dataKey="target" stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(label) => radarData.find((c) => c.subject === label)?.name ?? label}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">Belum ada data CPL untuk filter ini.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Target vs Realisasi CPL (Tahun Ajar {filterTahun})</h2>

          <div className="h-[320px] w-full">
            {targetRealisasiCPL.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={targetRealisasiCPL} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="id" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label) => targetRealisasiCPL.find((c) => c.id === label)?.name ?? label}
                  />
                  <Legend />
                  <Bar dataKey="realisasi" name="Realisasi" radius={[4, 4, 0, 0]}>
                    {targetRealisasiCPL.map((cpl, i) => (
                      <Cell key={i} fill={cpl.realisasi < cpl.target ? '#f43f5e' : '#10b981'} />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Target"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">Belum ada data CPL untuk filter ini.</div>
            )}
          </div>
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
