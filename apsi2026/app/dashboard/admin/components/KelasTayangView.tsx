'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  MonitorPlay, Plus, Pencil, Trash2, Users, X, Loader2, Search,
  AlertCircle, CheckCircle2, UserPlus, RefreshCw,
} from 'lucide-react';

type TA = {
  id_tahun_akademik: number;
  kode: string | null;
  tahun_mulai: number;
  tahun_selesai: number;
  semester: 'Ganjil' | 'Genap' | 'Pendek';
  label: string | null;
  is_active: 0 | 1;
};
type MK = { id_mata_kuliah: number; kode_mk: string | null; nama_mk: string | null; sks: number | null };
type Kur = { id_kurikulum: number; kode: string | null; nama: string | null; is_active: 0 | 1 };
type Dosen = {
  id_staff: number;
  nama_lengkap: string | null;
  email_sso: string | null;
  nip_nidn_nik: string | null;
  peran: 'dosen' | 'kaprodi' | 'admin' | 'jamu';
};

type KelasRow = {
  id_kelas: number;
  kode_kelas: string;
  kuota: number | null;
  ta_legacy: string;
  sem_legacy: 'Ganjil' | 'Genap';
  id_tahun_akademik: number | null;
  ta_kode: string | null;
  ta_label: string | null;
  ta_is_active: 0 | 1 | null;
  ta_semester: 'Ganjil' | 'Genap' | 'Pendek' | null;
  id_mata_kuliah: number;
  kode_mk: string | null;
  nama_mk: string | null;
  sks: number | null;
  id_kurikulum: number;
  kode_kurikulum: string | null;
  nama_kurikulum: string | null;
  jml_dosen: number;
  jml_mahasiswa: number;
};
type PengampuRow = {
  id_staff: number;
  peran_di_kelas: 'koordinator' | 'anggota';
  nama_lengkap: string | null;
  email_sso: string | null;
  nip_nidn_nik: string | null;
  peran: string;
};

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const raw = typeof window === 'undefined' ? '' : sessionStorage.getItem('currentUser') ?? '';
  return { 'x-user-session': raw, ...extra };
}

// Helper: tampilkan field yang mungkin null/kosong dengan fallback
const safe = (v: unknown, fallback = ''): string => {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s === '' ? fallback : s;
};

export default function KelasTayangView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [items, setItems] = useState<KelasRow[]>([]);
  const [opt, setOpt] = useState<{ dosen: Dosen[]; mata_kuliah: MK[]; kurikulum: Kur[]; tahun_akademik: TA[] }>(
    { dosen: [], mata_kuliah: [], kurikulum: [], tahun_akademik: [] });
  const [search, setSearch] = useState('');
  const [filterTa, setFilterTa] = useState<number | ''>('');

  // form add/edit
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KelasRow | null>(null);
  const [fMk, setFMk] = useState<number | ''>('');
  const [fKur, setFKur] = useState<number | ''>('');
  const [fTa, setFTa] = useState<number | ''>('');
  const [fKode, setFKode] = useState('');
  const [fKuota, setFKuota] = useState('');
  const [saving, setSaving] = useState(false);

  // pengampu modal
  const [showPengampu, setShowPengampu] = useState<KelasRow | null>(null);
  const [pengampuList, setPengampuList] = useState<PengampuRow[]>([]);
  const [pengampuLoading, setPengampuLoading] = useState(false);
  const [pAddStaff, setPAddStaff] = useState<number | ''>('');

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // cache-busting + no-store agar selalu data terbaru
      const r = await fetch(`/api/admin/kelas?_=${Date.now()}`, {
        headers: authHeaders(),
        cache: 'no-store',
      });
      const j = await r.json();
      // Debug log: cek di DevTools Console kalau ada masalah
      if (typeof window !== 'undefined') {
        console.log('[KelasTayang] /api/admin/kelas response:', {
          ok: r.ok,
          status: r.status,
          success: j?.success,
          counts: {
            items: j?.data?.items?.length ?? 0,
            mata_kuliah: j?.data?.options?.mata_kuliah?.length ?? 0,
            kurikulum: j?.data?.options?.kurikulum?.length ?? 0,
            tahun_akademik: j?.data?.options?.tahun_akademik?.length ?? 0,
            dosen: j?.data?.options?.dosen?.length ?? 0,
          },
          message: j?.message,
        });
      }
      if (!r.ok || !j.success) throw new Error(j.message ?? 'Gagal memuat data');
      setItems(j.data.items ?? []);
      setOpt({
        dosen: j.data.options?.dosen ?? [],
        mata_kuliah: j.data.options?.mata_kuliah ?? [],
        kurikulum: j.data.options?.kurikulum ?? [],
        tahun_akademik: j.data.options?.tahun_akademik ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const taActive = opt.tahun_akademik.find((t: TA) => t.is_active === 1) ?? null;
  const kurActive = opt.kurikulum.find((k: Kur) => k.is_active === 1) ?? null;
  const taOptionsForForm = useMemo(
    () => opt.tahun_akademik.filter((t: TA) => t.semester !== 'Pendek'),
    [opt.tahun_akademik],
  );

  const openCreate = async () => {
    setEditing(null);
    // Re-fetch master sebelum buka modal — biar dropdown selalu fresh
    await fetchAll(true);
    setFMk('');
    // Auto-pilih kurikulum kalau cuma 1 aktif (atau cuma 1 total)
    const autoKur = kurActive?.id_kurikulum ?? (opt.kurikulum.length === 1 ? opt.kurikulum[0].id_kurikulum : '');
    setFKur(autoKur);
    setFTa(taActive?.id_tahun_akademik ?? '');
    setFKode('');
    setFKuota('');
    setShowForm(true);
  };
  const openEdit = (k: KelasRow) => {
    setEditing(k);
    setFMk(k.id_mata_kuliah);
    setFKur(k.id_kurikulum);
    setFTa(k.id_tahun_akademik ?? '');
    setFKode(k.kode_kelas);
    setFKuota(k.kuota?.toString() ?? '');
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const submitForm = async () => {
    if (saving) return;
    // validasi FE sebelum kirim
    if (!editing) {
      if (fMk === '') return setFlash({ type: 'err', text: 'Mata Kuliah wajib dipilih.' });
      if (fKur === '') return setFlash({ type: 'err', text: 'Kurikulum wajib dipilih.' });
      if (fTa === '') return setFlash({ type: 'err', text: 'Tahun Akademik wajib dipilih.' });
    }
    if (!fKode.trim()) return setFlash({ type: 'err', text: 'Kode Kelas wajib diisi (mis. A).' });

    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          kode_kelas: fKode.trim().toUpperCase(),
          kuota: fKuota === '' ? null : Number(fKuota),
        };
        if (fTa !== '' && fTa !== editing.id_tahun_akademik) body.id_tahun_akademik = fTa;
        const r = await fetch(`/api/admin/kelas/${editing.id_kelas}`, {
          method: 'PATCH',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(body),
        });
        const j = await r.json();
        if (!r.ok || !j.success) throw new Error(j.message ?? 'Gagal menyimpan');
        setFlash({ type: 'ok', text: 'Perubahan kelas tersimpan.' });
      } else {
        const r = await fetch('/api/admin/kelas', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            id_mata_kuliah: fMk,
            id_kurikulum: fKur,
            id_tahun_akademik: fTa,
            kode_kelas: fKode.trim().toUpperCase(),
            kuota: fKuota === '' ? null : Number(fKuota),
          }),
        });
        const j = await r.json();
        if (!r.ok || !j.success) throw new Error(j.message ?? 'Gagal membuat kelas');
        setFlash({ type: 'ok', text: 'Kelas baru berhasil dibuat.' });
      }
      closeForm();
      await fetchAll();
    } catch (e) {
      setFlash({ type: 'err', text: e instanceof Error ? e.message : 'Gagal' });
    } finally {
      setSaving(false);
    }
  };

  const deleteKelas = async (k: KelasRow) => {
    const labelMk = safe(k.kode_mk, `MK#${k.id_mata_kuliah}`);
    if (!confirm(`Hapus kelas ${labelMk} • ${k.kode_kelas} • ${k.ta_legacy} ${k.sem_legacy}? Ini juga menghapus mapping dosen & enrollment mahasiswa.`)) return;
    try {
      const r = await fetch(`/api/admin/kelas/${k.id_kelas}`, { method: 'DELETE', headers: authHeaders() });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message ?? 'Gagal menghapus');
      setFlash({ type: 'ok', text: 'Kelas dihapus.' });
      await fetchAll();
    } catch (e) {
      setFlash({ type: 'err', text: e instanceof Error ? e.message : 'Gagal menghapus' });
    }
  };

  // pengampu
  const openPengampu = async (k: KelasRow) => {
    setShowPengampu(k);
    setPengampuList([]);
    setPengampuLoading(true);
    setPAddStaff('');
    try {
      const r = await fetch(`/api/admin/kelas/${k.id_kelas}/dosen?_=${Date.now()}`, {
        headers: authHeaders(),
        cache: 'no-store',
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message ?? 'Gagal memuat pengampu');
      setPengampuList(j.data.items ?? []);
    } catch (e) {
      setFlash({ type: 'err', text: e instanceof Error ? e.message : 'Gagal' });
    } finally {
      setPengampuLoading(false);
    }
  };
  const addPengampu = async () => {
    if (!showPengampu || pAddStaff === '') return;
    try {
      const r = await fetch(`/api/admin/kelas/${showPengampu.id_kelas}/dosen`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id_staff: pAddStaff, peran_di_kelas: 'anggota' }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message ?? 'Gagal');
      await openPengampu(showPengampu);
      await fetchAll();
      setFlash({ type: 'ok', text: 'Pengampu disimpan.' });
    } catch (e) {
      setFlash({ type: 'err', text: e instanceof Error ? e.message : 'Gagal' });
    }
  };
  const removePengampu = async (p: PengampuRow) => {
    if (!showPengampu) return;
    if (!confirm(`Hapus ${safe(p.nama_lengkap, 'pengampu ini')} dari kelas ini?`)) return;
    try {
      const r = await fetch(`/api/admin/kelas/${showPengampu.id_kelas}/dosen`, {
        method: 'DELETE',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id_staff: p.id_staff }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message ?? 'Gagal');
      await openPengampu(showPengampu);
      await fetchAll();
    } catch (e) {
      setFlash({ type: 'err', text: e instanceof Error ? e.message : 'Gagal' });
    }
  };

  const availableDosen = useMemo(() => {
    const taken = new Set(pengampuList.map((p: PengampuRow) => p.id_staff));
    return opt.dosen.filter((d: Dosen) => !taken.has(d.id_staff));
  }, [opt.dosen, pengampuList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((k: KelasRow) => {
      if (filterTa !== '' && k.id_tahun_akademik !== filterTa) return false;
      if (!q) return true;
      return [k.kode_mk, k.nama_mk, k.kode_kelas, k.ta_legacy, k.sem_legacy, k.kode_kurikulum]
        .filter(Boolean).map((s) => String(s).toLowerCase()).some((s) => s.includes(q));
    });
  }, [items, search, filterTa]);

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-indigo-600" /> Kelola Kelas Tayang
          </h1>
          <p className="text-sm text-gray-600 mt-1">Buat kelas per Tahun Akademik dan atur dosen pengampunya.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAll()}
            title="Refresh data"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Kelas
          </button>
        </div>
      </div>

      {flash && (
        <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${flash.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {flash.type === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          <span>{flash.text}</span>
        </div>
      )}

      {/* Info ringkas data master */}
      {!loading && !error && (
        <div className="text-xs text-gray-500 px-1">
          Tersedia: {opt.mata_kuliah.length} MK • {opt.kurikulum.length} Kurikulum • {taOptionsForForm.length} TA (Ganjil/Genap) • {opt.dosen.length} dosen
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setSearch(e.target.value)}
            placeholder="Cari kode/MK/kode kelas..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterTa}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilterTa(e.target.value === '' ? '' : Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Semua TA</option>
          {opt.tahun_akademik.map((t: TA) => (
            <option key={t.id_tahun_akademik} value={t.id_tahun_akademik}>
              {safe(t.label, safe(t.kode, `TA#${t.id_tahun_akademik}`))}{t.is_active ? '  •  Berjalan' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat...
          </div>
        ) : error ? (
          <div className="p-6 text-red-700 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Belum ada kelas tayang.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Mata Kuliah</th>
                  <th className="px-3 py-2 text-left">Kurikulum</th>
                  <th className="px-3 py-2 text-left">Tahun Akademik</th>
                  <th className="px-3 py-2 text-center">Kode</th>
                  <th className="px-3 py-2 text-center">Kuota</th>
                  <th className="px-3 py-2 text-center">Dosen</th>
                  <th className="px-3 py-2 text-center">Mhs</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((k: KelasRow) => (
                  <tr key={k.id_kelas} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{safe(k.kode_mk, `MK#${k.id_mata_kuliah}`)}</div>
                      <div className="text-xs text-gray-500">
                        {safe(k.nama_mk, '(nama kosong)')} • {k.sks ?? '-'} SKS
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{safe(k.kode_kurikulum, `KUR#${k.id_kurikulum}`)}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {safe(k.ta_label, safe(k.ta_kode, `${k.ta_legacy} ${k.sem_legacy}`))}
                      {k.ta_is_active ? <span className="ml-1 text-[10px] text-emerald-600 font-medium">• Berjalan</span> : null}
                    </td>
                    <td className="px-3 py-2 text-center font-medium">{k.kode_kelas}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{k.kuota ?? '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => openPengampu(k)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      >
                        <Users className="w-3.5 h-3.5" /> {k.jml_dosen}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700">{k.jml_mahasiswa}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button title="Edit" onClick={() => openEdit(k)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button title="Hapus" onClick={() => deleteKelas(k)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editing ? 'Edit Kelas Tayang' : 'Tambah Kelas Tayang'}</h3>
              <button onClick={closeForm} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">

              {/* Counter info */}
              {!editing && (
                <div className="text-[11px] text-gray-500 -mt-1 mb-1">
                  {opt.mata_kuliah.length} MK • {opt.kurikulum.length} Kurikulum • {taOptionsForForm.length} TA
                  {(opt.mata_kuliah.length === 0 || opt.kurikulum.length === 0 || taOptionsForForm.length === 0) && (
                    <span className="ml-1 text-red-600 font-medium">— ada master yang kosong, periksa di bawah</span>
                  )}
                </div>
              )}

              <Field label="Mata Kuliah">
                <select
                  disabled={!!editing}
                  value={fMk}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFMk(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-50"
                >
                  <option value="">— pilih MK —</option>
                  {opt.mata_kuliah.map((m: MK) => (
                    <option key={m.id_mata_kuliah} value={m.id_mata_kuliah}>
                      {safe(m.kode_mk, `MK#${m.id_mata_kuliah}`)} — {safe(m.nama_mk, '(nama kosong)')}
                    </option>
                  ))}
                </select>
                {opt.mata_kuliah.length === 0 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Belum ada Mata Kuliah. Upload via menu <strong>Upload Data Master</strong> dulu.
                  </p>
                )}
              </Field>

              <Field label="Kurikulum">
                <select
                  disabled={!!editing}
                  value={fKur}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFKur(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-50"
                >
                  <option value="">— pilih Kurikulum —</option>
                  {opt.kurikulum.map((k: Kur) => (
                    <option key={k.id_kurikulum} value={k.id_kurikulum}>
                      {safe(k.kode, `KUR#${k.id_kurikulum}`)} — {safe(k.nama, '(nama kosong)')}{k.is_active ? ' • Aktif' : ''}
                    </option>
                  ))}
                </select>
                {opt.kurikulum.length === 0 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Belum ada Kurikulum. Upload via menu <strong>Upload Data Master</strong> / jalankan seed SQL.
                  </p>
                )}
              </Field>

              <Field label="Tahun Akademik">
                <select
                  value={fTa}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFTa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">— pilih TA —</option>
                  {taOptionsForForm.map((t: TA) => (
                    <option key={t.id_tahun_akademik} value={t.id_tahun_akademik}>
                      {safe(t.label, safe(t.kode, `TA#${t.id_tahun_akademik}`))}{t.is_active ? '  •  Berjalan' : ''}
                    </option>
                  ))}
                </select>
                {taOptionsForForm.length === 0 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Belum ada Tahun Akademik (Ganjil/Genap). Buat dulu di menu <strong>Tahun Akademik</strong>.
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Kode Kelas">
                  <input
                    value={fKode}
                    onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFKode(e.target.value)}
                    maxLength={5}
                    placeholder="A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
                  />
                </Field>
                <Field label="Kuota (opsional)">
                  <input
                    value={fKuota}
                    onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFKuota(e.target.value)}
                    type="number"
                    min={0}
                    placeholder="40"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </Field>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={closeForm} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
              <button
                onClick={submitForm}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Simpan' : 'Buat Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pengampu modal */}
      {showPengampu && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" /> Pengampu Kelas
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {safe(showPengampu.kode_mk, `MK#${showPengampu.id_mata_kuliah}`)} • {showPengampu.kode_kelas} •{' '}
                  {safe(showPengampu.ta_label, safe(showPengampu.ta_kode, `${showPengampu.ta_legacy} ${showPengampu.sem_legacy}`))}
                </p>
              </div>
              <button onClick={() => setShowPengampu(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              {/* Add form */}
              <div className="flex flex-col md:flex-row gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <select
                  value={pAddStaff}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setPAddStaff(e.target.value === '' ? '' : Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">— pilih dosen —</option>
                  {availableDosen.map((d: Dosen) => (
                    <option key={d.id_staff} value={d.id_staff}>
                      {safe(d.nama_lengkap, `STAFF#${d.id_staff}`)} ({d.peran})
                    </option>
                  ))}
                </select>
                <button
                  onClick={addPengampu}
                  disabled={pAddStaff === ''}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" /> Tambah
                </button>
              </div>
              {opt.dosen.length === 0 && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Belum ada dosen di tabel staff. Tambah via menu <strong>Manajemen User</strong>.
                </p>
              )}

              {/* List */}
              {pengampuLoading ? (
                <div className="p-6 text-center text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline" /> Memuat...</div>
              ) : pengampuList.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Belum ada pengampu.</div>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {pengampuList.map((p: PengampuRow) => (
                    <li key={p.id_staff} className="flex items-center justify-between p-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {safe(p.nama_lengkap, `STAFF#${p.id_staff}`)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {safe(p.email_sso, '-')} • NIP {safe(p.nip_nidn_nik, '-')}
                        </div>
                      </div>
                      <button
                        title="Hapus dari kelas"
                        onClick={() => removePengampu(p)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}