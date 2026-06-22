'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Edit2, AlertCircle } from 'lucide-react';

interface WordingProposal {
  id: string;
  id_usulan: number;
  type: 'CPL' | 'IK' | 'CPMK';
  code: string;
  currentWording: string;
  proposedWording: string;
  bloomLevel: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes: string;
}

function authHeaders(): Record<string, string> {
  const raw = sessionStorage.getItem('currentUser');
  return { 'Content-Type': 'application/json', ...(raw ? { 'x-user-session': raw } : {}) };
}

export default function WordingReviewView() {
  const [proposals, setProposals] = useState<WordingProposal[]>([]);
  const [newType, setNewType] = useState<'CPL' | 'IK' | 'CPMK'>('CPL');
  const [newCode, setNewCode] = useState('');
  const [newCurrent, setNewCurrent] = useState('');
  const [newProposed, setNewProposed] = useState('');
  const [newBloom, setNewBloom] = useState('C4 (Analyzing)');
  const [newNotes, setNewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    fetch('/api/jamu/wording-proposals', { headers: authHeaders(), cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memuat usulan wording.');
        setProposals(json.data.items ?? []);
      })
      .catch((err) => setError(err.message || 'Gagal memuat usulan wording.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newProposed.trim()) return;

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/jamu/wording-proposals', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          type: newType,
          code: newCode,
          currentWording: newCurrent,
          proposedWording: newProposed,
          bloomLevel: newBloom,
          notes: newNotes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyimpan usulan wording.');
      setProposals([json.data, ...proposals]);
      setNewCode('');
      setNewCurrent('');
      setNewProposed('');
      setNewNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan usulan wording.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (prop: WordingProposal, newStatus: 'Approved' | 'Rejected') => {
    setError('');
    try {
      const res = await fetch('/api/jamu/wording-proposals', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id_usulan: prop.id_usulan, status: newStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memperbarui status usulan.');
      setProposals(proposals.map((item) => item.id_usulan === prop.id_usulan ? json.data : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status usulan.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Perbaikan Wording CPL/IK/CPMK</h1>
        <p className="text-gray-600 mt-1">
          Review rumusan deskripsi kompetensi agar memenuhi standar akreditasi dan taksonomi Bloom yang terukur.
        </p>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Edit2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-lg">Usulkan Perubahan</h3>
          </div>

          <form onSubmit={handleCreateProposal} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tipe Data</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as 'CPL' | 'IK' | 'CPMK')}
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="CPL">CPL (Capaian Pembelajaran Lulusan)</option>
                <option value="IK">IK (Indikator Kinerja)</option>
                <option value="CPMK">CPMK (Capaian Pembelajaran MK)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kode</label>
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="CPL-03 atau IK-02.1"
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tingkatan Taksonomi Bloom</label>
              <select
                value={newBloom}
                onChange={e => setNewBloom(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>C1 (Remembering)</option>
                <option>C2 (Understanding)</option>
                <option>C3 (Applying)</option>
                <option>C4 (Analyzing)</option>
                <option>C5 (Evaluating)</option>
                <option>C6 (Creating)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Wording / Deskripsi Saat Ini</label>
              <textarea
                value={newCurrent}
                onChange={e => setNewCurrent(e.target.value)}
                placeholder="Salin kalimat CPL/IK saat ini..."
                rows={2}
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Usulan Wording Baru (Terukur)</label>
              <textarea
                value={newProposed}
                onChange={e => setNewProposed(e.target.value)}
                placeholder="Tulis alternatif kalimat yang menggunakan kata kerja operasional..."
                rows={3}
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Catatan / Alasan Perubahan</label>
              <textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Mengapa wording ini diusulkan diubah?"
                rows={2}
                className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Kirim Usulan Wording'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-3 space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Panduan Penjaminan Mutu: </span>
              Rumusan wording kompetensi yang baik harus terukur, menggunakan kata kerja operasional (KKO) Taksonomi Bloom (C1-C6), dan menghindari kata kerja subjektif seperti &quot;mengetahui&quot;, &quot;mengerti&quot;, atau &quot;memahami&quot; karena sulit dievaluasi secara objektif dalam asesmen.
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">Riwayat & Status Usulan Wording</h3>
            </div>

            <div className="divide-y divide-gray-100">
              {proposals.map((prop) => (
                <div key={prop.id_usulan} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-400">{prop.id}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">{prop.type}</span>
                      <span className="font-bold text-gray-900 text-sm">{prop.code}</span>
                      <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded border border-indigo-100">{prop.bloomLevel}</span>
                    </div>

                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      prop.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      prop.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {prop.status === 'Approved' ? 'Disetujui' : prop.status === 'Rejected' ? 'Ditolak' : 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
                    <div className="bg-gray-50 p-3 rounded border border-gray-100">
                      <div className="font-semibold text-gray-500 uppercase tracking-wider mb-1">Kalimat Saat Ini:</div>
                      <p className="text-gray-700 italic">&quot;{prop.currentWording || '-'}&quot;</p>
                    </div>
                    <div className="bg-indigo-50/30 p-3 rounded border border-indigo-100/50">
                      <div className="font-semibold text-indigo-700 uppercase tracking-wider mb-1">Usulan Wording Baru:</div>
                      <p className="text-indigo-900 font-medium">&quot;{prop.proposedWording}&quot;</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-600">
                    <span className="font-bold">Alasan/Catatan: </span> {prop.notes || '-'}
                  </div>

                  {prop.status === 'Pending' && (
                    <div className="flex gap-2 justify-end mt-4">
                      <button
                        onClick={() => handleUpdateStatus(prop, 'Approved')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Setujui
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(prop, 'Rejected')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Tolak
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!proposals.length && (
                <div className="p-10 text-center text-sm text-gray-500">
                  {loading ? 'Memuat usulan wording...' : 'Belum ada usulan wording.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
