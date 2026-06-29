'use client';

import { UserSession } from '../../../data/users';
import { Layers, Loader2, AlertCircle, CheckCircle2, Save, RotateCw, Filter } from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';

interface MappingAsesmenCpmkViewProps {
  sessionUser: UserSession;
}

interface CpmkRow {
  id_cpmk: number;
  kode_cpmk: string;
  deskripsi_id: string | null;
  kode_asesmen: string;
}

interface MkGroup {
  id_mata_kuliah: number;
  kode_mk: string;
  nama_mk: string;
  singkatan: string | null;
  cpmk: CpmkRow[];
}

interface KurOption { id_kurikulum: number; kode: string; nama: string; is_active: 0 | 1; }

const UK_OPTIONS = ['UK1', 'UK2', 'UK3', 'UK4', 'UK5'];

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

export default function MappingAsesmenCpmkView({ sessionUser: _sessionUser }: MappingAsesmenCpmkViewProps) {
  const [kurOptions, setKurOptions] = useState<KurOption[]>([]);
  const [filterKur, setFilterKur] = useState<string>('');
  const [groups, setGroups] = useState<MkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMk, setSavingMk] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/kurikulum', { headers: authHeaders(), cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (json?.success && Array.isArray(json.data)) {
          setKurOptions(json.data as KurOption[]);
          const active = (json.data as KurOption[]).find((k) => k.is_active === 1);
          if (active) setFilterKur(active.kode);
          else if ((json.data as KurOption[]).length) setFilterKur((json.data as KurOption[])[0].kode);
        }
      } catch { /* noop */ }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (filterKur) p.set('kur', filterKur);
      const res = await fetch(`/api/admin/mapping-asesmen-cpmk?${p.toString()}`, {
        headers: authHeaders(), cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat data.'); setGroups([]); }
      else setGroups((json.data?.mkGroups as MkGroup[]) ?? []);
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  }, [filterKur]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateAsesmen = (idMk: number, idCpmk: number, val: string) => {
    setSuccess(null);
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id_mata_kuliah !== idMk) return g;
        return { ...g, cpmk: g.cpmk.map((c) => (c.id_cpmk === idCpmk ? { ...c, kode_asesmen: val } : c)) };
      }),
    );
  };

  const saveMk = async (group: MkGroup) => {
    setError(null); setSuccess(null);
    setSavingMk(group.id_mata_kuliah);
    try {
      const payload = {
        id_mata_kuliah: group.id_mata_kuliah,
        rows: group.cpmk.map((c) => ({ id_cpmk: c.id_cpmk, kode_asesmen: c.kode_asesmen })),
      };
      const res = await fetch('/api/admin/mapping-asesmen-cpmk', {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setError(json.message || 'Gagal menyimpan.');
      else { setSuccess(`Mapping asesmen ${group.kode_mk} tersimpan.`); fetchData(); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setSavingMk(null); }
  };

  const totalCpmk = groups.reduce((acc, g) => acc + g.cpmk.length, 0);
  const totalMapped = groups.reduce((acc, g) => acc + g.cpmk.filter((c) => c.kode_asesmen).length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center mt-1">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mapping Asesmen → CPMK</h1>
            <p className="text-gray-600 mt-1">Tinjau dan ubah pemetaan komponen asesmen (UK) ke CPMK tiap mata kuliah.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterKur}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterKur(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            {kurOptions.length === 0 && <option value="">Kurikulum</option>}
            {kurOptions.map((k) => (
              <option key={k.id_kurikulum} value={k.kode}>
                {k.kode}{k.is_active === 1 ? ' (aktif)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            title="Refresh"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Mata Kuliah</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{groups.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total CPMK</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCpmk}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">CPMK Terpetakan</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            <span className={totalMapped === totalCpmk && totalCpmk > 0 ? 'text-green-600' : 'text-amber-600'}>
              {totalMapped}
            </span>
            <span className="text-gray-400 text-base"> / {totalCpmk}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {success}
        </div>
      )}

      {/* MK groups */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat data…
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">
          Tidak ada mata kuliah pada kurikulum ini.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const mapped = g.cpmk.filter((c) => c.kode_asesmen).length;
            const allMapped = mapped === g.cpmk.length && g.cpmk.length > 0;
            return (
              <div key={g.id_mata_kuliah} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        {g.kode_mk}
                      </span>
                      <h3 className="text-base font-semibold text-gray-900">{g.nama_mk}</h3>
                      {g.singkatan && <span className="text-xs text-gray-500">({g.singkatan})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${allMapped ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {mapped} / {g.cpmk.length} terpetakan
                    </span>
                    <button
                      onClick={() => saveMk(g)}
                      disabled={savingMk === g.id_mata_kuliah || g.cpmk.length === 0}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingMk === g.id_mata_kuliah
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Save className="w-3.5 h-3.5" />}
                      Simpan MK ini
                    </button>
                  </div>
                </div>

                {g.cpmk.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">Mata kuliah ini belum memiliki CPMK.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left w-32">Kode CPMK</th>
                          <th className="px-4 py-2 text-left">Deskripsi</th>
                          <th className="px-4 py-2 text-right w-44">Asesmen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {g.cpmk.map((c) => (
                          <tr key={c.id_cpmk} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs text-gray-800">{c.kode_cpmk}</td>
                            <td className="px-4 py-2 text-gray-700 text-xs">{c.deskripsi_id || '—'}</td>
                            <td className="px-4 py-2 text-right">
                              <select
                                value={c.kode_asesmen}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                  updateAsesmen(g.id_mata_kuliah, c.id_cpmk, e.target.value)
                                }
                                className="border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              >
                                <option value="">— Tidak dipetakan —</option>
                                {UK_OPTIONS.map((uk) => (
                                  <option key={uk} value={uk}>{uk}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
