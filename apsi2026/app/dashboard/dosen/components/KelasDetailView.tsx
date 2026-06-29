'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { UserSession } from '../../../data/users';
import {
  ArrowLeft,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Save,
  X,
  Users,
  FileSpreadsheet,
} from 'lucide-react';

import CapaianCpmkPanel from './CapaianCpmkPanel';
import CapaianIkPanel from './CapaianIkPanel';
import CapaianCplPanel from './CapaianCplPanel';

interface KelasDetailViewProps {
  sessionUser: UserSession;
  idKelas: number;
  onBack: () => void;
}

type KelasDetail = {
  kelas: {
    id_kelas: number;
    kode_kelas: string | null;
    tahun_akademik: string;
    semester: string;
    kuota: number | null;
    id_mata_kuliah: number;
    kode_mk: string;
    nama_mk: string;
    sks: number;
    singkatan: string | null;
    kode_kurikulum: string;
    nama_kurikulum: string;
  };
  peran_dosen_login: 'koordinator' | 'anggota';
  komponen_nilai: Array<{
    id_komponen: number;
    kode_media: string;
    nama_media: string;
    bobot_terhadap_mk: number;
    urutan: number;
  }>;
  mahasiswa: Array<{
    id_mahasiswa: number;
    nim: string;
    nama_mahasiswa: string;
    email: string;
  }>;
  pengampu: Array<{
    id_staff: number;
    nama_lengkap: string;
    email: string;
    kode_dosen: string;
    peran_di_kelas: 'koordinator' | 'anggota';
  }>;
};

type NilaiRow = {
  id_nilai: number;
  id_mahasiswa: number;
  id_komponen: number;
  nim: string;
  nama_mahasiswa: string;
  kode_media: string;
  nama_media: string;
  nilai_asli: number | null;
  nilai_remedi: number | null;
  catatan: string | null;
};

type UploadResultDetail = {
  baris_excel: number;
  nim: string;
  status: 'sukses' | 'gagal' | 'sebagian';
  catatan?: string;
};

type SubTab = 'nilai' | 'cpmk' | 'ik' | 'cpl';

export default function KelasDetailView({ sessionUser, idKelas, onBack }: KelasDetailViewProps) {
  const [detail, setDetail] = useState<KelasDetail | null>(null);
  const [nilai, setNilai] = useState<NilaiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('nilai');

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [taList, setTaList] = useState<Array<{
  id_tahun_akademik: number;
  kode: string;
  label: string | null;
  is_active: 0 | 1;
}>>([]);
  const [selectedTa, setSelectedTa] = useState<number | ''>('');
  const [uploadResult, setUploadResult] = useState<{
    status: string;
    jumlah_berhasil: number;
    jumlah_gagal: number;
    warnings: string[];
    masalah_dilaporkan: number;
    details: UploadResultDetail[];
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit state
  const [editingCell, setEditingCell] = useState<{
    id_nilai: number | null;
    id_mahasiswa: number;
    id_komponen: number;
    field: 'nilai_asli' | 'nilai_remedi';
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ──────────────────────────────────────────────────────────
  const reloadNilai = async () => {
    try {
      const raw = sessionStorage.getItem('currentUser') ?? '';
      const res = await fetch(`/api/dosen/nilai/${idKelas}`, {
        headers: { 'x-user-session': raw },
      });
      const json = await res.json();
      if (res.ok && json.success) setNilai(json.data.nilai as NilaiRow[]);
    } catch {
      /* silent reload */
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = sessionStorage.getItem('currentUser') ?? '';
      const headers = { 'x-user-session': raw };
      const [resDetail, resNilai] = await Promise.all([
        fetch(`/api/dosen/kelas/${idKelas}`, { headers }),
        fetch(`/api/dosen/nilai/${idKelas}`, { headers }),
      ]);
      const jsonDetail = await resDetail.json();
      const jsonNilai = await resNilai.json();
      if (!resDetail.ok || !jsonDetail.success) {
        throw new Error(jsonDetail.message ?? `HTTP ${resDetail.status}`);
      }
      if (!resNilai.ok || !jsonNilai.success) {
        throw new Error(jsonNilai.message ?? `HTTP ${resNilai.status}`);
      }
      setDetail(jsonDetail.data as KelasDetail);
      setNilai(jsonNilai.data.nilai as NilaiRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKelas]);

  // ── Pivot nilai[id_mahasiswa][id_komponen] ────────────────────────────
  const nilaiPivot = useMemo(() => {
    const map = new Map<number, Map<number, NilaiRow>>();
    for (const n of nilai) {
      if (!map.has(n.id_mahasiswa)) map.set(n.id_mahasiswa, new Map());
      map.get(n.id_mahasiswa)!.set(n.id_komponen, n);
    }
    return map;
  }, [nilai]);

  // ── Auto-focus saat editing ───────────────────────────────────────────
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // ── Edit handlers ─────────────────────────────────────────────────────
  const startEdit = (
    id_mahasiswa: number,
    id_komponen: number,
    field: 'nilai_asli' | 'nilai_remedi',
  ) => {
    if (saving) return;
    const existing = nilaiPivot.get(id_mahasiswa)?.get(id_komponen);
    setEditingCell({
      id_nilai: existing?.id_nilai ?? null,
      id_mahasiswa,
      id_komponen,
      field,
    });
    const currentVal = existing?.[field];
    setEditValue(currentVal === null || currentVal === undefined ? '' : String(currentVal));
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const trimmed = editValue.trim();
    let parsed: number | null;
    if (trimmed === '') {
      parsed = null;
    } else {
      const n = parseFloat(trimmed.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        alert('Nilai harus angka antara 0–100, atau kosongkan untuk menghapus.');
        return;
      }
      parsed = n;
    }

    setSaving(true);
    try {
      const raw = sessionStorage.getItem('currentUser') ?? '';
      const res = await fetch(`/api/dosen/nilai/${idKelas}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': raw,
        },
        body: JSON.stringify({
          id_kelas: idKelas,
          id_mahasiswa: editingCell.id_mahasiswa,
          id_komponen: editingCell.id_komponen,
          field: editingCell.field,
          value: parsed,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? `HTTP ${res.status}`);
      }
      await reloadNilai();
      setEditingCell(null);
      setEditValue('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan nilai.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  // ── Upload handlers ───────────────────────────────────────────────────
  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const raw = sessionStorage.getItem('currentUser') ?? '';
const form = new FormData();
form.append('file', uploadFile);
form.append('id_kelas', String(idKelas));
if (selectedTa !== '') form.append('id_tahun_akademik', String(selectedTa));
const res = await fetch('/api/dosen/upload-nilai', {
        method: 'POST',
        headers: { 'x-user-session': raw },
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? `HTTP ${res.status}`);
      }
      setUploadResult(json.data);
      await reloadNilai();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = async () => {
  setShowUpload(true);
  if (taList.length === 0) {
    try {
      const raw = sessionStorage.getItem('currentUser') ?? '';
      const r = await fetch('/api/dosen/tahun-akademik', { headers: { 'x-user-session': raw } });
      const j = await r.json();
      if (r.ok && j.success) {
        setTaList(j.data.items);
        if (j.data.active) setSelectedTa(j.data.active.id_tahun_akademik);
      }
    } catch {
      /* abaikan; submit boleh tanpa TA */
    }
  }
};

const closeUploadModal = () => {
  setShowUpload(false);
  setUploadFile(null);
  setUploadResult(null);
  setUploadError(null);
};

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar kelas
        </button>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Memuat detail kelas...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar kelas
        </button>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Gagal memuat detail kelas</h3>
              <p className="text-sm text-red-700 mt-1">{error ?? 'Data tidak tersedia.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { kelas, komponen_nilai, mahasiswa, pengampu, peran_dosen_login } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline mb-3">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar kelas
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <span className="font-mono text-indigo-700 mr-2 text-2xl">{kelas.kode_mk}</span>
            {kelas.nama_mk}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Kelas {kelas.kode_kelas ?? '—'} • {kelas.tahun_akademik} {kelas.semester} •{' '}
            {kelas.sks} SKS • Kurikulum {kelas.kode_kurikulum}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Total Mahasiswa</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> {mahasiswa.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Komponen Nilai</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{komponen_nilai.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Peran Saya</p>
          <p className="text-lg font-bold mt-1">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                peran_dosen_login === 'koordinator'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {peran_dosen_login === 'koordinator' ? 'Koordinator' : 'Anggota'}
            </span>
          </p>
        </div>
      </div>

      {/* Tim pengampu */}
      {pengampu.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Tim Pengampu</p>
          <div className="flex flex-wrap gap-2">
            {pengampu.map((p) => (
              <span
                key={p.id_staff}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs"
              >
                <span className="font-semibold">{p.nama_lengkap}</span>
                <span className="text-indigo-500">({p.peran_di_kelas})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-slate-50/50">
          <div className="flex">
            <button
              onClick={() => setSubTab('nilai')}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 cursor-pointer transition ${
                subTab === 'nilai'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Tabel Nilai
            </button>
            <button
              onClick={() => setSubTab('cpmk')}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 cursor-pointer transition ${
                subTab === 'cpmk'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Capaian CPMK
            </button>
            <button
              onClick={() => setSubTab('ik')}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 cursor-pointer transition ${
                subTab === 'ik'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Capaian IK
            </button>
            <button
              onClick={() => setSubTab('cpl')}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 cursor-pointer transition ${
                subTab === 'cpl'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Capaian CPL
            </button>
          </div>
        </div>
      </div>

      {/* Tabel nilai */}
      {subTab === 'nilai' && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900">Tabel Nilai</h3>
          <button
            onClick={openUploadModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm"
          >
            <Upload className="w-4 h-4" /> Upload Nilai SIAKAD
          </button>
        </div>
        <div className="px-4 pt-3">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Klik sel untuk edit. Enter = simpan, Esc = batal. Baris R: = nilai remedi.
          </p>
        </div>

        {mahasiswa.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Belum ada mahasiswa yang terdaftar di kelas ini.
          </div>
        ) : komponen_nilai.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Mata kuliah ini belum punya komponen nilai. Hubungi tim jamu untuk setup di Tahap 6.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-semibold uppercase text-gray-600">
                  <th className="px-3 py-3 sticky left-0 bg-gray-50 z-10">NIM</th>
                  <th className="px-3 py-3 sticky left-[100px] bg-gray-50 z-10 min-w-[200px]">Nama</th>
                  {komponen_nilai.map((k) => (
                    <th key={k.id_komponen} className="px-3 py-3 text-center min-w-[130px]">
                      <div className="font-bold text-indigo-700">{k.kode_media}</div>
                      <div className="text-[10px] font-normal text-gray-500 normal-case">
                        {k.nama_media}
                      </div>
                      <div className="text-[10px] font-normal text-gray-400 normal-case">
                        {Number(k.bobot_terhadap_mk).toFixed(1)}%
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mahasiswa.map((m) => (
                  <tr key={m.id_mahasiswa} className="hover:bg-indigo-50/30">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10 font-mono text-xs text-gray-700">
                      {m.nim}
                    </td>
                    <td className="px-3 py-2 sticky left-[100px] bg-white z-10 text-gray-900">
                      {m.nama_mahasiswa}
                    </td>
                    {komponen_nilai.map((k) => {
                      const cell = nilaiPivot.get(m.id_mahasiswa)?.get(k.id_komponen);
                      const isEditingAsli =
                        editingCell?.id_mahasiswa === m.id_mahasiswa &&
                        editingCell?.id_komponen === k.id_komponen &&
                        editingCell?.field === 'nilai_asli';
                      const isEditingRemedi =
                        editingCell?.id_mahasiswa === m.id_mahasiswa &&
                        editingCell?.id_komponen === k.id_komponen &&
                        editingCell?.field === 'nilai_remedi';

                      return (
                        <td key={k.id_komponen} className="px-2 py-2 text-center align-middle">
                          <div className="flex flex-col items-center gap-1">
                            {/* Nilai asli */}
                            {isEditingAsli ? (
                              <div className="flex items-center gap-1">
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  inputMode="decimal"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  disabled={saving}
                                  className="w-20 px-2 py-1 border-2 border-indigo-500 rounded text-center text-sm focus:outline-none"
                                />
                                <button
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  {saving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(m.id_mahasiswa, k.id_komponen, 'nilai_asli')}
                                className="w-20 px-2 py-1 rounded hover:bg-indigo-100 text-sm font-medium text-gray-900 transition"
                                title="Klik untuk edit nilai asli"
                              >
                                {cell?.nilai_asli !== null && cell?.nilai_asli !== undefined
                                  ? Number(cell.nilai_asli).toFixed(1)
                                  : '—'}
                              </button>
                            )}

                            {/* Nilai remedi (kecil di bawah) */}
                            {isEditingRemedi ? (
                              <div className="flex items-center gap-1">
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  inputMode="decimal"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  disabled={saving}
                                  className="w-20 px-2 py-1 border-2 border-orange-500 rounded text-center text-xs focus:outline-none"
                                />
                                <button
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  {saving ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(m.id_mahasiswa, k.id_komponen, 'nilai_remedi')}
                                className="w-20 px-2 py-0.5 rounded hover:bg-orange-100 text-[10px] text-orange-700 transition"
                                title="Klik untuk edit nilai remedi"
                              >
                                R:{' '}
                                {cell?.nilai_remedi !== null && cell?.nilai_remedi !== undefined
                                  ? Number(cell.nilai_remedi).toFixed(1)
                                  : '—'}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {subTab === 'cpmk' && <CapaianCpmkPanel idKelas={idKelas} />}

      {subTab === 'ik' && <CapaianIkPanel idKelas={idKelas} />}

      {subTab === 'cpl' && <CapaianCplPanel idKelas={idKelas} />}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Upload Nilai SIAKAD
              </h3>
              <button onClick={closeUploadModal} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!uploadResult && (
              <>
  <div className="text-sm text-gray-600">
    Upload file Excel ekspor dari SIAKAD UNS (.xls / .xlsx). Sistem akan memvalidasi
    token, distribusi nilai UK1–UK5 ke komponen MK, dan melaporkan masalah ke modul
    data bermasalah.
  </div>
  <a
    href="/templates/Template_Nilai_SIAKAD.xlsx"
    download
    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium"
  >
    <Download className="w-3.5 h-3.5" /> Download Contoh Format Excel
  </a>
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      Tahun Akademik
    </label>
    <select
      value={selectedTa}
      onChange={(e) => setSelectedTa(e.target.value === '' ? '' : Number(e.target.value))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">— pilih TA —</option>
      {taList.map((ta) => (
        <option key={ta.id_tahun_akademik} value={ta.id_tahun_akademik}>
          {ta.label || ta.kode}{ta.is_active ? '  •  Berjalan' : ''}
        </option>
      ))}
    </select>
    <p className="text-[11px] text-gray-500 mt-1">
      Default = TA berjalan. Pilih TA lain untuk backdate (mis. nilai semester yang lalu).
    </p>
  </div>
  <input
    type="file"
    accept=".xls,.xlsx"
    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
    className="block w-full text-sm border border-gray-300 rounded-lg p-2"
  />
                  {uploadError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={closeUploadModal}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleUploadSubmit}
                      disabled={!uploadFile || uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Mengupload...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Upload
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {uploadResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div className="text-sm">
                      <p className="font-medium text-green-900">
                        Upload {uploadResult.status} — {uploadResult.jumlah_berhasil} berhasil,{' '}
                        {uploadResult.jumlah_gagal} gagal
                      </p>
                      {uploadResult.masalah_dilaporkan > 0 && (
                        <p className="text-green-700 text-xs mt-1">
                          {uploadResult.masalah_dilaporkan} item dilaporkan ke data bermasalah.
                        </p>
                      )}
                    </div>
                  </div>

                  {uploadResult.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">Peringatan:</p>
                      <ul className="text-xs text-yellow-800 list-disc list-inside">
                        {uploadResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {uploadResult.details.some((d) => d.status !== 'sukses') && (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left">Baris</th>
                            <th className="px-2 py-1 text-left">NIM</th>
                            <th className="px-2 py-1 text-left">Status</th>
                            <th className="px-2 py-1 text-left">Catatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.details
                            .filter((d) => d.status !== 'sukses')
                            .map((d, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="px-2 py-1">{d.baris_excel}</td>
                                <td className="px-2 py-1 font-mono">{d.nim}</td>
                                <td className="px-2 py-1">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      d.status === 'gagal'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {d.status}
                                  </span>
                                </td>
                                <td className="px-2 py-1 text-gray-600">{d.catatan ?? '—'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={closeUploadModal}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
