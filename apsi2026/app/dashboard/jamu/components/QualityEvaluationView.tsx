'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, ClipboardList, Send, FileSpreadsheet, Download } from 'lucide-react';

interface Recommendation {
  id: string;
  cpl: string;
  rekomendasi: string;
  targetRole: 'dosen' | 'kaprodi';
  status: 'Draft' | 'Sent' | 'Resolved';
  tanggal: string;
}

export default function QualityEvaluationView() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: 'REC-001',
      cpl: 'CPL-03 (Keterampilan Umum)',
      rekomendasi: 'Mengintegrasikan pengerjaan proyek mini (mini-project) berkelompok pada MK Perancangan Sistem guna melatih kerja sama tim dan kemampuan komunikasi lisan.',
      targetRole: 'dosen',
      status: 'Sent',
      tanggal: '2026-06-08',
    },
    {
      id: 'REC-002',
      cpl: 'CPL-02 (Penguasaan Pengetahuan)',
      rekomendasi: 'Memperbarui modul praktikum pada MK Fisika Dasar II agar selaras dengan indikator kinerja (IK) 02.2.',
      targetRole: 'dosen',
      status: 'Resolved',
      tanggal: '2026-05-20',
    },
    {
      id: 'REC-003',
      cpl: 'CPL-03 (Keterampilan Umum)',
      rekomendasi: 'Mengajukan restrukturisasi bobot media asesmen UK-4 dan UK-5 di kurikulum agar evaluasi presentasi lisan mendapat porsi minimal 15%.',
      targetRole: 'kaprodi',
      status: 'Draft',
      tanggal: '2026-06-10',
    },
  ]);

  const [newCpl, setNewCpl] = useState('CPL-03 (Keterampilan Umum)');
  const [newRecText, setNewRecText] = useState('');
  const [newTargetRole, setNewTargetRole] = useState<'dosen' | 'kaprodi'>('dosen');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecText.trim()) return;

    const newRec: Recommendation = {
      id: `REC-00${recommendations.length + 1}`,
      cpl: newCpl,
      rekomendasi: newRecText,
      targetRole: newTargetRole,
      status: 'Draft',
      tanggal: new Date().toISOString().split('T')[0],
    };

    setRecommendations([newRec, ...recommendations]);
    setNewRecText('');
  };

  const handleSend = (id: string) => {
    setRecommendations(
      recommendations.map((rec) =>
        rec.id === id ? { ...rec, status: 'Sent' } : rec
      )
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Evaluasi Mutu & Tindak Lanjut</h1>
        <p className="text-gray-600 mt-1">Buat, review, dan kirimkan rekomendasi perbaikan mutu pembelajaran/asesmen ke Dosen atau Kaprodi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Rekomendasi */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-lg">Buat Rekomendasi Mutu</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Pilih CPL / Asesmen Kritis</label>
              <select 
                value={newCpl} 
                onChange={e => setNewCpl(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>CPL-01 (Sikap & Tata Nilai)</option>
                <option>CPL-02 (Penguasaan Pengetahuan)</option>
                <option>CPL-03 (Keterampilan Umum)</option>
                <option>CPL-04 (Keterampilan Khusus I)</option>
                <option>CPL-05 (Keterampilan Khusus II)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Target Rekomendasi</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="target" 
                    checked={newTargetRole === 'dosen'} 
                    onChange={() => setNewTargetRole('dosen')}
                    className="text-indigo-600 focus:ring-indigo-500" 
                  />
                  Dosen Pengampu
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="target" 
                    checked={newTargetRole === 'kaprodi'} 
                    onChange={() => setNewTargetRole('kaprodi')}
                    className="text-indigo-600 focus:ring-indigo-500" 
                  />
                  Kaprodi (Kurikulum/Kebijakan)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Detail Tindak Lanjut / Rekomendasi</label>
              <textarea 
                value={newRecText}
                onChange={e => setNewRecText(e.target.value)}
                placeholder="Tulis detail rekomendasi perbaikan metode pengajaran, rubrik asesmen, atau penyelarasan kurikulum..."
                rows={4}
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Simpan Sebagai Draft
            </button>
          </form>
        </div>

        {/* Tabel Daftar Rekomendasi */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg">Daftar Rekomendasi Mutu Aktif</h3>
            <button className="flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              <Download className="w-4 h-4" /> Export (.xlsx)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">CPL Terkait</th>
                  <th className="px-6 py-3">Rekomendasi</th>
                  <th className="px-6 py-3">Penerima</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {recommendations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-500 text-xs">{rec.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{rec.cpl}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs leading-relaxed">{rec.rekomendasi}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        rec.targetRole === 'kaprodi' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {rec.targetRole === 'kaprodi' ? 'Kaprodi' : 'Dosen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        rec.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        rec.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rec.status === 'Resolved' ? 'Terselesaikan' :
                         rec.status === 'Sent' ? 'Terkirim' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rec.status === 'Draft' ? (
                        <button 
                          onClick={() => handleSend(rec.id)}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          <Send className="w-3.5 h-3.5" /> Kirim
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">No Action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
