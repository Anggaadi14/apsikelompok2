'use client';

import { useState, useEffect } from 'react';
import { UserSession } from '../../../data/users';
import { 
  Plus, Search, Target, AlertCircle, CheckCircle, 
  Loader2, Filter, Info, Trash2, Edit 
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

export default function CplManagementView({ sessionUser }: CplManagementViewProps) {
  // State data
  const [cplList, setCplList] = useState<CplItem[]>([]);
  const [kurikulumList, setKurikulumList] = useState<KurikulumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingError, setFetchingError] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKurikulum, setFilterKurikulum] = useState<string>('all');

  // Form states
  const [idKurikulum, setIdKurikulum] = useState<string>('');
  const [kodeCpl, setKodeCpl] = useState('');
  const [singkatan, setSingkatan] = useState('');
  const [domain, setDomain] = useState<string>('Pengetahuan');
  const [deskripsiId, setDeskripsiId] = useState('');
  const [deskripsiEn, setDeskripsiEn] = useState('');
  const [urutan, setUrutan] = useState<number>(1);

  // Status/Validation states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);
    setFetchingError(null);
    try {
      const rawSession = sessionStorage.getItem('currentUser') ?? '';
      const res = await fetch('/api/admin/cpl', {
        headers: { 'x-user-session': rawSession },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? `HTTP ${res.status}`);
      }
      
      const cpls = json.data.cplList as CplItem[];
      const kurikulums = json.data.kurikulumList as KurikulumItem[];
      
      setCplList(cpls);
      setKurikulumList(kurikulums);
      
      // Auto select active kurikulum in form
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
  };

  useEffect(() => {
    loadData();
  }, []);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Front-end Validation: Kode CPL kosong (Skenario: Kode CPL kosong)
    if (!kodeCpl.trim()) {
      setValidationError('Sistem meminta kode CPL. Kode CPL tidak boleh kosong!');
      return;
    }

    if (!idKurikulum) {
      setValidationError('Silakan pilih kurikulum terlebih dahulu.');
      return;
    }

    if (!singkatan.trim()) {
      setValidationError('Singkatan CPL wajib diisi (misal: P1, S1, KK1).');
      return;
    }

    if (!deskripsiId.trim()) {
      setValidationError('Deskripsi CPL (Bahasa Indonesia) wajib diisi.');
      return;
    }

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
        urutan: Number(urutan) || 1
      };

      const res = await fetch('/api/admin/cpl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': rawSession
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Skenario: Input CPL duplikat ditolak oleh server
        throw new Error(json.message ?? 'Gagal menyimpan data CPL');
      }

      // Skenario: Input CPL valid berhasil disimpan
      setSuccessMessage('Sistem menyimpan data CPL. Data berhasil disimpan!');
      
      // Reset form fields (kecuali kurikulum, domain, urutan)
      setKodeCpl('');
      setSingkatan('');
      setDeskripsiId('');
      setDeskripsiEn('');
      setUrutan(prev => prev + 1);

      // Reload list CPL
      await loadData();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Gagal menyimpan data CPL');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered CPL list
  const filteredCpls = cplList.filter(c => {
    const matchSearch = 
      c.kode_cpl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.singkatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.deskripsi_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.deskripsi_en ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchKurikulum = 
      filterKurikulum === 'all' || 
      String(c.id_kurikulum) === filterKurikulum;

    return matchSearch && matchKurikulum;
  });

  const getDomainBadgeClass = (domainStr: string) => {
    switch (domainStr) {
      case 'Pengetahuan':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Keterampilan Khusus':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Keterampilan Umum':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Sikap':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Grid Layout: Left List, Right Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: CPL List (2 cols on lg screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Filters Header */}
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

            {/* List Table */}
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
                      <th className="py-3 px-4 w-16 text-center">No</th>
                      <th className="py-3 px-4 w-28">Kode CPL</th>
                      <th className="py-3 px-4 w-24">Singkatan</th>
                      <th className="py-3 px-4">Deskripsi (Indonesia)</th>
                      <th className="py-3 px-4">Description (English)</th>
                      <th className="py-3 px-4 w-36">Domain</th>
                      <th className="py-3 px-4 w-32">Kurikulum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600">
                    {filteredCpls.map((cpl, idx) => (
                      <tr key={cpl.id_cpl} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-medium text-gray-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 font-mono">{cpl.kode_cpl}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-bold font-mono">
                            {cpl.singkatan}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 leading-relaxed text-gray-900">{cpl.deskripsi_id}</td>
                        <td className="py-3.5 px-4 leading-relaxed text-gray-500 italic">{cpl.deskripsi_en || '-'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDomainBadgeClass(cpl.domain)}`}>
                            {cpl.domain}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-500">
                          {cpl.kode_kurikulum}
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

            {/* Total count footer */}
            {!loading && (
              <div className="p-3 bg-gray-50/50 border-t border-gray-200 text-xs text-gray-500 font-medium">
                Menampilkan {filteredCpls.length} dari {cplList.length} CPL terdaftar.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add CPL Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Pencatatan CPL
              </h2>
              <p className="text-xs text-gray-500">Tambah data Capaian Pembelajaran Lulusan baru.</p>
            </div>

            {/* Feedback Alerts */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-start gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Kurikulum */}
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

              {/* Kode CPL */}
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

              {/* Singkatan */}
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

              {/* Domain */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Domain *</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  <option value="Pengetahuan">Pengetahuan</option>
                  <option value="Keterampilan Khusus">Keterampilan Khusus</option>
                  <option value="Keterampilan Umum">Keterampilan Umum</option>
                  <option value="Sikap">Sikap</option>
                </select>
              </div>

              {/* Deskripsi ID */}
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

              {/* Deskripsi EN */}
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

              {/* Urutan */}
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Data CPL'
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
