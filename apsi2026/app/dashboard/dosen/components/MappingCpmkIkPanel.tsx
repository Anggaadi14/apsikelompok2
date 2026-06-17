'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Loader2, Save, AlertCircle, CheckCircle2, Target, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  idKelas: number;
}

type Cpmk = { id_cpmk: number; kode_cpmk: string; deskripsi_id: string; deskripsi_en: string | null; urutan: number };
type Cpl = { id_cpl: number; kode_cpl: string; singkatan: string | null; domain: string; deskripsi_id: string; urutan: number };
type Ik = { id_ik: number; id_cpl: number; kode_ik: string; deskripsi: string; deskripsi_en: string | null; urutan: number };

type LoadResp = {
  success: boolean;
  message?: string;
  data?: {
    kelas: { kode_mk: string; nama_mk: string; singkatan: string | null };
    is_evaluator: boolean;
    peran_dosen_login: 'koordinator' | 'anggota';
    cpmk_list: Cpmk[];
    cpl_list: Cpl[];
    ik_list: Ik[];
    existing_mappings: Array<{ id_cpmk: number; id_ik: number }>;
  };
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  return { ...(raw ? { 'x-user-session': raw } : {}), ...extra };
}

export default function MappingCpmkIkPanel({ idKelas }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<LoadResp['data'] | null>(null);

  // mapping state: Map<id_cpmk, Set<id_ik>>
  const [mapState, setMapState] = useState<Record<number, Set<number>>>({});
  // expand/collapse per CPL
  const [openCpl, setOpenCpl] = useState<Record<number, boolean>>({});

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/dosen/mapping-cpmk-ik/${idKelas}`, { headers: authHeaders() });
      const j: LoadResp = await r.json().catch(() => ({ success: false }));
      if (!r.ok || !j.success || !j.data) { setErr(j.message || 'Gagal memuat data.'); setData(null); return; }
      setData(j.data);
      // build map state
      const m: Record<number, Set<number>> = {};
      j.data.cpmk_list.forEach((c) => { m[c.id_cpmk] = new Set<number>(); });
      j.data.existing_mappings.forEach((p) => {
        if (!m[p.id_cpmk]) m[p.id_cpmk] = new Set<number>();
        m[p.id_cpmk].add(p.id_ik);
      });
      setMapState(m);
      // default expand all CPL
      const oc: Record<number, boolean> = {};
      j.data.cpl_list.forEach((c) => { oc[c.id_cpl] = true; });
      setOpenCpl(oc);
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [idKelas]);

  const ikByCpl = useMemo(() => {
    const grp: Record<number, Ik[]> = {};
    (data?.ik_list ?? []).forEach((ik: Ik) => {
      (grp[ik.id_cpl] ||= []).push(ik);
    });
    return grp;
  }, [data]);

  const flashOk = (m: string) => { setOk(m); setTimeout(() => setOk(null), 2500); };

  const toggle = (idCpmk: number, idIk: number) => {
    setMapState((prev: Record<number, Set<number>>) => {
      const next = { ...prev };
      const s = new Set(next[idCpmk] ?? []);
      if (s.has(idIk)) s.delete(idIk); else s.add(idIk);
      next[idCpmk] = s;
      return next;
    });
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true); setErr(null);
    try {
      const items = data.cpmk_list.map((c: Cpmk) => ({
        id_cpmk: c.id_cpmk,
        id_ik_list: Array.from(mapState[c.id_cpmk] ?? new Set<number>()),
      }));
      const r = await fetch(`/api/dosen/mapping-cpmk-ik/${idKelas}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ items }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) setErr(j.message || 'Gagal menyimpan.');
      else flashOk('Mapping tersimpan.');
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat mapping CPMK-IK...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2 text-sm text-red-700">
        <AlertCircle className="w-5 h-5" /> {err || 'Data tidak tersedia.'}
      </div>
    );
  }

  const totalCpmk = data.cpmk_list.length;
  const totalMapped = data.cpmk_list.filter((c: Cpmk) => (mapState[c.id_cpmk]?.size ?? 0) > 0).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" /> Mapping CPMK → IK
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Pilih satu atau lebih Indikator Kinerja yang didukung oleh tiap CPMK.
            Engine memakai <span className="font-medium">rata-rata</span> nilai CPMK → IK (tanpa bobot).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            {totalMapped}/{totalCpmk} CPMK sudah dipetakan
          </span>
          <button
            onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {!data.is_evaluator && (
        <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
          <AlertCircle className="w-4 h-4" />
          MK ini ditandai <span className="font-medium">non-evaluator</span>; mapping boleh disimpan tapi tidak akan dipakai engine sampai admin mengaktifkan evaluator MK.
        </div>
      )}
      {ok && (
        <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4" /> {ok}
        </div>
      )}
      {err && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {err}
        </div>
      )}

      {totalCpmk === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">MK ini belum memiliki CPMK. Mintalah admin untuk menambahkannya terlebih dahulu.</div>
      ) : (
        <div className="p-6 space-y-6">
          {data.cpmk_list.map((c: Cpmk) => {
            const sel = mapState[c.id_cpmk] ?? new Set<number>();
            return (
              <div key={c.id_cpmk} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">{c.kode_cpmk}</span>
                    <span className="text-sm text-gray-900 font-medium">{c.deskripsi_id}</span>
                    <span className="ml-auto text-xs text-gray-500">{sel.size} IK dipilih</span>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  {data.cpl_list.map((cpl: Cpl) => {
                    const ikInCpl = ikByCpl[cpl.id_cpl] ?? [];
                    if (ikInCpl.length === 0) return null;
                    const open = !!openCpl[cpl.id_cpl];
                    const selectedHere = ikInCpl.filter((ik: Ik) => sel.has(ik.id_ik)).length;
                    return (
                      <div key={cpl.id_cpl} className="border border-gray-100 rounded-md">
                        <button
                          type="button"
                          onClick={() => setOpenCpl((prev: Record<number, boolean>) => ({ ...prev, [cpl.id_cpl]: !prev[cpl.id_cpl] }))}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left text-xs hover:bg-gray-50"
                        >
                          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          <span className="font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{cpl.kode_cpl}</span>
                          {cpl.singkatan && <span className="font-medium text-gray-800">{cpl.singkatan}</span>}
                          <span className="text-gray-500 truncate">— {cpl.deskripsi_id}</span>
                          <span className="ml-auto text-[11px] text-indigo-600 font-medium">{selectedHere}/{ikInCpl.length}</span>
                        </button>
                        {open && (
                          <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {ikInCpl.map((ik: Ik) => {
                              const checked = sel.has(ik.id_ik);
                              return (
                                <label key={ik.id_ik}
                                  className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer text-xs transition-colors ${checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                >
                                  <input
                                    type="checkbox" checked={checked}
                                    onChange={(_: ChangeEvent<HTMLInputElement>) => toggle(c.id_cpmk, ik.id_ik)}
                                    className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>
                                    <span className="font-mono font-semibold text-indigo-700">{ik.kode_ik}</span>
                                    <span className="text-gray-700"> — {ik.deskripsi}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}