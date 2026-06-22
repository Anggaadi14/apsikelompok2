'use client';

import { useMemo, useState } from 'react';
import {
  User,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Target,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { CplDataItem, DetailCplItem } from '../data';

interface CplViewProps {
  cplData: CplDataItem[];
  detailCplData: DetailCplItem[];
  profile?: {
    nama: string;
    nim: string;
    prodi?: string;
    ipk: number;
  };
}

export default function CplView({ cplData, detailCplData, profile }: CplViewProps) {
  const [cplSubTab, setCplSubTab] = useState<'grafik' | 'report'>('grafik');
  const [expandedCPL, setExpandedCPL] = useState<number | null>(null);

  const radarData = cplData.map((cpl) => ({
    subject: cpl.name,
    nilai: cpl.nilai,
    target: cpl.target,
  }));

  const detailByCpl = useMemo(() => {
    const map = new Map<string, DetailCplItem>();
    for (const d of detailCplData) map.set(d.cpl, d);
    return map;
  }, [detailCplData]);

  const RadarTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const subject = payload[0]?.payload?.subject;
    const detail = detailByCpl.get(subject);
    const nilai = payload.find((p: any) => p.dataKey === 'nilai')?.value;
    const target = payload.find((p: any) => p.dataKey === 'target')?.value;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs max-w-xs">
        <p className="font-bold text-slate-800">{subject}</p>
        <p className="text-slate-600 mb-2">
          Nilai: <span className="font-bold text-indigo-600">{nilai}</span>
          {' · '}Target: <span className="font-bold text-red-500">{target}</span>
        </p>
        {detail && detail.ik.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {detail.ik.map((ikItem, i) => (
              <div key={i} className="border-t border-gray-100 pt-1.5 first:border-t-0 first:pt-0">
                <p className="font-semibold text-purple-700">
                  {ikItem.kode}
                  <span className="text-slate-500 font-normal"> — {ikItem.deskripsi}</span>
                </p>
                <ul className="ml-2 mt-0.5 space-y-0.5">
                  {ikItem.cpmk.map((c, j) => (
                    <li key={j} className="text-slate-600 leading-snug">
                      <span className="font-medium text-blue-700">{c.kode}</span> — {c.matakuliah}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 italic">Belum ada data IK/CPMK pembentuk.</p>
        )}
      </div>
    );
  };

  const validCplData = cplData.filter((c) => c.nilai > 0);
  const averageCpl = validCplData.length > 0
    ? Math.round(validCplData.reduce((acc, c) => acc + c.nilai, 0) / validCplData.length)
    : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Monitoring Capaian CPL</h2>

      {/* Sub Tabs Navigation */}
      <div className="bg-white rounded-xl shadow border border-gray-200 mb-6 overflow-hidden">
        <div className="border-b border-gray-200 bg-slate-50/50">
          <div className="flex">
            <button
              onClick={() => setCplSubTab('grafik')}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 cursor-pointer transition ${
                cplSubTab === 'grafik'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Grafik CPL
            </button>
            <button
              onClick={() => setCplSubTab('report')}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 cursor-pointer transition ${
                cplSubTab === 'report'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Report Tabel
            </button>
          </div>
        </div>

<div className="p-6">
  {/* TAB 1: Grafik CPL */}
  {cplSubTab === 'grafik' && (
    <div className="space-y-8 animate-fadeIn">
      <h3 className="text-lg font-bold text-slate-800">
        Visualisasi Grafik CPL 1-10
      </h3>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="text-sm font-bold text-slate-700 mb-4">
          Grafik Radar - Capaian CPL
        </h4>

        <div className="h-[400px] w-full flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="80%"
              data={radarData}
            >
              <PolarGrid stroke="#e2e8f0" />

              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: '#475569' }}
              />

              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />

              <Radar
                name="Nilai Saya"
                dataKey="nilai"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.5}
              />

              <Radar
                name="Target"
                dataKey="target"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.15}
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
              />

              <Tooltip content={<RadarTooltipContent />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            CPL Tercapai
          </p>
          <p className="text-3xl font-extrabold text-green-600 mt-1">
            {cplData.filter((c) => c.status === 'Tercapai').length}
          </p>
        </div>

        <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Belum Tercapai
          </p>
          <p className="text-3xl font-extrabold text-red-600 mt-1">
            {cplData.filter((c) => c.status === 'Belum Tercapai').length}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Belum Ditempuh
          </p>
          <p className="text-3xl font-extrabold text-gray-600 mt-1">
            {cplData.filter((c) => c.status === 'Belum Ditempuh').length}
          </p>
        </div>
      </div>
    </div>
  )}
          {/* TAB 3: Report Tabel */}
          {cplSubTab === 'report' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Report Tabel - Monitoring CPL Individu</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ringkasan lengkap hierarki pembentuk CPL, IK, dan CPMK Mata Kuliah</p>
              </div>

              {/* Student Profile Card Mini — PAKAI PROP `profile` */}
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white p-5 rounded-xl shadow-md flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl translate-x-4 -translate-y-4" />
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                  <User className="w-6 h-6 text-indigo-200 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-extrabold truncate">{profile?.nama ?? '-'}</h4>
                  <p className="text-indigo-200 text-xs tracking-wider uppercase font-bold mt-0.5">
                    NIM: {profile?.nim ?? '-'}{profile?.prodi ? ` • ${profile.prodi}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase block tracking-wider">IPK</span>
                  <span className="text-2xl font-black leading-none">
                    {profile?.ipk !== undefined ? profile.ipk.toFixed(2) : '-'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 border border-gray-200 rounded-xl">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tercapai</p>
                    <p className="text-xl font-extrabold text-green-600 mt-1">
                      {cplData.filter((c) => c.status === 'Tercapai').length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Belum Tercapai</p>
                    <p className="text-xl font-extrabold text-red-600 mt-1">
                      {cplData.filter((c) => c.status === 'Belum Tercapai').length}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Belum Ditempuh</p>
                    <p className="text-xl font-extrabold text-gray-600 mt-1">
                      {cplData.filter((c) => c.status === 'Belum Ditempuh').length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Rata-rata CPL</p>
                    <p className="text-xl font-extrabold text-blue-600 mt-1">{averageCpl}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-gray-200 font-bold text-sm text-slate-800">
                  Ringkasan Capaian CPL 1-10
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                    <thead className="bg-slate-100/70 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 font-bold text-slate-500 w-12 text-center">No</th>
                        <th className="py-3 px-4 font-bold text-slate-500 w-24">CPL</th>
                        <th className="py-3 px-4 font-bold text-slate-500">Deskripsi Capaian Pembelajaran</th>
                        <th className="py-3 px-4 font-bold text-slate-500 text-center w-36">Kategori</th>
                        <th className="py-3 px-4 font-bold text-slate-500 text-center w-20">Nilai</th>
                        <th className="py-3 px-4 font-bold text-slate-500 text-center w-20">Target</th>
                        <th className="py-3 px-4 font-bold text-slate-500 text-center w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cplData.map((cpl, idx) => {
                        const description =
                          detailCplData.find((d) => d.cpl === cpl.name)?.deskripsi ||
                          'Mampu menerapkan kompetensi rekayasa tingkat lanjut di bidang teknik industri';
                        return (
                          <tr
                            key={idx}
                            className={`transition hover:bg-slate-50/50 ${
                              cpl.status === 'Tercapai'
                                ? 'bg-green-50/20'
                                : cpl.status === 'Belum Tercapai'
                                ? 'bg-red-50/20'
                                : 'bg-gray-50/20'
                            }`}
                          >
                            <td className="py-3 px-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{cpl.name}</td>
                            <td className="py-3 px-4 text-slate-600 max-w-md leading-relaxed">{description}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full uppercase text-[9px]">
                                {cpl.kategori}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-extrabold text-slate-800 text-sm">
                              {cpl.nilai > 0 ? cpl.nilai : '-'}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500 font-bold">{cpl.target}</td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                  cpl.status === 'Tercapai'
                                    ? 'bg-green-600 text-white'
                                    : cpl.status === 'Belum Tercapai'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-400 text-white'
                                }`}
                              >
                                {cpl.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-base font-bold text-slate-800">Detail Pembentuk Nilai CPL</h4>
                  <span className="text-xs text-slate-500 italic">Klik pada CPL untuk membuka breakdown indikator</span>
                </div>

                <div className="space-y-3">
                  {detailCplData.map((item, idx) => {
                    const isExpanded = expandedCPL === idx;

                    return (
                      <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div
                          onClick={() => setExpandedCPL(isExpanded ? null : idx)}
                          className={`p-4 cursor-pointer flex items-center justify-between gap-4 transition ${
                            item.status === 'Tercapai'
                              ? 'bg-green-50 hover:bg-green-100/50'
                              : item.status === 'Belum Tercapai'
                              ? 'bg-red-50 hover:bg-red-100/50'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                            )}
                            <GraduationCap
                              className={`w-6 h-6 shrink-0 ${
                                item.status === 'Tercapai'
                                  ? 'text-green-600'
                                  : item.status === 'Belum Tercapai'
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-base">{item.cpl}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    item.status === 'Tercapai'
                                      ? 'bg-green-600 text-white'
                                      : item.status === 'Belum Tercapai'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-400 text-white'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 truncate mt-0.5 leading-relaxed">{item.deskripsi}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-gray-500 font-bold block uppercase leading-none">Capaian</span>
                            <span className="text-2xl font-black text-slate-800 mt-1 block">
                              {item.nilai > 0 ? item.nilai.toFixed(1) : '-'}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-100 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider w-1/4">IK/PI</th>
                                  <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-center w-20">Bobot</th>
                                  <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider w-1/3">CPMK</th>
                                  <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider">Mata Kuliah</th>
                                  <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-center w-12">Smt</th>
                                  <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-center w-24">Nilai</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {item.ik.map((ikItem, ikIdx) =>
                                  ikItem.cpmk.map((cpmkItem, cpmkIdx) => (
                                    <tr key={`${ikIdx}-${cpmkIdx}`} className="hover:bg-slate-50/30 transition">
                                      {cpmkIdx === 0 && (
                                        <>
                                          <td
                                            rowSpan={ikItem.cpmk.length}
                                            className="py-3 px-4 border-r border-slate-100 bg-purple-50/30 font-medium align-top"
                                          >
                                            <span className="font-bold text-purple-700 block">{ikItem.kode}</span>
                                            <span className="text-slate-600 mt-1 block leading-relaxed">{ikItem.deskripsi}</span>
                                          </td>
                                          <td
                                            rowSpan={ikItem.cpmk.length}
                                            className="py-3 px-4 border-r border-slate-100 bg-purple-50/30 font-bold text-center text-purple-700 align-top"
                                          >
                                            {ikItem.bobot}%
                                          </td>
                                        </>
                                      )}
                                      <td className="py-3 px-4 bg-blue-50/20 align-top">
                                        <span className="font-bold text-blue-700 block">{cpmkItem.kode}</span>
                                        <span className="text-slate-600 mt-1 block leading-relaxed">{cpmkItem.deskripsi}</span>
                                      </td>
                                      <td className="py-3 px-4 text-slate-700 font-semibold">{cpmkItem.matakuliah}</td>
                                      <td className="py-3 px-4 text-center text-slate-500 font-semibold">{cpmkItem.semester}</td>
                                      <td className="py-3 px-4 text-center align-middle">
                                        <span
                                          className={`inline-block px-2.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                                            cpmkItem.nilaiMK === '-'
                                              ? 'bg-slate-100 text-slate-500'
                                              : cpmkItem.nilaiMK.startsWith('A')
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                          }`}
                                        >
                                          {cpmkItem.nilaiMK}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}