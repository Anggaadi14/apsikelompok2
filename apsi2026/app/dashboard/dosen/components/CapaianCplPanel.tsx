'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Target, Download } from 'lucide-react';

interface Props {
  idKelas: number;
}

type KelasInfo = {
  kode_mk: string;
  nama_mk: string;
  kode_kelas: string | null;
  tahun_akademik: string;
  semester: string;
  kode_kurikulum: string;
};

type CplSummaryRow = {
  id_cpl: number;
  kode_cpl: string;
  deskripsi_id: string;
  target_minimal: number;
  rata_rata: number;
  jumlah_tercapai: number;
  jumlah_belum_tercapai: number;
  jumlah_belum_ditempuh: number;
};

type PerCpl = { id_cpl: number; kode_cpl: string; nilai: number | null; status: 'Tercapai' | 'Belum Tercapai' | 'Belum Ditempuh' };
type MahasiswaRow = { id_mahasiswa: number; nim: string; nama_mahasiswa: string; per_cpl: PerCpl[] };

type LoadData = {
  kelas: KelasInfo;
  total_mahasiswa: number;
  cpl_summary: CplSummaryRow[];
  mahasiswa: MahasiswaRow[];
};

type JsPdfWithAutoTable = { lastAutoTable?: { finalY?: number } };

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  return raw ? { 'x-user-session': raw } : {};
}

function statusBadgeClass(status: PerCpl['status']): string {
  switch (status) {
    case 'Tercapai': return 'bg-emerald-50 text-emerald-700';
    case 'Belum Tercapai': return 'bg-rose-50 text-rose-700';
    default: return 'bg-gray-100 text-gray-500';
  }
}

export default function CapaianCplPanel({ idKelas }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoadData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/dosen/kelas/${idKelas}/capaian-cpl`, { headers: authHeaders(), cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat capaian CPL.'); setData(null); return; }
        setData(json.data as LoadData);
      } catch { setError('Tidak dapat terhubung ke server.'); }
      finally { setLoading(false); }
    })();
  }, [idKelas]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 14;
      const { kelas } = data;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SICPL - Portal Dosen', marginX, 16);
      doc.setFontSize(11);
      doc.text('Laporan Capaian CPL Kelas', marginX, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        marginX,
        29,
      );

      doc.setFontSize(9);
      const infoLine = `${kelas.kode_mk} — ${kelas.nama_mk}  ·  Kelas ${kelas.kode_kelas ?? '-'}  ·  ${kelas.tahun_akademik} ${kelas.semester}  ·  Kurikulum ${kelas.kode_kurikulum}  ·  ${data.total_mahasiswa} mahasiswa`;
      doc.text(doc.splitTextToSize(infoLine, 180), marginX, 37);

      autoTable(doc, {
        startY: 45,
        margin: { left: marginX, right: marginX },
        head: [['CPL', 'Target', 'Rata-rata Kelas', 'Tercapai', 'Belum Tercapai', 'Belum Ditempuh']],
        body: data.cpl_summary.map((s) => [
          s.kode_cpl,
          s.target_minimal,
          s.rata_rata,
          s.jumlah_tercapai,
          s.jumlah_belum_tercapai,
          s.jumlah_belum_ditempuh,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      let cursorY = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 45) + 10;
      if (cursorY > pageHeight - 40) { doc.addPage(); cursorY = 16; }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Capaian CPL per Mahasiswa', marginX, cursorY);
      doc.setFont('helvetica', 'normal');
      cursorY += 5;

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['NIM', 'Nama', ...data.cpl_summary.map((s) => s.kode_cpl)]],
        body: data.mahasiswa.map((m) => [
          m.nim,
          m.nama_mahasiswa,
          ...m.per_cpl.map((p) => (p.nilai !== null ? p.nilai : '-')),
        ]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [100, 116, 139] },
      });

      doc.save(`Capaian_CPL_${kelas.kode_mk}_${kelas.kode_kelas ?? ''}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat capaian CPL...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2 text-sm text-red-700">
        <AlertCircle className="w-5 h-5" /> {error || 'Data tidak tersedia.'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" /> Capaian CPL Kelas
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Capaian CPL mahasiswa di kelas ini, dihitung dari seluruh nilai yang sudah ter-input ke sistem (lintas mata kuliah).
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={exporting || data.cpl_summary.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Membuat PDF...' : 'Download PDF'}
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {data.cpl_summary.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">Kurikulum kelas ini belum memiliki CPL.</div>
      ) : (
        <>
          {/* Ringkasan per CPL */}
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left w-24">CPL</th>
                  <th className="px-3 py-2 text-left">Deskripsi</th>
                  <th className="px-3 py-2 text-center w-20">Target</th>
                  <th className="px-3 py-2 text-center w-32">Rata-rata Kelas</th>
                  <th className="px-3 py-2 text-center w-20">Tercapai</th>
                  <th className="px-3 py-2 text-center w-24">Belum Tercapai</th>
                  <th className="px-3 py-2 text-center w-24">Belum Ditempuh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.cpl_summary.map((s: CplSummaryRow) => (
                  <tr key={s.id_cpl} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-indigo-700">{s.kode_cpl}</td>
                    <td className="px-3 py-2 text-gray-700">{s.deskripsi_id}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{s.target_minimal}</td>
                    <td className={`px-3 py-2 text-center font-semibold ${s.rata_rata >= s.target_minimal ? 'text-emerald-700' : 'text-rose-700'}`}>{s.rata_rata}</td>
                    <td className="px-3 py-2 text-center text-emerald-700">{s.jumlah_tercapai}</td>
                    <td className="px-3 py-2 text-center text-rose-700">{s.jumlah_belum_tercapai}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{s.jumlah_belum_ditempuh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail per mahasiswa */}
          <div className="px-6 pb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Capaian per Mahasiswa</h3>
            {data.mahasiswa.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 border border-gray-100 rounded-lg">Belum ada mahasiswa terdaftar di kelas ini.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left sticky left-0 bg-gray-50 z-10 w-28">NIM</th>
                      <th className="px-3 py-2 text-left sticky left-[112px] bg-gray-50 z-10 min-w-[180px]">Nama</th>
                      {data.cpl_summary.map((s: CplSummaryRow) => (
                        <th key={s.id_cpl} className="px-3 py-2 text-center min-w-[90px] font-mono">{s.kode_cpl}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.mahasiswa.map((m: MahasiswaRow) => (
                      <tr key={m.id_mahasiswa} className="hover:bg-gray-50">
                        <td className="px-3 py-2 sticky left-0 bg-white z-10 font-mono text-xs text-gray-700">{m.nim}</td>
                        <td className="px-3 py-2 sticky left-[112px] bg-white z-10 text-gray-900">{m.nama_mahasiswa}</td>
                        {m.per_cpl.map((p: PerCpl) => (
                          <td key={p.id_cpl} className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(p.status)}`} title={p.status}>
                              {p.nilai !== null ? p.nilai : '—'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
