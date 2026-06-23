'use client';

import { UserSession } from '../../../data/users';
import { BookOpen, Plus, Search, Edit, Trash2, Loader2, AlertCircle, CheckCircle2, X, Filter } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

interface MatkulManagementViewProps { sessionUser: UserSession; }

interface MkItem {
  id_mata_kuliah: number; kode_mk: string; nama_mk: string; nama_mk_en: string | null; sks: number; singkatan: string | null;
  jumlah_kurikulum: number; jumlah_cpmk: number;
}
interface LinkItem { id_mata_kuliah: number; id_kurikulum: number; is_wajib: number; semester_default: number | null; kode_kurikulum: string; }
interface KurOpt { id_kurikulum: number; kode: string; nama: string; is_active: number; }
interface FormLink { id_kurikulum: number; is_wajib: boolean; semester_default: number | null; }

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

export default function MatkulManagementView({ sessionUser: _su }: MatkulManagementViewProps) {
  const [mkList, setMkList] = useState<MkItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [kurList, setKurList] = useState<KurOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterKur, setFilterKur] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fKode, setFKode] = useState('');
  const [fNama, setFNama] = useState('');
  const [fNamaEn, setFNamaEn] = useState('');
  const [fSks, setFSks] = useState<number>(3);
  const [fSingkatan, setFSingkatan] = useState('');
  const [fLinks, setFLinks] = useState<FormLink[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/matkul', { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat MK.'); setMkList([]); }
      else {
        setMkList((json.data?.mkList as MkItem[]) ?? []);
        setLinks((json.data?.links as LinkItem[]) ?? []);
        setKurList((json.data?.kurList as KurOpt[]) ?? []);
      }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mkList.filter((r: MkItem) => {
      if (filterKur !== 'all') {
        const hasLink = links.some((l: LinkItem) => l.id_mata_kuliah === r.id_mata_kuliah && l.kode_kurikulum === filterKur);
        if (!hasLink) return false;
      }
      if (!q) return true;
      return r.kode_mk.toLowerCase().includes(q) || r.nama_mk.toLowerCase().includes(q) || (r.nama_mk_en || '').toLowerCase().includes(q) || (r.singkatan || '').toLowerCase().includes(q);
    });
  }, [mkList, links, filterKur, search]);

  const linksFor = (id_mk: number): LinkItem[] => links.filter((l: LinkItem) => l.id_mata_kuliah === id_mk);

  const openCreate = () => {
    setEditId(null); setFKode(''); setFNama(''); setFNamaEn(''); setFSks(3); setFSingkatan('');
    const activeKur = kurList.find((k: KurOpt) => k.is_active === 1);
    setFLinks(activeKur ? [{ id_kurikulum: activeKur.id_kurikulum, is_wajib: true, semester_default: null }] : []);
    setShowModal(true); setError(null); setSuccess(null);
  };
  const openEdit = (r: MkItem) => {
    setEditId(r.id_mata_kuliah); setFKode(r.kode_mk); setFNama(r.nama_mk); setFNamaEn(r.nama_mk_en || ''); setFSks(Number(r.sks)); setFSingkatan(r.singkatan || '');
    setFLinks(linksFor(r.id_mata_kuliah).map((l: LinkItem) => ({ id_kurikulum: l.id_kurikulum, is_wajib: l.is_wajib === 1, semester_default: l.semester_default })));
    setShowModal(true); setError(null); setSuccess(null);
  };
  const closeModal = () => { if (!submitting) setShowModal(false); };

  const toggleLink = (id_kurikulum: number) => {
    setFLinks((prev: FormLink[]) => {
      const ex = prev.find((l: FormLink) => l.id_kurikulum === id_kurikulum);
      if (ex) return prev.filter((l: FormLink) => l.id_kurikulum !== id_kurikulum);
      return [...prev, { id_kurikulum, is_wajib: true, semester_default: null }];
    });
  };
  const updateLink = (id_kurikulum: number, patch: Partial<FormLink>) => {
    setFLinks((prev: FormLink[]) => prev.map((l: FormLink) => l.id_kurikulum === id_kurikulum ? { ...l, ...patch } : l));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      const body = {
        kode_mk: fKode.trim(), nama_mk: fNama.trim(), nama_mk_en: fNamaEn.trim() || null, sks: fSks,
        singkatan: fSingkatan.trim() || null,
        links: fLinks.map((l: FormLink) => ({ id_kurikulum: l.id_kurikulum, is_wajib: l.is_wajib ? 1 : 0, semester_default: l.semester_default })),
      };
      const url = editId ? `/api/admin/matkul/${editId}` : '/api/admin/matkul';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setError(json.message || 'Gagal menyimpan.');
      else { setSuccess(json.message || 'Tersimpan.'); setShowModal(false); fetchData(); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setSubmitting(false); }
  };

  const remove = async (r: MkItem) => {
    if (!confirm(`Hapus mata kuliah ${r.kode_mk} — ${r.nama_mk}?`)) return;
    setError(null); setSuccess(null);
    const res = await fetch(`/api/admin/matkul/${r.id_mata_kuliah}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) setError(json.message || 'Gagal hapus.');
    else { setSuccess(json.message || 'Terhapus.'); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mt-1"><BookOpen className="w-5 h-5" /></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kelola Mata Kuliah</h1>
            <p className="text-gray-600 mt-1">Manajemen mata kuliah master + relasi ke kurikulum (semester default, wajib/pilihan).</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
          <Plus className="w-4 h-4" /> Tambah Mata Kuliah
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 text-sm text-green-700"><CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {success}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Cari kode / nama MK / singkatan..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={filterKur} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterKur(e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm">
            <option value="all">Semua Kurikulum</option>
            {kurList.map((k: KurOpt) => <option key={k.id_kurikulum} value={k.kode}>{k.kode}{k.is_active === 1 ? ' (aktif)' : ''}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat mata kuliah…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">Tidak ada mata kuliah.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left w-28">Kode MK</th>
                  <th className="px-4 py-2 text-left">Nama (Indonesia)</th>
                  <th className="px-4 py-2 text-left">Name (English)</th>
                  <th className="px-4 py-2 text-left w-24">Singkatan</th>
                  <th className="px-4 py-2 text-center w-16">SKS</th>
                  <th className="px-4 py-2 text-left w-56">Kurikulum</th>
                  <th className="px-4 py-2 text-center w-20">CPMK</th>
                  <th className="px-4 py-2 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r: MkItem) => {
                  const ls = linksFor(r.id_mata_kuliah);
                  return (
                    <tr key={r.id_mata_kuliah} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-800">{r.kode_mk}</td>
                      <td className="px-4 py-2 text-gray-800">{r.nama_mk}</td>
                      <td className="px-4 py-2 text-gray-500 italic">{r.nama_mk_en || '-'}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{r.singkatan || '—'}</td>
                      <td className="px-4 py-2 text-center text-gray-700">{Number(r.sks)}</td>
                      <td className="px-4 py-2">
                        {ls.length === 0 ? <span className="text-xs text-gray-400">—</span> : (
                          <div className="flex flex-wrap gap-1">
                            {ls.map((l: LinkItem) => (
                              <span key={l.id_kurikulum} title={`Semester ${l.semester_default ?? '-'}, ${l.is_wajib === 1 ? 'Wajib' : 'Pilihan'}`} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${l.is_wajib === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {l.kode_kurikulum}{l.semester_default ? `·s${l.semester_default}` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-gray-600">{r.jumlah_cpmk}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => remove(r)} title="Hapus" className="p-1.5 rounded-md hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}</h2>
              <button onClick={closeModal} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode MK *</label>
                  <input required type="text" maxLength={30} value={fKode} onChange={(e: ChangeEvent<HTMLInputElement>) => setFKode(e.target.value)} placeholder="TI24-101" className="w-full text-sm border-gray-300 rounded-md shadow-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKS *</label>
                  <input required type="number" min={0} max={99} step={0.5} value={fSks} onChange={(e: ChangeEvent<HTMLInputElement>) => setFSks(Number(e.target.value) || 0)} className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama MK (Indonesia) *</label>
                <input required type="text" value={fNama} onChange={(e: ChangeEvent<HTMLInputElement>) => setFNama(e.target.value)} placeholder="Manajemen Operasional" className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama MK (English) <span className="text-gray-400 text-xs">(opsional)</span></label>
                <input type="text" value={fNamaEn} onChange={(e: ChangeEvent<HTMLInputElement>) => setFNamaEn(e.target.value)} placeholder="Operations Management" className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Singkatan <span className="text-gray-400 text-xs">(prefix CPMK, mis. "MO")</span></label>
                <input type="text" maxLength={20} value={fSingkatan} onChange={(e: ChangeEvent<HTMLInputElement>) => setFSingkatan(e.target.value)} placeholder="MO" className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tautan ke Kurikulum</label>
                <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
                  {kurList.length === 0 && <p className="p-3 text-xs text-gray-500">Belum ada kurikulum.</p>}
                  {kurList.map((k: KurOpt) => {
                    const checked = fLinks.some((l: FormLink) => l.id_kurikulum === k.id_kurikulum);
                    const link = fLinks.find((l: FormLink) => l.id_kurikulum === k.id_kurikulum);
                    return (
                      <div key={k.id_kurikulum} className="p-3 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 flex-1 min-w-[150px]">
                          <input type="checkbox" checked={checked} onChange={() => toggleLink(k.id_kurikulum)} className="rounded" />
                          <span className="text-sm font-medium text-gray-800">{k.kode}</span>
                          {k.is_active === 1 && <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">aktif</span>}
                        </label>
                        {checked && link && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Semester</label>
                            <input type="number" min={1} max={8} value={link.semester_default ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>) => updateLink(k.id_kurikulum, { semester_default: e.target.value === '' ? null : Number(e.target.value) })} placeholder="-" className="w-16 text-sm border-gray-300 rounded-md shadow-sm" />
                            <label className="flex items-center gap-1 text-xs text-gray-600">
                              <input type="checkbox" checked={link.is_wajib} onChange={(e: ChangeEvent<HTMLInputElement>) => updateLink(k.id_kurikulum, { is_wajib: e.target.checked })} className="rounded" />
                              Wajib
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">MK bisa terhubung ke beberapa kurikulum. Saat edit, daftar di sini akan menggantikan tautan lama.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} disabled={submitting} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}