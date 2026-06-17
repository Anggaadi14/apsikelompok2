'use client';

import { UserSession } from '../../../data/users';
import { Network, Search, Loader2, AlertCircle, CheckCircle2, X, Filter, Save, RotateCcw, Divide, Edit3 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';

interface MappingCpmkIkViewProps { sessionUser: UserSession; }

interface IkRow {
  id_ik: number; kode_ik: string; deskripsi: string;
  kode_cpl: string; singkatan_cpl: string;
  id_kurikulum: number; kode_kurikulum: string;
  sum_bobot: number; jumlah_cpmk: number;
}
interface KurOpt { id_kurikulum: number; kode: string; nama: string; is_active: number; }
interface CpmkRow { id_cpmk: number; kode_cpmk: string; deskripsi_id: string; id_mata_kuliah: number; kode_mk: string; nama_mk: string; singkatan_mk: string | null; bobot_persen: number; }
interface IkDetail { id_ik: number; kode_ik: string; deskripsi: string; id_cpl: number; kode_cpl: string; singkatan_cpl: string; id_kurikulum: number; kode_kurikulum: string; }

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

export default function MappingCpmkIkView({ sessionUser: _su }: MappingCpmkIkViewProps) {
  const [ikList, setIkList] = useState<IkRow[]>([]);
  const [kurList, setKurList] = useState<KurOpt[]>([]);
  const [activeKur, setActiveKur] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailIk, setDetailIk] = useState<IkDetail | null>(null);
  const [detailRows, setDetailRows] = useState<CpmkRow[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (kurCode?: string) => {
    setLoading(true); setError(null);
    try {
      const q = kurCode ? `?kur=${encodeURIComponent(kurCode)}` : '';
      const res = await fetch(`/api/admin/mapping-cpmk-ik${q}`, { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat mapping.'); setIkList([]); }
      else {
        setIkList((json.data?.ikList as IkRow[]) ?? []);
        setKurList((json.data?.kurList as KurOpt[]) ?? []);
        if (json.data?.kurikulumActive) setActiveKur(json.data.kurikulumActive.kode);
      }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const qq = search.trim().toLowerCase();
    if (!qq) return ikList;
    return ikList.filter((r: IkRow) =>
      r.kode_ik.toLowerCase().includes(qq) ||
      r.deskripsi.toLowerCase().includes(qq) ||
      r.kode_cpl.toLowerCase().includes(qq) ||
      r.singkatan_cpl.toLowerCase().includes(qq),
    );
  }, [ikList, search]);

  const openDetail = async (ik: IkRow) => {
    setShowDetail(true); setDetailIk(null); setDetailRows([]); setDetailLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/mapping-cpmk-ik?kur=${encodeURIComponent(activeKur)}&id_ik=${ik.id_ik}`, { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setError(json.message || 'Gagal memuat detail.');
      else { setDetailIk(json.data?.ik as IkDetail); setDetailRows((json.data?.cpmkList as CpmkRow[]) ?? []); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setDetailLoading(false); }
  };
  const closeDetail = () => { if (!saving) { setShowDetail(false); setDetailIk(null); setDetailRows([]); } };

  const setBobot = (id_cpmk: number, raw: string) => {
    const v = raw === '' ? 0 : Number(raw);
    const clamped = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
    setDetailRows((prev: CpmkRow[]) => prev.map((r: CpmkRow) => r.id_cpmk === id_cpmk ? { ...r, bobot_persen: clamped } : r));
  };

  const sumBobot = useMemo(() => detailRows.reduce((a: number, r: CpmkRow) => a + (r.bobot_persen || 0), 0), [detailRows]);
  const aktifCount = useMemo(() => detailRows.filter((r: CpmkRow) => r.bobot_persen > 0).length, [detailRows]);
  const sumValid = Math.abs(sumBobot - 100) < 0.01 || aktifCount === 0;

  const distribusiMerata = () => {
    const aktif = detailRows.filter((r: CpmkRow) => r.bobot_persen > 0);
    if (aktif.length === 0) {
      setError('Pilih dulu minimal 1 CPMK (set bobot > 0) sebelum membagi merata.'); return;
    }
    const each = Number((100 / aktif.length).toFixed(3));
    const ids = new Set(aktif.map((r: CpmkRow) => r.id_cpmk));
    setDetailRows((prev: CpmkRow[]) => prev.map((r: CpmkRow) => ids.has(r.id_cpmk) ? { ...r, bobot_persen: each } : r));
  };
  const resetAll = () => setDetailRows((prev: CpmkRow[]) => prev.map((r: CpmkRow) => ({ ...r, bobot_persen: 0 })));

  const save = async () => {
    if (!detailIk) return;
    if (!sumValid) { setError(`Total bobot = ${sumBobot.toFixed(3)}%. Harus 100% (atau kosongkan semua).`); return; }
    setSaving(true); setError(null);
    try {
      const items = detailRows.filter((r: CpmkRow) => r.bobot_persen > 0).map((r: CpmkRow) => ({ id_cpmk: r.id_cpmk, bobot_persen: Number(r.bobot_persen) }));
      const res = await fetch('/api/admin/mapping-cpmk-ik', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id_ik: detailIk.id_ik, items }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setError(json.message || 'Gagal menyimpan.');
      else { setSuccess(json.message || 'Tersimpan.'); setShowDetail(false); fetchData(activeKur); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setSaving(false); }
  };

  const groupedByMk = useMemo(() => {
    const map = new Map<number, { kode_mk: string; nama_mk: string; rows: CpmkRow[] }>();
    for (const r of detailRows) {
      const ex = map.get(r.id_mata_kuliah);
      if (ex) ex.rows.push(r);
      else map.set(r.id_mata_kuliah, { kode_mk: r.kode_mk, nama_mk: r.nama_mk, rows: [r] });
    }
    return Array.from(map.values());
  }, [detailRows]);
  return (
  <div className="space-y-6">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mt-1"><Network className="w-5 h-5" /></div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mapping CPMK → IK</h1>
        <p className="text-gray-600 mt-1">Atur bobot kontribusi tiap CPMK terhadap Indikator Kinerja. Total bobot CPMK per IK harus 100%.</p>
      </div>
    </div>

    {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}
    {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 text-sm text-green-700"><CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {success}</div>}

    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2 flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Cari kode IK / deskripsi / kode CPL..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <select value={activeKur} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setActiveKur(e.target.value); fetchData(e.target.value); }} className="text-sm border-gray-300 rounded-md shadow-sm">
          {kurList.map((k: KurOpt) => <option key={k.id_kurikulum} value={k.kode}>{k.kode}{k.is_active === 1 ? ' (aktif)' : ''}</option>)}
        </select>
      </div>
    </div>

    {!loading && ikList.length > 0 && (() => {
      const validCount = ikList.filter((r: IkRow) => Math.abs(Number(r.sum_bobot) - 100) < 0.01 || Number(r.sum_bobot) === 0).length;
      const sudahMap = ikList.filter((r: IkRow) => Number(r.sum_bobot) > 0).length;
      const lengkap = ikList.filter((r: IkRow) => Math.abs(Number(r.sum_bobot) - 100) < 0.01).length;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Total IK</p><p className="text-2xl font-bold text-gray-900">{ikList.length}</p></div>
          <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Sudah Dipetakan</p><p className="text-2xl font-bold text-blue-700">{sudahMap}</p></div>
          <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Bobot Lengkap (=100%)</p><p className="text-2xl font-bold text-green-700">{lengkap}</p></div>
          <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Belum Valid</p><p className="text-2xl font-bold text-amber-700">{ikList.length - validCount}</p></div>
        </div>
      );
    })()}

    {loading ? (
      <div className="flex items-center justify-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat IK…</div>
    ) : filtered.length === 0 ? (
      <div className="py-12 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">Tidak ada IK pada kurikulum ini.</div>
    ) : (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left w-32">CPL / IK</th>
                <th className="px-4 py-2 text-left">Deskripsi</th>
                <th className="px-4 py-2 text-center w-24">CPMK Aktif</th>
                <th className="px-4 py-2 text-center w-32">Total Bobot</th>
                <th className="px-4 py-2 text-center w-32">Status</th>
                <th className="px-4 py-2 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r: IkRow) => {
                const sb = Number(r.sum_bobot);
                const empty = sb === 0;
                const valid = Math.abs(sb - 100) < 0.01;
                return (
                  <tr key={r.id_ik} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{r.singkatan_cpl}</span>
                      <span className="ml-1 font-mono text-xs text-gray-700">{r.kode_ik}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.deskripsi}</td>
                    <td className="px-4 py-2 text-center text-gray-700">{r.jumlah_cpmk}</td>
                    <td className={`px-4 py-2 text-center font-semibold ${sb === 100 ? 'text-green-700' : sb === 0 ? 'text-gray-400' : 'text-amber-700'}`}>{sb.toFixed(2)}%</td>
                    <td className="px-4 py-2 text-center">
                      {empty ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">Belum diatur</span>
                        : valid ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">Valid (100%)</span>
                        : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Tidak valid</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => openDetail(r)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md">
                        <Edit3 className="w-3.5 h-3.5" /> Atur
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}
          {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Mapping CPMK → IK</h2>
                {detailIk && <p className="text-xs text-gray-500 mt-0.5"><span className="font-mono">{detailIk.kode_ik}</span> · dari CPL <span className="font-mono">{detailIk.kode_cpl}</span> ({detailIk.singkatan_cpl}) · Kurikulum {detailIk.kode_kurikulum}</p>}
              </div>
              <button onClick={closeDetail} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat detail…</div>
            ) : (
              <>
                {detailIk && <div className="px-4 pt-3"><div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 text-xs text-indigo-900"><strong>Deskripsi IK:</strong> {detailIk.deskripsi}</div></div>}

                <div className="px-4 pt-3 flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex gap-2">
                    <button onClick={distribusiMerata} type="button" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"><Divide className="w-3.5 h-3.5" /> Distribusi merata (CPMK aktif)</button>
                    <button onClick={resetAll} type="button" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"><RotateCcw className="w-3.5 h-3.5" /> Reset 0</button>
                  </div>
                  <div className={`px-3 py-1.5 rounded-md text-xs font-semibold ${sumValid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    Total: {sumBobot.toFixed(3)}% / 100% · {aktifCount} CPMK aktif
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                  {detailRows.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">Tidak ada CPMK pada kurikulum ini. Tambahkan CPMK di menu Kelola CPMK terlebih dulu.</div>
                  ) : groupedByMk.map((g: { kode_mk: string; nama_mk: string; rows: CpmkRow[] }, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                        <div><span className="font-mono text-xs font-semibold text-gray-800">{g.kode_mk}</span><span className="ml-2 text-xs text-gray-600">{g.nama_mk}</span></div>
                        <span className="text-[10px] text-gray-500">{g.rows.length} CPMK</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-white text-[10px] uppercase text-gray-500">
                          <tr>
                            <th className="px-3 py-1 text-left w-24">Kode</th>
                            <th className="px-3 py-1 text-left">Deskripsi</th>
                            <th className="px-3 py-1 text-center w-28">Bobot (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {g.rows.map((r: CpmkRow) => (
                            <tr key={r.id_cpmk} className={r.bobot_persen > 0 ? 'bg-indigo-50/40' : ''}>
                              <td className="px-3 py-1.5 font-mono text-xs text-gray-800">{r.kode_cpmk}</td>
                              <td className="px-3 py-1.5 text-xs text-gray-700">{r.deskripsi_id}</td>
                              <td className="px-3 py-1.5 text-center">
                                <input type="number" min={0} max={100} step={0.001} value={r.bobot_persen === 0 ? '' : r.bobot_persen} onChange={(e: ChangeEvent<HTMLInputElement>) => setBobot(r.id_cpmk, e.target.value)} placeholder="0" className="w-20 text-xs text-center border-gray-300 rounded-md shadow-sm" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={closeDetail} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Batal</button>
                  <button onClick={save} disabled={saving || (!sumValid && aktifCount > 0)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}