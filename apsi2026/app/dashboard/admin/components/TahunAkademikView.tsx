'use client';

import { UserSession } from '../../../data/users';
import { useEffect, useState, type ChangeEvent } from 'react';
import { CalendarDays, Plus, CheckCircle, Loader2, XCircle } from 'lucide-react';

interface Props { sessionUser: UserSession; }

type TA = {
  id_tahun_akademik: number;
  kode: string;
  tahun_mulai: number;
  tahun_selesai: number;
  semester: 'Ganjil' | 'Genap';
  label: string | null;
  is_active: 0 | 1;
  created_at: string | null;
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  return { ...(raw ? { 'x-user-session': raw } : {}), ...extra };
}

export default function TahunAkademikView({ sessionUser }: Props) {
  const [items, setItems] = useState<TA[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Form tambah
  const thisYear = new Date().getFullYear();
  const [tahunMulai, setTahunMulai] = useState<number>(thisYear);
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [label, setLabel] = useState('');
  const [setActive, setSetActive] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/admin/tahun-akademik', { headers: authHeaders() });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) setErr(j.message || 'Gagal memuat data.');
      else setItems(j.data as TA[]);
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const flashOk = (m: string) => { setOk(m); setTimeout(() => setOk(null), 2500); };

  const handleAdd = async () => {
    setAdding(true); setErr(null);
    try {
      const r = await fetch('/api/admin/tahun-akademik', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ tahun_mulai: tahunMulai, semester, label: label || null, set_active: setActive }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) setErr(j.message || 'Gagal menyimpan.');
      else { flashOk('Tahun Akademik tersimpan.'); setLabel(''); setSetActive(false); void load(); }
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setAdding(false); }
  };

  const handleSetActive = async (id: number) => {
    setBusyId(id); setErr(null);
    try {
      const r = await fetch('/api/admin/tahun-akademik', {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id_tahun_akademik: id, set_active: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) setErr(j.message || 'Gagal mengaktifkan.');
      else { flashOk('TA aktif diperbarui.'); void load(); }
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-indigo-600" /> Tahun Akademik
        </h1>
        <p className="text-gray-600 mt-1">
          Daftar periode akademik. Tepat <span className="font-medium">satu</span> TA yang ditandai <span className="font-medium">Berjalan</span> akan dipakai sebagai default untuk upload nilai.
        </p>
      </div>

      {ok && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2 text-sm text-emerald-800">
          <CheckCircle className="w-5 h-5" /> {ok}
        </div>
      )}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <XCircle className="w-5 h-5" /> {err}
        </div>
      )}

      {/* Form tambah */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tambah Tahun Akademik</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Mulai</label>
            <input
              type="number" min={2000} max={2100} value={tahunMulai}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTahunMulai(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">Kode otomatis: {tahunMulai}/{tahunMulai + 1}-{semester}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Label (opsional)</label>
            <input
              type="text" value={label} placeholder="mis. 2025/2026 Ganjil (Berjalan)"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox" checked={setActive}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSetActive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Jadikan sebagai TA berjalan (default)
          </label>
          <button
            onClick={handleAdd} disabled={adding}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {adding ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      </div>

      {/* Daftar TA */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Daftar Tahun Akademik</h2>
        </div>
        {loading ? (
          <div className="p-10 flex items-center justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Belum ada Tahun Akademik. Tambahkan dari form di atas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3 font-medium">Kode</th>
                <th className="text-left px-6 py-3 font-medium">Label</th>
                <th className="text-left px-6 py-3 font-medium">Periode</th>
                <th className="text-left px-6 py-3 font-medium">Semester</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-right px-6 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((ta: TA) => (
                <tr key={ta.id_tahun_akademik} className={ta.is_active ? 'bg-emerald-50/40' : ''}>
                  <td className="px-6 py-3 font-mono text-xs text-gray-700">{ta.kode}</td>
                  <td className="px-6 py-3 text-gray-900">{ta.label || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-3 text-gray-700">{ta.tahun_mulai}/{ta.tahun_selesai}</td>
                  <td className="px-6 py-3 text-gray-700">{ta.semester}</td>
                  <td className="px-6 py-3">
                    {ta.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Berjalan
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Arsip</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {!ta.is_active && (
                      <button
                        onClick={() => handleSetActive(ta.id_tahun_akademik)}
                        disabled={busyId === ta.id_tahun_akademik}
                        className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {busyId === ta.id_tahun_akademik ? 'Memproses...' : 'Jadikan berjalan'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}