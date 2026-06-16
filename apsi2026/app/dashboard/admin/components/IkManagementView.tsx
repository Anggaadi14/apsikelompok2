'use client';

import { useState, useEffect } from 'react';
import { UserSession } from '../../../data/users';
import {
  Plus, Search, CheckSquare, AlertCircle, CheckCircle,
  Loader2, Filter, Info, X,
} from 'lucide-react';

interface IkManagementViewProps {
  sessionUser: UserSession;
}

interface IkItem {
  id_ik: number;
  id_cpl: number;
  kode_ik: string;
  deskripsi: string;
  urutan: number;
  kode_cpl: string;
  singkatan_cpl: string;
  domain_cpl: string;
  id_kurikulum: number;
  kode_kurikulum: string;
  nama_kurikulum: string;
}

interface CplOption {
  id_cpl: number;
  kode_cpl: string;
  singkatan: string;
  domain: string;
  deskripsi_id: string;
  id_kurikulum: number;
  kode_kurikulum: string;
  nama_kurikulum: string;
  is_active: number;
}

export default function IkManagementView({ sessionUser: _sessionUser }: IkManagementViewProps) {
  // Data
  const [ikList, setIkList] = useState<IkItem[]>([]);
  const [cplList, setCplList] = useState<CplOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingError, setFetchingError] = useState<string | null>(null);

  // Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKurikulum, setFilterKurikulum] = useState<string>('all');
  const [filterCpl, setFilterCpl] = useState<string>('all');

  // Form / Modal
  const [showForm, setShowForm] = useState(false);
  const [formIdCpl, setFormIdCpl] = useState<string>('');
  const [formKodeIk, setFormKodeIk] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formUrutan, setFormUrutan] = useState<number>(1);

  // Status
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setFetchingError(null);
    try {
      const rawSession = sessionStorage.getItem('currentUser') ?? '';
      const res = await fetch('/api/admin/ik', {
        headers: { 'x-user-session': rawSession },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? `HTTP ${res.status}`);
      }
      setIkList(json.data.ikList as IkItem[]);
      setCplList(json.data.cplList as CplOption[]);
    } catch (e: any) {
      setFetchingError(e?.message ?? 'Gagal memuat data IK.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormIdCpl('');
    setFormKodeIk('');
    setFormDeskripsi('');
    setFormUrutan(1);
    setValidationError(null);
  };

  const openForm = () => {
    resetForm();
    setSuccessMessage(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const rawSession = sessionStorage.getItem('currentUser') ?? '';
      const res = await fetch('/api/admin/ik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': rawSession,
        },
        body: JSON.stringify({
          id_cpl: formIdCpl ? Number(formIdCpl) : null,
          kode_ik: formKodeIk,
          deskripsi: formDeskripsi,
          urutan: formUrutan,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setValidationError(json.message ?? `HTTP ${res.status}`);
        return;
      }
      setSuccessMessage(json.message ?? 'IK berhasil disimpan.');
      closeForm();
      await loadData();
    } catch (e: any) {
      setValidationError(e?.message ?? 'Gagal menyimpan IK.');
    } finally {
      setSubmitting(false);
    }
  };

  // Derived
  const kurikulumOptions = Array.from(
    new Map(
      cplList.map((c) => [
        c.id_kurikulum,
        { id: c.id_kurikulum, label: `${c.kode_kurikulum} — ${c.nama_kurikulum}`, is_active: c.is_active },
      ])
    ).values()
  );

  const filteredCplDropdown = filterKurikulum === 'all'
    ? cplList
    : cplList.filter((c) => String(c.id_kurikulum) === filterKurikulum);

  const filteredIk = ikList.filter((ik) => {
    if (filterKurikulum !== 'all' && String(ik.id_kurikulum) !== filterKurikulum) return false;
    if (filterCpl !== 'all' && String(ik.id_cpl) !== filterCpl) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        ik.kode_ik.toLowerCase().includes(q) ||
        ik.deskripsi.toLowerCase().includes(q) ||
        ik.kode_cpl.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-indigo-600" />
            Kelola Indikator Kinerja (IK)
          </h1>
          <p className="text-gray-600 mt-1">Manajemen IK yang terhubung dengan CPL pada setiap kurikulum.</p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah IK
        </button>
      </div>

      {/* Success flash */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter + Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kode IK, deskripsi, atau kode CPL..."
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={filterKurikulum}
              onChange={(e) => { setFilterKurikulum(e.target.value); setFilterCpl('all'); }}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Semua Kurikulum</option>
              {kurikulumOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}{k.is_active ? ' (aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={filterCpl}
              onChange={(e) => setFilterCpl(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Semua CPL</option>
              {filteredCplDropdown.map((c) => (
                <option key={c.id_cpl} value={c.id_cpl}>
                  {c.kode_cpl} — {c.singkatan}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fetch error */}
      {fetchingError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{fetchingError}</span>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex flex-col items-center gap-2 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Memuat data IK...</span>
          </div>
        ) : filteredIk.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Belum ada IK yang cocok dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Kode IK</th>
                  <th className="px-4 py-3 text-left">CPL</th>
                  <th className="px-4 py-3 text-left">Kurikulum</th>
                  <th className="px-4 py-3 text-left">Deskripsi</th>
                  <th className="px-4 py-3 text-center">Urutan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredIk.map((ik) => (
                  <tr key={ik.id_ik} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-indigo-700 whitespace-nowrap">{ik.kode_ik}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 font-medium">{ik.kode_cpl}</div>
                      <div className="text-xs text-gray-500">{ik.singkatan_cpl} • {ik.domain_cpl}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{ik.kode_kurikulum}</td>
                    <td className="px-4 py-3 text-gray-700">{ik.deskripsi}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{ik.urutan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Tambah IK Baru</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600" aria-label="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {validationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-800 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  CPL Terkait <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formIdCpl}
                  onChange={(e) => setFormIdCpl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  disabled={submitting}
                >
                  <option value="">— Pilih CPL —</option>
                  {cplList.map((c) => (
                    <option key={c.id_cpl} value={c.id_cpl}>
                      [{c.kode_kurikulum}] {c.kode_cpl} — {c.singkatan} ({c.domain})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">IK harus terhubung ke CPL — wajib dipilih.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Kode IK <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formKodeIk}
                    onChange={(e) => setFormKodeIk(e.target.value)}
                    placeholder="Contoh: I-1, II-3"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Urutan</label>
                  <input
                    type="number"
                    value={formUrutan}
                    onChange={(e) => setFormUrutan(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Deskripsi IK <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  rows={3}
                  placeholder="Deskripsi indikator kinerja..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan IK'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}