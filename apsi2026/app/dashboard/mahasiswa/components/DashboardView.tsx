'use client';

import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { CplDataItem } from '../data';

interface DashboardViewProps {
  cplData: CplDataItem[];
  setActiveTab: (tab: 'dashboard' | 'cpl') => void;
}

export default function DashboardView({ cplData, setActiveTab }: DashboardViewProps) {
  const tercapaiCount = cplData.filter((c) => c.status === 'Tercapai').length;
  const belumTercapaiCount = cplData.filter((c) => c.status === 'Belum Tercapai').length;
  const belumDitempuhCount = cplData.filter((c) => c.status === 'Belum Ditempuh').length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Tercapai */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">CPL Tercapai</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">
                {tercapaiCount}
                <span className="text-sm text-gray-400 font-normal"> / {cplData.length}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shadow-inner shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-green-600 mt-3 flex items-center gap-1">
            <span>{Math.round((tercapaiCount / cplData.length) * 100)}% dari target tercapai</span>
          </p>
        </div>

        {/* Card 2: Belum Tercapai */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Belum Tercapai</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{belumTercapaiCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shadow-inner shrink-0">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-red-600 mt-3">Butuh perbaikan & peningkatan</p>
        </div>

        {/* Card 3: Belum Ditempuh */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Belum Ditempuh</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{belumDitempuhCount}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shadow-inner shrink-0">
              <MinusCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-500 mt-3">Mata kuliah belum diambil</p>
        </div>
      </div>

      {/* Capaian Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800">Grafik Capaian CPL 1-10</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Nilai di atas garis target merah (80) menunjukkan CPL tercapai. CPL bernilai 0 berarti belum ditempuh.
          </p>
        </div>
        <div className="h-[350px] w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cplData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <ReferenceLine
                y={80}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: 'Target Minimum: 80',
                  position: 'insideBottomRight',
                  fill: '#ef4444',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />
              <Bar dataKey="nilai" radius={[4, 4, 0, 0]} name="Nilai CPL">
                {cplData.map((cpl) => (
                  <Cell
                    key={cpl.name}
                    fill={cpl.nilai <= 0 ? '#94a3b8' : cpl.nilai < cpl.target ? '#f43f5e' : '#10b981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tercapai (≥80)</p>
            <p className="text-2xl font-extrabold text-green-600 mt-1">{tercapaiCount}</p>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Belum Tercapai (&lt;80)</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{belumTercapaiCount}</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Belum Ditempuh</p>
            <p className="text-2xl font-extrabold text-gray-600 mt-1">{belumDitempuhCount}</p>
          </div>
        </div>
      </div>

      {/* CPL Status Detail List */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Status Detail CPL 1-10</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cplData.map((cpl, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-4 border rounded-xl transition hover:shadow-sm ${
                cpl.status === 'Tercapai'
                  ? 'border-green-200 bg-green-50/50'
                  : cpl.status === 'Belum Tercapai'
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-gray-200 bg-gray-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {cpl.status === 'Tercapai' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                ) : cpl.status === 'Belum Tercapai' ? (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <MinusCircle className="w-5 h-5 text-gray-500 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-bold text-slate-800">{cpl.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cpl.kategori}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-slate-800 leading-none">{cpl.nilai > 0 ? cpl.nilai : '-'}</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 uppercase ${
                    cpl.status === 'Tercapai'
                      ? 'bg-green-600 text-white'
                      : cpl.status === 'Belum Tercapai'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-400 text-white'
                  }`}
                >
                  {cpl.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setActiveTab('cpl')}
          className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold shadow hover:shadow-md transition active:scale-99 cursor-pointer"
        >
          Lihat Detail Pembentuk CPL &rarr;
        </button>
      </div>
    </div>
  );
}
