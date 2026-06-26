'use client';

import { UserSession } from '../../../data/users';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

interface UploadDataMasterViewProps {
  sessionUser: UserSession;
}

type RowResult = { baris: number; kode: string; status: 'sukses' | 'gagal'; catatan?: string };
type SectionResult = { sheet: string; sukses: number; gagal: number; detail: RowResult[] };
type ImportResult = { total_sukses: number; total_gagal: number; sections: SectionResult[] };

type UploadType = {
  id: string;
  label: string;
  desc: string;
  wired: boolean;
  endpoint?: string;
  templateHref?: string;
  templateLabel?: string;
  dummyHref?: string;
  dummyLabel?: string;
  info?: string;
};

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  return raw ? { 'x-user-session': raw } : {};
}

const UPLOAD_TYPES: UploadType[] = [
  {
    id: 'master_obe',
    label: 'CPL, IK, MK & CPMK',
    desc: 'Import master OBE dari Template (5 sheet)',
    wired: true,
    endpoint: '/api/admin/import-master',
    templateHref: '/templates/Template_Import_SICPL_KOSONG.xlsx',
    templateLabel: 'Template_Import_SICPL_KOSONG.xlsx',
    dummyHref: '/templates/Data_Dummy_SICPL_K24.xlsx',
    dummyLabel: 'Data_Dummy_SICPL_K24.xlsx',
    info: 'Urutan otomatis: CPL → IK (+ bobot ke CPL) → Mata Kuliah → CPMK → Mapping CPMK-IK.',
  },
  {
    id: 'cpmk_only',
    label: 'CPMK Saja',
    desc: 'Import/update CPMK dari file Excel sederhana',
    wired: true,
    endpoint: '/api/admin/import-cpmk',
    templateHref: '/templates/Template_CPMK.xlsx',
    templateLabel: 'Template_CPMK.xlsx',
    info: 'Sheet bisa dinamai apa saja (asalkan ada data). Kolom: Kode CPMK | Kode MK | Deskripsi (Indonesia) | Deskripsi (English). Mata Kuliah harus sudah diimport dulu. Kode MK harus sama persis dengan yang ada di database.',
  },
  {
    id: 'mahasiswa',
    label: 'Data Mahasiswa',
    desc: 'Upload daftar mahasiswa + enrollment kelas',
    wired: true,
    endpoint: '/api/admin/import-mahasiswa',
    templateHref: '/templates/Template_Mahasiswa.xlsx',
    templateLabel: 'Template_Mahasiswa.xlsx',
    info: 'Sheet 1 "Mahasiswa" wajib. Sheet 2 "Enrollment Kelas" opsional — kelas harus sudah dibuat dulu lewat menu Kelola Kelas Tayang.',
  },
  {
    id: 'dosen',
    label: 'Data Dosen',
    desc: 'Upload daftar dosen pengajar',
    wired: true,
    endpoint: '/api/admin/import-dosen',
    templateHref: '/templates/Template_Dosen.xlsx',
    templateLabel: 'Template_Dosen.xlsx',
    info: 'UPSERT by NIP/NIDN/NIK. Dosen yang sudah diimport bisa ditugaskan ke kelas lewat menu Kelola Kelas Tayang.',
  },
];

export default function UploadDataMasterView({ sessionUser: _sessionUser }: UploadDataMasterViewProps) {
  const [selectedType, setSelectedType] = useState<string>('master_obe');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = UPLOAD_TYPES.find((t) => t.id === selectedType)!;

  const onPick = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || !current.endpoint) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(current.endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || 'Gagal memproses file import.');
      } else {
        setResult(json.data as ImportResult);
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Data Master</h1>
        <p className="text-gray-600 mt-1">Fasilitas unggah massal untuk memperbarui data akademik sistem.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-fit">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Pilih Jenis Data</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {UPLOAD_TYPES.map((type: UploadType) => (
              <button
                key={type.id}
                onClick={() => { setSelectedType(type.id); onPick(null); }}
                className={`w-full text-left p-4 transition-colors ${
                  selectedType === type.id
                    ? 'bg-indigo-50 border-l-4 border-indigo-600'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <FileText className={`w-5 h-5 mt-0.5 ${selectedType === type.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-medium ${selectedType === type.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                    {!type.wired && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        Segera
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="md:col-span-2 space-y-6">
          {!current.wired ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">Fitur import untuk &ldquo;{current.label}&rdquo; akan tersedia pada tahap berikutnya.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Template */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Gunakan Template</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Isi file template berikut, lalu upload kembali. Baris yang gagal akan dilaporkan dan dilewati.
                </p>

                {(current.templateHref || current.dummyHref) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {current.templateHref && (
                      <a href={current.templateHref} download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                        <Download className="w-4 h-4" /> {current.templateLabel ?? 'Download Template'}
                      </a>
                    )}
                    {current.dummyHref && (
                      <a href={current.dummyHref} download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                        <Download className="w-4 h-4" /> {current.dummyLabel ?? 'Download Data Dummy'}
                      </a>
                    )}
                  </div>
                )}

                {current.info && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    {current.info}
                  </div>
                )}
              </div>

              {/* Step 2: Upload */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Upload File</h3>
                <p className="text-sm text-gray-600 mb-6">Pilih file Excel (.xlsx atau .xls) yang sudah diisi.</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onPick(e.target.files?.[0] ?? null)}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-indigo-400 transition-colors cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Upload className="w-8 h-8 text-indigo-500" />
                  </div>
                  {file ? (
                    <p className="text-sm font-medium text-indigo-700 mb-1">{file.name}</p>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mb-1">Klik untuk memilih file</p>
                  )}
                  <p className="text-xs text-gray-500">atau drag and drop file ke area ini</p>
                  <p className="text-xs text-gray-400 mt-4">Maksimal ukuran file: 10MB</p>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
                    <XCircle className="w-5 h-5 flex-shrink-0" /> {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {uploading ? 'Memproses...' : 'Mulai Proses Import'}
                  </button>
                </div>
              </div>

              {/* Result */}
              {result && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Hasil Import</h3>
                    <span className="ml-auto text-sm text-gray-600">
                      <span className="font-semibold text-emerald-700">{result.total_sukses} sukses</span>
                      {' · '}
                      <span className={`font-semibold ${result.total_gagal > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                        {result.total_gagal} gagal
                      </span>
                    </span>
                  </div>
                  <div className="space-y-4">
                    {result.sections.map((sec: SectionResult) => (
                      <div key={sec.sheet} className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 text-sm">
                          <span className="font-medium text-gray-800">{sec.sheet}</span>
                          <span className="text-xs text-gray-600">{sec.sukses} sukses · {sec.gagal} gagal</span>
                        </div>
                        {sec.detail.filter((d: RowResult) => d.status === 'gagal').length > 0 && (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="px-4 py-1.5 font-medium">Baris</th>
                                <th className="px-4 py-1.5 font-medium">Kode</th>
                                <th className="px-4 py-1.5 font-medium">Masalah</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sec.detail.filter((d: RowResult) => d.status === 'gagal').map((d: RowResult, idx: number) => (
                                <tr key={idx} className="border-b border-gray-50 text-red-700">
                                  <td className="px-4 py-1.5">{d.baris}</td>
                                  <td className="px-4 py-1.5 font-mono">{d.kode}</td>
                                  <td className="px-4 py-1.5">{d.catatan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    Baris yang gagal tidak masuk database. Perbaiki di Excel lalu upload ulang.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}