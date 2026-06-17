'use client';

import { UserSession } from '../../../data/users';
import { Scale, Loader2, AlertCircle, CheckCircle2, Save, RotateCw, Filter } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';

interface BobotIkCplViewProps {
  sessionUser: UserSession;
}

interface IkRow {
  id_ik: number;
  id_cpl: number;
  kode_ik: string;
  deskripsi: string;
  urutan: number;
  bobot_persen: number;
}
interface CplGroup {
  id_cpl: number;
  kode_cpl: string;
  singkatan: string;
  domain: string;
  deskripsi_id: string;
  sum_bobot: number;
  ik: IkRow[];
}
interface KurOption { id_kurikulum: number; kode: string; nama: string; is_active: 0 | 1; }

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

function roundTo3(n: number): number { return Math.round(n * 1000) / 1000; }

export default function BobotIkCplView({ sessionUser: _sessionUser }: BobotIkCplViewProps) {
  const [kurOptions, setKurOptions] = useState<KurOption[]>([]);
  const [filterKur, setFilterKur] = useState<string>('');
  const [groups, setGroups] = useState<CplGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCpl, setSavingCpl] = useState<number | null>(null); // id_cpl yang sedang disimpan
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ===== load kurikulum =====
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

  // ===== load bobot =====
  const fetchBobot = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (filterKur) p.set('kur', filterKur);
      const res = await fetch(`/api/admin/bobot-ik-cpl?${p.toString()}`, { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat bobot.'); setGroups([]); }
      else setGroups((json.data?.groups as CplGroup[]) ?? []);
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  }, [filterKur]);

  useEffect(() => { fetchBobot(); }, [fetchBobot]);

  // ===== edit handlers =====
  const updateBobot = (id_cpl: number, id_ik: number, val: number) => {
    setSuccess(null);
    setGroups((prev: CplGroup[]) =>
      prev.map((g: CplGroup) => {
        if (g.id_cpl !== id_cpl) return g;
        const newIk = g.ik.map((r: IkRow) => (r.id_ik === id_ik ? { ...r, bobot_persen: val } : r));
        const sum = newIk.reduce((acc: number, r: IkRow) => acc + (Number(r.bobot_persen) || 0), 0);
        return { ...g, ik: newIk, sum_bobot: roundTo3(sum) };
      }),
    );
  };

  const distributeEvenly = (id_cpl: number) => {
    setSuccess(null);
    setGroups((prev: CplGroup[]) =>
      prev.map((g: CplGroup) => {
        if (g.id_cpl !== id_cpl) return g;
        if (g.ik.length === 0) return g;
        const each = roundTo3(100 / g.ik.length);
        // Sisa dibulatkan ke IK terakhir agar tepat 100
        const newIk = g.ik.map((r: IkRow) => ({ ...r, bobot_persen: each }));
        const sumExceptLast = newIk.slice(0, -1).reduce((acc: number, r: IkRow) => acc + r.bobot_persen, 0);
        newIk[newIk.length - 1].bobot_persen = roundTo3(100 - sumExceptLast);
        return { ...g, ik: newIk, sum_bobot: 100 };
      }),
    );
  };

  const resetCpl = (id_cpl: number) => {
    setSuccess(null);
    setGroups((prev: CplGroup[]) =>
      prev.map((g: CplGroup) => {
        if (g.id_cpl !== id_cpl) return g;
        const newIk = g.ik.map((r: IkRow) => ({ ...r, bobot_persen: 0 }));
        return { ...g, ik: newIk, sum_bobot: 0 };
      }),
    );
  };

  const saveCpl = async (group: CplGroup) => {
    setError(null); setSuccess(null);
    if (Math.abs(group.sum_bobot - 100) > 0.01) {
      setError(`Total bobot CPL ${group.kode_cpl} harus 100 (sekarang ${group.sum_bobot}).`);
      return;
    }
    setSavingCpl(group.id_cpl);
    try {
      const payload = {
        rows: group.ik.map((r) => ({ id_ik: r.id_ik, id_cpl: group.id_cpl, bobot_persen: r.bobot_persen })),
      };
      const res = await fetch('/api/admin/bobot-ik-cpl', {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setError(json.message || 'Gagal menyimpan bobot.');
      else { setSuccess(`Bobot CPL ${group.kode_cpl} (${group.singkatan}) tersimpan.`); fetchBobot(); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setSavingCpl(null); }
  };

  const totalIk = useMemo(() => groups.reduce((acc: number, g: CplGroup) => acc + g.ik.length, 0), [groups]);
  const cplValid = useMemo(() => groups.filter((g: CplGroup) => Math.abs(g.sum_bobot - 100) <= 0.01).length, [groups]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mt-1">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kelola Bobot IK → CPL</h1>
            <p className="text-gray-600 mt-1">Atur proporsi kontribusi tiap Indikator Kinerja terhadap CPL induknya.</p>
            <p className="text-sm text-gray-500">Total bobot per CPL <span className="font-semibold">wajib = 100</span>. Engine OBE memakai nilai ini untuk hitung CPL = Σ(IK × bobot/100).</p>
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
            {kurOptions.map((k: KurOption) => (
              <option key={k.id_kurikulum} value={k.kode}>{k.kode}{k.is_active === 1 ? ' (aktif)' : ''}</option>
            ))}
          </select>
          <button
            onClick={fetchBobot}
            title="Refresh"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total CPL</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{groups.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total IK</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalIk}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">CPL Valid (sum=100)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            <span className={cplValid === groups.length && groups.length > 0 ? 'text-green-600' : 'text-amber-600'}>{cplValid}</span>
            <span className="text-gray-400 text-base"> / {groups.length}</span>
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

      {/* List of CPL groups */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat bobot…
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">
          Tidak ada CPL pada kurikulum ini.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g: CplGroup) => {
            const isValid = Math.abs(g.sum_bobot - 100) <= 0.01;
            const isEmpty = g.ik.length === 0;
            return (
              <div key={g.id_cpl} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {g.singkatan}
                      </span>
                      <h3 className="text-base font-semibold text-gray-900">CPL {g.kode_cpl}</h3>
                      <span className="text-xs text-gray-500">· {g.domain}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{g.deskripsi_id}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${isValid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      Σ = {g.sum_bobot.toFixed(g.sum_bobot % 1 === 0 ? 0 : 2)}{isValid ? ' ✓' : ' (perlu 100)'}
                    </span>
                    <button
                      onClick={() => distributeEvenly(g.id_cpl)}
                      disabled={isEmpty}
                      className="text-xs px-2.5 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Distribusi merata
                    </button>
                    <button
                      onClick={() => resetCpl(g.id_cpl)}
                      disabled={isEmpty}
                      className="text-xs px-2.5 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset 0
                    </button>
                    <button
                      onClick={() => saveCpl(g)}
                      disabled={isEmpty || savingCpl === g.id_cpl || !isValid}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingCpl === g.id_cpl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Simpan CPL ini
                    </button>
                  </div>
                </div>

                {isEmpty ? (
                  <div className="p-6 text-center text-sm text-gray-500">CPL ini belum punya IK.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left w-24">Kode IK</th>
                          <th className="px-4 py-2 text-left">Deskripsi</th>
                          <th className="px-4 py-2 text-right w-36">Bobot (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {g.ik.map((r: IkRow) => (
                          <tr key={r.id_ik} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs text-gray-800">{r.kode_ik}</td>
                            <td className="px-4 py-2 text-gray-700">{r.deskripsi}</td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                value={r.bobot_persen}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                  const v = Number(e.target.value);
                                  updateBobot(g.id_cpl, r.id_ik, Number.isFinite(v) ? v : 0);
                                }}
                                className="w-24 text-right border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</td>
                          <td className={`px-4 py-2 text-right text-sm font-bold ${isValid ? 'text-green-700' : 'text-amber-700'}`}>
                            {g.sum_bobot.toFixed(g.sum_bobot % 1 === 0 ? 0 : 2)}
                          </td>
                        </tr>
                      </tfoot>
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