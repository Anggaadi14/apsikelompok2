'use client';

import { UserSession } from '../../../data/users';
import { CheckSquare, Plus, Search, Edit, Trash2, Loader2, AlertCircle, CheckCircle2, X, Filter } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

interface IkManagementViewProps { sessionUser: UserSession; }

interface IkItem {
  id_ik: number; id_cpl: number; kode_ik: string; deskripsi: string; deskripsi_en: string | null; urutan: number;
  kode_cpl: string; singkatan_cpl: string; id_kurikulum: number; kode_kurikulum: string;
}
interface CplOpt { id_cpl: number; id_kurikulum: number; kode_cpl: string; singkatan: string; domain: string; kode_kurikulum: string; kurikulum_active: number; }

const KODE_IK_REGEX = /^[A-Za-z]+-[0-9]+$/;

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

export default function IkManagementView({ sessionUser: _su }: IkManagementViewProps) {
  const [ikList, setIkList] = useState<IkItem[]>([]);
  const [cplList, setCplList] = useState<CplOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterKur, setFilterKur] = useState<string>('all');
  const [filterCpl, setFilterCpl] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // form
  const [fIdCpl, setFIdCpl] = useState<string>('');
  const [fKode, setFKode] = useState('');
  const [fDesk, setFDesk] = useState('');
  const [fDeskEn, setFDeskEn] = useState('');
  const [fUrutan, setFUrutan] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/ik', { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat IK.'); setIkList([]); }
      else { setIkList((json.data?.ikList as IkItem[]) ?? []); setCplList((json.data?.cplList as CplOpt[]) ?? []); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const kurOptions = useMemo(() => Array.from(new Set(cplList.map((c: CplOpt) => c.kode_kurikulum))), [cplList]);
  const filteredCpl = useMemo(() => cplList.filter((c: CplOpt) => filterKur === 'all' || c.kode_kurikulum === filterKur), [cplList, filterKur]);

  const filteredIk = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ikList.filter((r: IkItem) => {
      if (filterKur !== 'all' && r.kode_kurikulum !== filterKur) return false;
      if (filterCpl !== 'all' && String(r.id_cpl) !== filterCpl) return false;
      if (!q) return true;
      return r.kode_ik.toLowerCase().includes(q) || r.deskripsi.toLowerCase().includes(q) || (r.deskripsi_en ?? '').toLowerCase().includes(q) || r.kode_cpl.toLowerCase().includes(q);
    });
  }, [ikList, filterKur, filterCpl, search]);

  const openCreate = () => {
    setEditId(null); setFIdCpl(''); setFKode(''); setFDesk(''); setFDeskEn(''); setFUrutan(0);
    setShowModal(true); setError(null); setSuccess(null); setFormError(null);
  };
  const openEdit = (r: IkItem) => {
    setEditId(r.id_ik); setFIdCpl(String(r.id_cpl)); setFKode(r.kode_ik); setFDesk(r.deskripsi); setFDeskEn(r.deskripsi_en || ''); setFUrutan(r.urutan);
    setShowModal(true); setError(null); setSuccess(null); setFormError(null);
  };
  const closeModal = () => { if (!submitting) setShowModal(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setFormError(null);
    const kodeTrimmed = fKode.trim();
    if (!KODE_IK_REGEX.test(kodeTrimmed)) {
      setFormError('Format Kode IK harus huruf-angka, contoh: IK-1.');
      return;
    }
    setSubmitting(true);
    try {
      const body = { id_cpl: Number(fIdCpl), kode_ik: kodeTrimmed, deskripsi: fDesk.trim(), deskripsi_en: fDeskEn.trim() || null, urutan: fUrutan };
      const url = editId ? `/api/admin/ik/${editId}` : '/api/admin/ik';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setFormError(json.message || 'Gagal menyimpan.');
      else { setSuccess(json.message || 'Tersimpan.'); setShowModal(false); fetchData(); }
    } catch { setFormError('Tidak dapat terhubung ke server.'); }
    finally { setSubmitting(false); }
  };

  const remove = async (r: IkItem) => {
    if (!confirm(`Hapus IK ${r.kode_ik}?`)) return;
    setError(null); setSuccess(null);
    const res = await fetch(`/api/admin/ik/${r.id_ik}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) setError(json.message || 'Gagal hapus.');
    else { setSuccess(json.message || 'Terhapus.'); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mt-1"><CheckSquare className="w-5 h-5" /></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kelola Indikator Kinerja (IK)</h1>
            <p className="text-gray-600 mt-1">Manajemen IK turunan CPL. IK dipakai untuk mapping CPMK dan agregasi nilai.</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
          <Plus className="w-4 h-4" /> Tambah IK
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 text-sm text-green-700"><CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {success}</div>}

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Cari kode IK / deskripsi / kode CPL..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={filterKur} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setFilterKur(e.target.value); setFilterCpl('all'); }} className="text-sm border-gray-300 rounded-md shadow-sm">
            <option value="all">Semua Kurikulum</option>
            {kurOptions.map((k: string) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={filterCpl} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterCpl(e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm">
            <option value="all">Semua CPL</option>
            {filteredCpl.map((c: CplOpt) => <option key={c.id_cpl} value={String(c.id_cpl)}>{c.kode_cpl} ({c.singkatan})</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat IK…</div>
      ) : filteredIk.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">Tidak ada IK.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left w-28">Kode IK</th>
                  <th className="px-4 py-2 text-left w-40">CPL Induk</th>
                  <th className="px-4 py-2 text-left">Deskripsi (Indonesia)</th>
                  <th className="px-4 py-2 text-left">Description (English)</th>
                  <th className="px-4 py-2 text-center w-20">Urutan</th>
                  <th className="px-4 py-2 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredIk.map((r: IkItem) => (
                  <tr key={r.id_ik} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-800">{r.kode_ik}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{r.singkatan_cpl}</span>
                      <span className="ml-1 text-xs text-gray-500">{r.kode_cpl} / {r.kode_kurikulum}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.deskripsi}</td>
                    <td className="px-4 py-2 text-gray-500 italic">{r.deskripsi_en || '-'}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{r.urutan}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => remove(r)} title="Hapus" className="p-1.5 rounded-md hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Edit IK' : 'Tambah IK'}</h2>
              <button onClick={closeModal} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPL Induk *</label>
                <select required value={fIdCpl} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFIdCpl(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm">
                  <option value="">-- Pilih CPL --</option>
                  {cplList.map((c: CplOpt) => <option key={c.id_cpl} value={String(c.id_cpl)}>{c.kode_kurikulum} · {c.kode_cpl} ({c.singkatan})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode IK *</label>
                  <input
                    required type="text" maxLength={20} value={fKode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFKode(e.target.value)}
                    placeholder="IK-1"
                    className={`w-full text-sm rounded-md shadow-sm ${fKode && !KODE_IK_REGEX.test(fKode.trim()) ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-gray-300'}`}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Format: HURUF-ANGKA, contoh IK-1</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                  <input type="number" min={0} value={fUrutan} onChange={(e: ChangeEvent<HTMLInputElement>) => setFUrutan(Number(e.target.value) || 0)} className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Indonesia) *</label>
                <textarea required rows={3} value={fDesk} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFDesk(e.target.value)} placeholder="Mampu mengidentifikasi…" className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (English) <span className="text-gray-400 text-xs">(opsional)</span></label>
                <textarea rows={2} value={fDeskEn} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFDeskEn(e.target.value)} placeholder="Able to identify…" className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
              </div>
              {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {formError}</div>}
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