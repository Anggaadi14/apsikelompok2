'use client';

import { UserSession } from '../../../data/users';
import { ListChecks, Plus, Search, Edit, Trash2, Loader2, AlertCircle, CheckCircle2, X, Filter, Download, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

interface CpmkManagementViewProps { sessionUser: UserSession; }

interface CpmkItem {
  id_cpmk: number; id_mata_kuliah: number; kode_cpmk: string; deskripsi_id: string; deskripsi_en: string | null; urutan: number;
  kode_mk: string; nama_mk: string; singkatan_mk: string | null; is_evaluator_mk: boolean;
}
interface MkOpt { id_mata_kuliah: number; kode_mk: string; nama_mk: string; singkatan: string | null; sks: number; }

const KODE_CPMK_REGEX = /^[A-Za-z]+-[0-9]+$/;

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

export default function CpmkManagementView({ sessionUser: _su }: CpmkManagementViewProps) {
  const [cpmkList, setCpmkList] = useState<CpmkItem[]>([]);
  const [mkList, setMkList] = useState<MkOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMk, setFilterMk] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fIdMk, setFIdMk] = useState<string>('');
  const [fKode, setFKode] = useState('');
  const [fDeskId, setFDeskId] = useState('');
  const [fDeskEn, setFDeskEn] = useState('');
  const [fUrutan, setFUrutan] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/cpmk', { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat CPMK.'); setCpmkList([]); }
      else { setCpmkList((json.data?.cpmkList as CpmkItem[]) ?? []); setMkList((json.data?.mkList as MkOpt[]) ?? []); }
    } catch { setError('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cpmkList.filter((r: CpmkItem) => {
      if (filterMk !== 'all' && String(r.id_mata_kuliah) !== filterMk) return false;
      if (!q) return true;
      return r.kode_cpmk.toLowerCase().includes(q) || r.deskripsi_id.toLowerCase().includes(q) || (r.deskripsi_en ?? '').toLowerCase().includes(q) || r.kode_mk.toLowerCase().includes(q) || r.nama_mk.toLowerCase().includes(q);
    });
  }, [cpmkList, filterMk, search]);

  // CPMK already exists for selected MK (shown in modal)
  const cpmkForSelectedMk = useMemo(() => {
    if (!fIdMk || editId) return [];
    return cpmkList.filter(r => String(r.id_mata_kuliah) === fIdMk).sort((a, b) => a.urutan - b.urutan || a.kode_cpmk.localeCompare(b.kode_cpmk));
  }, [cpmkList, fIdMk, editId]);

  const handleMkChange = (idMk: string) => {
    setFIdMk(idMk);
    // Auto set next urutan
    const existing = cpmkList.filter(r => String(r.id_mata_kuliah) === idMk);
    const maxUrutan = existing.length > 0 ? Math.max(...existing.map(r => r.urutan)) : 0;
    setFUrutan(maxUrutan + 1);
  };

  const openCreate = () => { setEditId(null); setFIdMk(''); setFKode(''); setFDeskId(''); setFDeskEn(''); setFUrutan(0); setShowModal(true); setError(null); setSuccess(null); setFormError(null); };
  const openEdit = (r: CpmkItem) => { setEditId(r.id_cpmk); setFIdMk(String(r.id_mata_kuliah)); setFKode(r.kode_cpmk); setFDeskId(r.deskripsi_id); setFDeskEn(r.deskripsi_en || ''); setFUrutan(r.urutan); setShowModal(true); setError(null); setSuccess(null); setFormError(null); };
  const closeModal = () => { if (!submitting) setShowModal(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setFormError(null);
    const kodeTrimmed = fKode.trim();
    if (!KODE_CPMK_REGEX.test(kodeTrimmed)) {
      setFormError('Format Kode CPMK harus huruf-angka, contoh: MO-1.');
      return;
    }
    setSubmitting(true);
    try {
      const body = { id_mata_kuliah: Number(fIdMk), kode_cpmk: kodeTrimmed, deskripsi_id: fDeskId.trim(), deskripsi_en: fDeskEn.trim() || null, urutan: fUrutan };
      const url = editId ? `/api/admin/cpmk/${editId}` : '/api/admin/cpmk';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) setFormError(json.message || 'Gagal menyimpan.');
      else { setSuccess(json.message || 'Tersimpan.'); setShowModal(false); fetchData(); }
    } catch { setFormError('Tidak dapat terhubung ke server.'); }
    finally { setSubmitting(false); }
  };

  const remove = async (r: CpmkItem) => {
    if (!confirm(`Hapus CPMK ${r.kode_cpmk}?`)) return;
    setError(null); setSuccess(null);
    const res = await fetch(`/api/admin/cpmk/${r.id_cpmk}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) setError(json.message || 'Gagal hapus.');
    else { setSuccess(json.message || 'Terhapus.'); fetchData(); }
  };

  const evaluatorCount = useMemo(() => cpmkList.filter(r => r.is_evaluator_mk).length, [cpmkList]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mt-1"><ListChecks className="w-5 h-5" /></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kelola CPMK</h1>
            <p className="text-gray-600 mt-1">Manajemen Capaian Pembelajaran Mata Kuliah per Mata Kuliah.</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
          <Plus className="w-4 h-4" /> Tambah CPMK
        </button>
      </div>

      {/* Template panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-800">Template Import CPMK</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Gunakan template Excel OBE (sheet "4. CPMK") untuk import massal via menu Upload Data Master.
            <span className="ml-1 font-medium">Kolom: Kode CPMK · Kode MK · Deskripsi (Indonesia) · Deskripsi (English)</span>
          </p>
        </div>
        <a
          href="/templates/Template_Import_SICPL_KOSONG.xlsx"
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0"
        >
          <Download className="w-4 h-4" /> Download Template
        </a>
      </div>

      {/* Keterangan CPMK Evaluator */}
      {evaluatorCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Star className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">CPMK Evaluator</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Terdapat <strong>{evaluatorCount}</strong> CPMK Evaluator
              (ditandai dengan ikon <Star className="w-3 h-3 inline text-amber-600" />).
              CPMK Evaluator adalah CPMK yang digunakan sebagai komponen penilaian akhir capaian pembelajaran mahasiswa.
            </p>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 text-sm text-green-700"><CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {success}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Cari kode CPMK / deskripsi / kode MK..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={filterMk} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterMk(e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm">
            <option value="all">Semua Mata Kuliah</option>
            {mkList.map((m: MkOpt) => <option key={m.id_mata_kuliah} value={String(m.id_mata_kuliah)}>{m.kode_mk} — {m.nama_mk}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat CPMK…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">Tidak ada CPMK.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left w-28">Kode CPMK</th>
                  <th className="px-4 py-2 text-left w-48">Mata Kuliah</th>
                  <th className="px-4 py-2 text-left">Deskripsi (Indonesia)</th>
                  <th className="px-4 py-2 text-left">Description (English)</th>
                  <th className="px-4 py-2 text-center w-20">Urutan</th>
                  <th className="px-4 py-2 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r: CpmkItem) => (
                  <tr key={r.id_cpmk} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-800">{r.kode_cpmk}</span>
                        {r.is_evaluator_mk && (
                          <span title="CPMK Evaluator">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-xs font-semibold text-gray-800">{r.kode_mk}</div>
                      <div className="text-xs text-gray-500">{r.nama_mk}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.deskripsi_id}</td>
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
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            Menampilkan {filtered.length} dari {cpmkList.length} CPMK.
            {evaluatorCount > 0 && <span className="ml-2"><Star className="w-3 h-3 inline text-amber-500 fill-amber-400" /> = CPMK Evaluator</span>}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Edit CPMK' : 'Tambah CPMK'}</h2>
              <button onClick={closeModal} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mata Kuliah *</label>
                <select required value={fIdMk} onChange={(e: ChangeEvent<HTMLSelectElement>) => handleMkChange(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm">
                  <option value="">-- Pilih Mata Kuliah --</option>
                  {mkList.map((m: MkOpt) => <option key={m.id_mata_kuliah} value={String(m.id_mata_kuliah)}>{m.kode_mk} — {m.nama_mk}</option>)}
                </select>
              </div>

              {/* Show existing CPMK for selected MK */}
              {cpmkForSelectedMk.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">CPMK yang sudah ada di MK ini ({cpmkForSelectedMk.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {cpmkForSelectedMk.map(c => (
                      <div key={c.id_cpmk} className="flex items-start gap-2 text-xs">
                        <span className="font-mono font-semibold text-indigo-700 whitespace-nowrap">{c.kode_cpmk}</span>
                        <span className="text-gray-600 truncate">{c.deskripsi_id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fIdMk && cpmkForSelectedMk.length === 0 && !editId && (
                <p className="text-xs text-gray-400 -mt-2">Belum ada CPMK untuk MK ini.</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode CPMK *</label>
                  <input
                    required type="text" maxLength={30} value={fKode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFKode(e.target.value)}
                    placeholder="MO-1"
                    className={`w-full text-sm rounded-md shadow-sm ${fKode && !KODE_CPMK_REGEX.test(fKode.trim()) ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-gray-300'}`}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Format: HURUF-ANGKA, contoh MO-1</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                  <input type="number" min={0} value={fUrutan} onChange={(e: ChangeEvent<HTMLInputElement>) => setFUrutan(Number(e.target.value) || 0)} className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Indonesia) *</label>
                <textarea required rows={3} value={fDeskId} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFDeskId(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (English) <span className="text-gray-400 text-xs">(opsional)</span></label>
                <textarea rows={2} value={fDeskEn} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFDeskEn(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm" />
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
