'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ListChecks, Download } from 'lucide-react';

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

type CpmkSummaryRow = { id_cpmk: number; kode_cpmk: string; deskripsi_id: string; rata_rata: number; jumlah_mahasiswa_dengan_nilai: number };

type LoadData = {
  kelas: KelasInfo;
  total_mahasiswa: number;
  cpmk_summary: CpmkSummaryRow[];
};

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  return raw ? { 'x-user-session': raw } : {};
}

export default function CapaianCpmkPanel({ idKelas }: Props) {
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
        if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat capaian CPMK.'); setData(null); return; }
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
      const marginX = 14;
      const { kelas } = data;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SICPL - Portal Dosen', marginX, 16);
      doc.setFontSize(11);
      doc.text('Laporan Capaian CPMK Kelas', marginX, 23);
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
        head: [['CPMK', 'Deskripsi', 'Rata-rata Kelas', 'Mhs dgn Nilai']],
        body: data.cpmk_summary.map((c) => [c.kode_cpmk, c.deskripsi_id, c.rata_rata, `${c.jumlah_mahasiswa_dengan_nilai}/${data.total_mahasiswa}`]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129] },
      });

      doc.save(`Capaian_CPMK_${kelas.kode_mk}_${kelas.kode_kelas ?? ''}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat capaian CPMK...
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
            <ListChecks className="w-5 h-5 text-emerald-600" /> Capaian CPMK Kelas
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Rata-rata nilai CPMK khusus untuk kelas ini (tidak tercampur dengan kelas lain dari MK yang sama).
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={exporting || data.cpmk_summary.length === 0}
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

      {data.cpmk_summary.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">MK ini belum memiliki CPMK.</div>
      ) : (
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left w-24">CPMK</th>
                <th className="px-3 py-2 text-left">Deskripsi</th>
                <th className="px-3 py-2 text-center w-32">Rata-rata Kelas</th>
                <th className="px-3 py-2 text-center w-28">Mhs dgn Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.cpmk_summary.map((c: CpmkSummaryRow) => (
                <tr key={c.id_cpmk} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-emerald-700">{c.kode_cpmk}</td>
                  <td className="px-3 py-2 text-gray-700">{c.deskripsi_id}</td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-800">{c.rata_rata}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{c.jumlah_mahasiswa_dengan_nilai}/{data.total_mahasiswa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
