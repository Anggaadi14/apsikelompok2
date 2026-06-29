'use client';

import { UserSession } from '../../../data/users';
import { Network, Search, Loader2, AlertCircle, CheckCircle2, X, Filter, Save, Edit3, Plus, ArrowLeft, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';

interface MappingCpmkIkViewProps { sessionUser: UserSession; }

interface IkRow {
  id_ik: number; kode_ik: string; deskripsi: string;
  kode_cpl: string; singkatan_cpl: string;
  id_kurikulum: number; kode_kurikulum: string;
  jumlah_cpmk: number;
}
interface KurOpt { id_kurikulum: number; kode: string; nama: string; is_active: number; }
interface CpmkRow { id_cpmk: number; kode_cpmk: string; deskripsi_id: string; id_mata_kuliah: number; kode_mk: string; nama_mk: string; singkatan_mk: string | null; is_evaluator: boolean; mapped: boolean; }
interface IkDetail { id_ik: number; kode_ik: string; deskripsi: string; id_cpl: number; kode_cpl: string; singkatan_cpl: string; id_kurikulum: number; kode_kurikulum: string; }
interface IkPickRow { id_ik: number; kode_ik: string; deskripsi: string; id_cpl: number; kode_cpl: string; singkatan_cpl: string; mapped: boolean; }
interface MkOption { id_mata_kuliah: number; kode_mk: string; nama_mk: string; }
interface CpmkPickRow { id_cpmk: number; kode_cpmk: string; deskripsi_id: string; id_mata_kuliah: number; kode_mk: string; nama_mk: string; singkatan_mk: string | null; }

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

  // Tambah Mapping wizard: Step 1=pick MK, Step 2=pick CPMK from that MK, Step 3=pick IK
  const [showAddModal, setShowAddModal] = useState(false);
  // Step 1: MK list
  const [mkList, setMkList] = useState<MkOption[]>([]);
  const [mkLoading, setMkLoading] = useState(false);
  const [mkSearch, setMkSearch] = useState('');
  const [selectedMk, setSelectedMk] = useState<MkOption | null>(null);
  // Step 2: CPMK list for selected MK
  const [cpmkList, setCpmkList] = useState<CpmkPickRow[]>([]);
  const [cpmkLoading, setCpmkLoading] = useState(false);
  const [cpmkSearch, setCpmkSearch] = useState('');
  const [selectedCpmk, setSelectedCpmk] = useState<CpmkPickRow | null>(null);
  // Step 3: IK list for selected CPMK
  const [addIkRows, setAddIkRows] = useState<IkPickRow[]>([]);
  const [addIkLoading, setAddIkLoading] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

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
      (r.singkatan_cpl ?? '').toLowerCase().includes(qq),
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

  const toggleMapped = (id_cpmk: number) => {
    setDetailRows((prev: CpmkRow[]) => prev.map((r: CpmkRow) => r.id_cpmk === id_cpmk && r.is_evaluator ? { ...r, mapped: !r.mapped } : r));
  };

  const selectedCount = useMemo(() => detailRows.filter((r: CpmkRow) => r.mapped && r.is_evaluator).length, [detailRows]);

  const save = async () => {
    if (!detailIk) return;
    setSaving(true); setError(null);
    try {
      const id_cpmk_list = detailRows.filter((r: CpmkRow) => r.mapped && r.is_evaluator).map((r: CpmkRow) => r.id_cpmk);
      const res = await fetch('/api/admin/mapping-cpmk-ik', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id_ik: detailIk.id_ik, id_cpmk_list }) });
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

  // ── Tambah Mapping: Step 1 — Pilih Mata Kuliah ──────────────────────────
  const openAddModal = async () => {
    setShowAddModal(true);
    setSelectedMk(null);
    setSelectedCpmk(null);
    setAddIkRows([]);
    setMkSearch('');
    setCpmkSearch('');
    setMkList([]);
    setCpmkList([]);
    setError(null);
    setSuccess(null);
    setMkLoading(true);
    try {
      // Fetch all MK that have CPMK in the active kurikulum
      const res = await fetch(`/api/admin/mapping-cpmk-ik?kur=${encodeURIComponent(activeKur)}&cpmk_list=1`, { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat daftar mata kuliah.'); }
      else {
        // Derive unique MK list from cpmkList
        const cpmkAll = (json.data?.cpmkList as CpmkPickRow[]) ?? [];
        const mkMap = new Map<number, MkOption>();
        for (const c of cpmkAll) {
          if (!mkMap.has(c.id_mata_kuliah)) {
            mkMap.set(c.id_mata_kuliah, { id_mata_kuliah: c.id_mata_kuliah, kode_mk: c.kode_mk, nama_mk: c.nama_mk });
          }
        }
        setMkList(Array.from(mkMap.values()).sort((a, b) => a.kode_mk.localeCompare(b.kode_mk)));
      }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setMkLoading(false); }
  };

  const closeAddModal = () => {
    if (addSaving) return;
    setShowAddModal(false);
    setSelectedMk(null);
    setSelectedCpmk(null);
    setAddIkRows([]);
    setMkSearch('');
    setCpmkSearch('');
  };

  const filteredMkOptions = useMemo(() => {
    const qq = mkSearch.trim().toLowerCase();
    if (!qq) return mkList;
    return mkList.filter((m) => m.kode_mk.toLowerCase().includes(qq) || m.nama_mk.toLowerCase().includes(qq));
  }, [mkList, mkSearch]);

  // ── Tambah Mapping: Step 2 — Pilih CPMK dari MK terpilih ──────────────
  const pickMk = async (m: MkOption) => {
    setSelectedMk(m);
    setSelectedCpmk(null);
    setAddIkRows([]);
    setCpmkSearch('');
    setCpmkList([]);
    setCpmkLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cpmk?id_mk=${m.id_mata_kuliah}`, { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat CPMK.'); }
      else { setCpmkList((json.data?.cpmkList as CpmkPickRow[]) ?? []); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setCpmkLoading(false); }
  };

  const filteredCpmk = useMemo(() => {
    const qq = cpmkSearch.trim().toLowerCase();
    if (!qq) return cpmkList;
    return cpmkList.filter((c) => c.kode_cpmk.toLowerCase().includes(qq) || c.deskripsi_id.toLowerCase().includes(qq));
  }, [cpmkList, cpmkSearch]);

  const backToPickMk = () => { setSelectedMk(null); setSelectedCpmk(null); setAddIkRows([]); setCpmkList([]); };

  // ── Tambah Mapping: Step 3 — Pilih IK ─────────────────────────────────
  const pickCpmk = async (c: CpmkPickRow) => {
    setSelectedCpmk(c);
    setAddIkRows([]);
    setAddIkLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mapping-cpmk-ik?kur=${encodeURIComponent(activeKur)}&id_cpmk=${c.id_cpmk}`, { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat daftar IK.'); }
      else { setAddIkRows((json.data?.ikList as IkPickRow[]) ?? []); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setAddIkLoading(false); }
  };

  const backToPickCpmk = () => { setSelectedCpmk(null); setAddIkRows([]); };

  const toggleAddIk = (id_ik: number) => {
    setAddIkRows((prev: IkPickRow[]) => prev.map((r: IkPickRow) => r.id_ik === id_ik ? { ...r, mapped: !r.mapped } : r));
  };
  const addSelectedCount = useMemo(() => addIkRows.filter((r: IkPickRow) => r.mapped).length, [addIkRows]);

  const groupedAddIk = useMemo(() => {
    const map = new Map<number, { kode_cpl: string; singkatan_cpl: string; rows: IkPickRow[] }>();
    for (const r of addIkRows) {
      const ex = map.get(r.id_cpl);
      if (ex) ex.rows.push(r);
      else map.set(r.id_cpl, { kode_cpl: r.kode_cpl, singkatan_cpl: r.singkatan_cpl, rows: [r] });
    }
    return Array.from(map.values());
  }, [addIkRows]);

  const saveAdd = async () => {
    if (!selectedCpmk) return;
    setAddSaving(true); setError(null);
    try {
      const id_ik_list = addIkRows.filter((r: IkPickRow) => r.mapped).map((r: IkPickRow) => r.id_ik);
      const res = await fetch('/api/admin/mapping-cpmk-ik', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id_cpmk: selectedCpmk.id_cpmk, id_ik_list }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setError(json.message || 'Gagal menyimpan.');
      else { setSuccess(json.message || 'Tersimpan.'); closeAddModal(); fetchData(activeKur); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setAddSaving(false); }
  };

  // ── Wizard step label ──────────────────────────────────────────────────
  const wizardStep = !selectedMk ? 1 : !selectedCpmk ? 2 : 3;

  return (
  <div className="space-y-6">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mt-1"><Network className="w-5 h-5" /></div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mapping CPMK → IK</h1>
        <p className="text-gray-600 mt-1">Pilih CPMK yang mendukung tiap Indikator Kinerja. Engine memakai rata-rata nilai CPMK → IK (tanpa bobot).</p>
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
      <button type="button" onClick={openAddModal} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">
        <Plus className="w-4 h-4" /> Tambah Mapping
      </button>
    </div>

    {!loading && ikList.length > 0 && (() => {
      const sudahMap = ikList.filter((r: IkRow) => Number(r.jumlah_cpmk) > 0).length;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Total IK</p><p className="text-2xl font-bold text-gray-900">{ikList.length}</p></div>
          <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Sudah Dipetakan</p><p className="text-2xl font-bold text-green-700">{sudahMap}</p></div>
          <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Belum Dipetakan</p><p className="text-2xl font-bold text-amber-700">{ikList.length - sudahMap}</p></div>
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
                <th className="px-4 py-2 text-center w-24">CPMK Terpetakan</th>
                <th className="px-4 py-2 text-center w-32">Status</th>
                <th className="px-4 py-2 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r: IkRow) => {
                const empty = Number(r.jumlah_cpmk) === 0;
                return (
                  <tr key={r.id_ik} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{r.singkatan_cpl}</span>
                      <span className="ml-1 font-mono text-xs text-gray-700">{r.kode_ik}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.deskripsi}</td>
                    <td className="px-4 py-2 text-center text-gray-700">{r.jumlah_cpmk}</td>
                    <td className="px-4 py-2 text-center">
                      {empty ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">Belum dipetakan</span>
                        : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">Sudah dipetakan</span>}
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

    {/* Detail modal (IK → CPMK) */}
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
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-400" /> CPMK Evaluator (bisa dipetakan)</span>
                  <span className="flex items-center gap-1 opacity-50">◻ CPMK non-evaluator (info saja)</span>
                </div>
                <div className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedCount} CPMK dipilih
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
                          <th className="px-3 py-1 text-left w-28">Kode</th>
                          <th className="px-3 py-1 text-left">Deskripsi</th>
                          <th className="px-3 py-1 text-center w-20">Dipetakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {g.rows.map((r: CpmkRow) => (
                          <tr key={r.id_cpmk} className={r.is_evaluator ? (r.mapped ? 'bg-indigo-50/40' : '') : 'opacity-50 bg-gray-50'}>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs text-gray-800">{r.kode_cpmk}</span>
                                {r.is_evaluator && <Star className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" />}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-gray-700">{r.deskripsi_id}</td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={r.mapped}
                                disabled={!r.is_evaluator}
                                onChange={() => toggleMapped(r.id_cpmk)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                              />
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
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}

    {/* Tambah Mapping modal (3-step: MK → CPMK → IK) */}
    {showAddModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeAddModal}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tambah Mapping CPMK → IK</h2>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${wizardStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1 Pilih Mata Kuliah</span>
                <span className="text-gray-300 text-xs">→</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${wizardStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2 Pilih CPMK</span>
                <span className="text-gray-300 text-xs">→</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${wizardStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>3 Pilih IK</span>
              </div>
            </div>
            <button onClick={closeAddModal} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>

          {/* Step 1: Pick MK */}
          {wizardStep === 1 && (
            <>
              <div className="px-4 pt-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="text" autoFocus value={mkSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setMkSearch(e.target.value)} placeholder="Cari kode / nama mata kuliah..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {mkLoading ? (
                  <div className="py-12 flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat mata kuliah…</div>
                ) : filteredMkOptions.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">Tidak ada mata kuliah ditemukan.<br /><span className="text-xs text-gray-400">Pastikan CPMK sudah ditambahkan di menu Kelola CPMK.</span></div>
                ) : filteredMkOptions.map((m: MkOption) => (
                  <button key={m.id_mata_kuliah} type="button" onClick={() => pickMk(m)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-left hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                    <span className="text-xs"><span className="font-mono font-semibold text-indigo-700">{m.kode_mk}</span><span className="text-gray-700"> — {m.nama_mk}</span></span>
                    <span className="text-xs text-indigo-400">Pilih →</span>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end">
                <button onClick={closeAddModal} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Batal</button>
              </div>
            </>
          )}

          {/* Step 2: Pick CPMK from selected MK */}
          {wizardStep === 2 && selectedMk && (
            <>
              <div className="px-4 pt-3 space-y-2">
                <button type="button" onClick={backToPickMk} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> Ganti Mata Kuliah
                </button>
                <div className="bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 text-xs text-indigo-800">
                  Mata Kuliah: <strong>{selectedMk.kode_mk} — {selectedMk.nama_mk}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="text" autoFocus value={cpmkSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setCpmkSearch(e.target.value)} placeholder="Cari kode CPMK / deskripsi..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {cpmkLoading ? (
                  <div className="py-12 flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat CPMK…</div>
                ) : filteredCpmk.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Tidak ada CPMK pada MK ini.<br />
                    <span className="text-xs text-gray-400">Tambahkan CPMK di menu Kelola CPMK terlebih dulu.</span>
                  </div>
                ) : filteredCpmk.map((c: CpmkPickRow) => (
                  <button key={c.id_cpmk} type="button" onClick={() => pickCpmk(c)}
                    className="w-full flex items-start gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-left hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                    <span className="font-mono text-xs font-semibold text-indigo-700 mt-0.5 whitespace-nowrap">{c.kode_cpmk}</span>
                    <span className="text-xs text-gray-700 flex-1">{c.deskripsi_id}</span>
                    <span className="text-xs text-indigo-400 whitespace-nowrap">Pilih →</span>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end">
                <button onClick={closeAddModal} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Batal</button>
              </div>
            </>
          )}

          {/* Step 3: Pick IK(s) */}
          {wizardStep === 3 && selectedCpmk && (
            <>
              <div className="px-4 pt-3 space-y-2">
                <button type="button" onClick={backToPickCpmk} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> Ganti CPMK
                </button>
                <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 text-xs text-indigo-900">
                  <strong>CPMK:</strong> {selectedCpmk.kode_cpmk} — {selectedCpmk.deskripsi_id}
                </div>
              </div>
              <div className="px-4 pt-2 flex justify-end">
                <span className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {addSelectedCount} IK dipilih
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {addIkLoading ? (
                  <div className="py-12 flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat IK…</div>
                ) : groupedAddIk.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">Tidak ada IK pada kurikulum ini.</div>
                ) : groupedAddIk.map((g: { kode_cpl: string; singkatan_cpl: string; rows: IkPickRow[] }, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{g.singkatan_cpl}</span>
                      <span className="font-mono text-xs text-gray-700">{g.kode_cpl}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {g.rows.map((r: IkPickRow) => (
                        <label key={r.id_ik} className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-xs ${r.mapped ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={r.mapped} onChange={() => toggleAddIk(r.id_ik)} className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span><span className="font-mono font-semibold text-indigo-700">{r.kode_ik}</span><span className="text-gray-700"> — {r.deskripsi}</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={closeAddModal} disabled={addSaving} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Batal</button>
                <button onClick={saveAdd} disabled={addSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                  {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
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
