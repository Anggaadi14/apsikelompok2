'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserSession } from '../../../data/users';
import {
  Plus, Search, Target, AlertCircle, CheckCircle,
  Loader2, Filter, Info, Trash2, Edit, X, Save
} from 'lucide-react';

interface CplManagementViewProps {
  sessionUser: UserSession;
}

interface CplItem {
  id_cpl: number;
  id_kurikulum: number;
  kode_cpl: string;
  singkatan: string;
  domain: 'Pengetahuan' | 'Keterampilan Khusus' | 'Keterampilan Umum' | 'Sikap';
  deskripsi_id: string;
  deskripsi_en: string | null;
  urutan: number;
  kode_kurikulum: string;
  nama_kurikulum: string;
}

interface KurikulumItem {
  id_kurikulum: number;
  kode: string;
  nama: string;
  is_active: number;
}

const DOMAINS = ['Pengetahuan', 'Keterampilan Khusus', 'Keterampilan Umum', 'Sikap'] as const;

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  return raw ? { 'x-user-session': raw } : {};
}

export default function CplManagementView({ sessionUser }: CplManagementViewProps) {
  const [cplList, setCplList] = useState<CplItem[]>([]);
  const [kurikulumList, setKurikulumList] = useState<KurikulumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingError, setFetchingError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterKurikulum, setFilterKurikulum] = useState<string>('all');

  // Add form states
  const [idKurikulum, setIdKurikulum] = useState<string>('');
  const [kodeCpl, setKodeCpl] = useState('');
  const [singkatan, setSingkatan] = useState('');
  const [domain, setDomain] = useState<string>('Pengetahuan');
  const [deskripsiId, setDeskripsiId] = useState('');
  const [deskripsiEn, setDeskripsiEn] = useState('');
  const [urutan, setUrutan] = useState<number>(1);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCpl, setEditCpl] = useState<CplItem | null>(null);
  const [editKodeCpl, setEditKodeCpl] = useState('');
  const [editSingkatan, setEditSingkatan] = useState('');
  const [editDomain, setEditDomain] = useState<string>('Pengetahuan');
  const [editDeskripsiId, setEditDeskripsiId] = useState('');
  const [editDeskripsiEn, setEditDeskripsiEn] = useState('');
  const [editUrutan, setEditUrutan] = useState<number>(1);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchingError(null);
    try {
      const rawSession = sessionStorage.getItem('currentUser') ?? '';
      const res = await fetch('/api/admin/cpl', {
        headers: { 'x-user-session': rawSession },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? `HTTP ${res.status}`);

      const cpls = json.data.cplList as CplItem[];
      const kurikulums = json.data.kurikulumList as KurikulumItem[];

      setCplList(cpls);
      setKurikulumList(kurikulums);

      const activeK = kurikulums.find(k => k.is_active === 1);
      if (activeK) {
        setIdKurikulum(String(activeK.id_kurikulum));
      } else if (kurikulums.length > 0) {
        setIdKurikulum(String(kurikulums[0].id_kurikulum));
      }
    } catch (e) {
      setFetchingError(e instanceof Error ? e.message : 'Gagal memuat data dari server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!kodeCpl.trim()) { setValidationError('Kode CPL tidak boleh kosong!'); return; }
    if (!idKurikulum) { setValidationError('Silakan pilih kurikulum terlebih dahulu.'); return; }
    if (!singkatan.trim()) { setValidationError('Singkatan CPL wajib diisi (misal: P1, S1, KK1).'); return; }
    if (!deskripsiId.trim()) { setValidationError('Deskripsi CPL (Bahasa Indonesia) wajib diisi.'); return; }

    setSubmitting(true);
    try {
      const rawSession = sessionStorage.getItem('currentUser') ?? '';
      const payload = {
        id_kurikulum: Number(idKurikulum),
        kode_cpl: kodeCpl.trim(),
        singkatan: singkatan.trim(),
        domain,
        deskripsi_id: deskripsiId.trim(),
        deskripsi_en: deskripsiEn.trim() || null,
        urutan: Number(urutan) || 1,
      };
      const res = await fetch('/api/admin/cpl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-session': rawSession },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menyimpan data CPL');
      setSuccessMessage('Data CPL berhasil disimpan!');
      setKodeCpl('');
      setSingkatan('');
      setDeskripsiId('');
      setDeskripsiEn('');
      setUrutan(prev => prev + 1);
      await loadData();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Gagal menyimpan data CPL');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (cpl: CplItem) => {
    setEditCpl(cpl);
    setEditKodeCpl(cpl.kode_cpl);
    setEditSingkatan(cpl.singkatan);
    setEditDomain(cpl.domain);
    setEditDeskripsiId(cpl.deskripsi_id);
    setEditDeskripsiEn(cpl.deskripsi_en || '');
    setEditUrutan(cpl.urutan);
    setEditError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => { if (!editSubmitting) setShowEditModal(false); };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCpl) return;
    setEditError(null);
    if (!editKodeCpl.trim()) { setEditError('Kode CPL tidak boleh kosong.'); return; }
    if (!editSingkatan.trim()) { setEditError('Singkatan wajib diisi.'); return; }
    if (!editDeskripsiId.trim()) { setEditError('Deskripsi (Indonesia) wajib diisi.'); return; }

    setEditSubmitting(true);
    try {
      const rawSession = sessionStorage.getItem('currentUser') ?? '';
      const payload = {
        kode_cpl: editKodeCpl.trim(),
        singkatan: editSingkatan.trim(),
        domain: editDomain,
        deskripsi_id: editDeskripsiId.trim(),
        deskripsi_en: editDeskripsiEn.trim() || null,
        urutan: Number(editUrutan) || 1,
      };
      const res = await fetch(`/api/admin/cpl/${editCpl.id_cpl}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-session': rawSession },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menyimpan perubahan');
      setShowEditModal(false);
      setSuccessMessage('CPL berhasil diperbarui!');
      setValidationError(null);
      await loadData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (cpl: CplItem) => {
    if (!confirm(`Hapus CPL "${cpl.kode_cpl} (${cpl.singkatan})"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setValidationError(null);
    setSuccessMessage(null);
    try {
      const rawSession = sessionStorage.getItem('currentUser') ?? '';
      const res = await fetch(`/api/admin/cpl/${cpl.id_cpl}`, {
        method: 'DELETE',
        headers: { 'x-user-session': rawSession },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menghapus CPL');
      setSuccessMessage(`CPL "${cpl.kode_cpl}" berhasil dihapus.`);
      await loadData();
    } catch (err) {
      setFetchingError(err instanceof Error ? err.message : 'Gagal menghapus CPL');
    }
  };

  const filteredCpls = cplList.filter(c => {
    const matchSearch =
      c.kode_cpl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.singkatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.deskripsi_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.deskripsi_en ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchKurikulum = filterKurikulum === 'all' || String(c.id_kurikulum) === filterKurikulum;
    return matchSearch && matchKurikulum;
  });

  const getDomainBadgeClass = (domainStr: string) => {
    switch (domainStr) {
      case 'Pengetahuan': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Keterampilan Khusus': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Keterampilan Umum': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Sikap': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-indigo-600" />
            Kelola CPL
          </h1>
          <p className="text-gray-600 mt-1">
            Manajemen Capaian Pembelajaran Lulusan (CPL) program studi berbasis Kurikulum.
          </p>
        </div>
      </div>

      {fetchingError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi Kesalahan</p>
            <p className="text-sm">{fetchingError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CPL List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari CPL (kode, singkatan, deskripsi)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 min-w-[180px]">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterKurikulum}
                  onChange={(e) => setFilterKurikulum(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="all">Semua Kurikulum</option>
                  {kurikulumList.map(k => (
                    <option key={k.id_kurikulum} value={k.id_kurikulum}>
                      Kurikulum {k.kode} {k.is_active ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Memuat data CPL...</p>
                </div>
              ) : filteredCpls.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-700 font-semibold uppercase text-xs">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-24">Kode</th>
                      <th className="py-3 px-4 w-20">Singkatan</th>
                      <th className="py-3 px-4">Deskripsi (Indonesia)</th>
                      <th className="py-3 px-4">Description (English)</th>
                      <th className="py-3 px-4 w-32">Domain</th>
                      <th className="py-3 px-4 w-24">Kurikulum</th>
                      <th className="py-3 px-4 w-20 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600">
                    {filteredCpls.map((cpl, idx) => (
                      <tr key={cpl.id_cpl} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-gray-900 font-mono">{cpl.kode_cpl}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-bold font-mono">
                            {cpl.singkatan}
                          </span>
                        </td>
                        <td className="py-3 px-4 leading-relaxed text-gray-900 text-xs">{cpl.deskripsi_id}</td>
                        <td className="py-3 px-4 leading-relaxed text-gray-500 italic text-xs">{cpl.deskripsi_en || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${getDomainBadgeClass(cpl.domain)}`}>
                            {cpl.domain}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-500 text-xs">{cpl.kode_kurikulum}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => openEditModal(cpl)}
                              title="Edit CPL"
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cpl)}
                              title="Hapus CPL"
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Tidak ada CPL yang ditemukan.</p>
                </div>
              )}
            </div>

            {!loading && (
              <div className="p-3 bg-gray-50/50 border-t border-gray-200 text-xs text-gray-500 font-medium">
                Menampilkan {filteredCpls.length} dari {cplList.length} CPL terdaftar.
              </div>
            )}
          </div>
        </div>

        {/* Add CPL Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Pencatatan CPL
              </h2>
              <p className="text-xs text-gray-500">Tambah data Capaian Pembelajaran Lulusan baru.</p>
            </div>

            {validationError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Kurikulum *</label>
                <select
                  value={idKurikulum}
                  onChange={(e) => setIdKurikulum(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  <option value="">-- Pilih Kurikulum --</option>
                  {kurikulumList.map(k => (
                    <option key={k.id_kurikulum} value={k.id_kurikulum}>
                      {k.nama} ({k.kode}) {k.is_active ? ' - [Aktif]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Kode CPL *</label>
                <input
                  type="text"
                  placeholder="Contoh: 1, 2, 10"
                  value={kodeCpl}
                  onChange={(e) => setKodeCpl(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Singkatan *</label>
                <input
                  type="text"
                  placeholder="Contoh: S1, P1, KK1, KU1"
                  value={singkatan}
                  onChange={(e) => setSingkatan(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Domain *</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Deskripsi ID (Indonesia) *</label>
                <textarea
                  placeholder="Deskripsi CPL dalam Bahasa Indonesia"
                  value={deskripsiId}
                  onChange={(e) => setDeskripsiId(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Deskripsi EN (English)</label>
                <textarea
                  placeholder="CPL description in English (opsional)"
                  value={deskripsiEn}
                  onChange={(e) => setDeskripsiEn(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Urutan Tampilan</label>
                <input
                  type="number"
                  min="1"
                  value={urutan}
                  onChange={(e) => setUrutan(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : 'Simpan Data CPL'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {showEditModal && editCpl && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeEditModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                Edit CPL — {editCpl.kode_cpl}
              </h2>
              <button onClick={closeEditModal} className="p-1 rounded-md hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                Kurikulum: <span className="font-semibold">{editCpl.kode_kurikulum} — {editCpl.nama_kurikulum}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode CPL *</label>
                <input
                  required type="text" value={editKodeCpl}
                  onChange={(e) => setEditKodeCpl(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Singkatan *</label>
                  <input
                    required type="text" value={editSingkatan}
                    onChange={(e) => setEditSingkatan(e.target.value)}
                    placeholder="S1, P1, KK1..."
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                  <input
                    type="number" min="1" value={editUrutan}
                    onChange={(e) => setEditUrutan(Number(e.target.value))}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
                <select
                  required value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Indonesia) *</label>
                <textarea
                  required rows={3} value={editDeskripsiId}
                  onChange={(e) => setEditDeskripsiId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (English) <span className="text-gray-400 text-xs">(opsional)</span>
                </label>
                <textarea
                  rows={2} value={editDeskripsiEn}
                  onChange={(e) => setEditDeskripsiEn(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {editError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeEditModal} disabled={editSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={editSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
