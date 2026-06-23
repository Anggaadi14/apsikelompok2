'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckSquare, Download } from 'lucide-react';

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

type IkSummaryRow = { id_ik: number; kode_ik: string; deskripsi: string; rata_rata: number; jumlah_mahasiswa_dengan_nilai: number };

type LoadData = {
  kelas: KelasInfo;
  total_mahasiswa: number;
  ik_summary: IkSummaryRow[];
};

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  return raw ? { 'x-user-session': raw } : {};
}

export default function CapaianIkPanel({ idKelas }: Props) {
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
        if (!res.ok || !json.success) { setError(json.message || 'Gagal memuat capaian IK.'); setData(null); return; }
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
      doc.text('Laporan Capaian IK Kelas', marginX, 23);
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
        head: [['IK', 'Deskripsi', 'Rata-rata Kelas', 'Mhs dgn Nilai']],
        body: data.ik_summary.map((ik) => [ik.kode_ik, ik.deskripsi, ik.rata_rata, `${ik.jumlah_mahasiswa_dengan_nilai}/${data.total_mahasiswa}`]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`Capaian_IK_${kelas.kode_mk}_${kelas.kode_kelas ?? ''}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat capaian IK...
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
            <CheckSquare className="w-5 h-5 text-blue-600" /> Capaian IK Kelas
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            IK yang dituju oleh CPMK mata kuliah ini, dihitung dari seluruh nilai mahasiswa di kelas ini yang sudah ter-input ke sistem (lintas mata kuliah).
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={exporting || data.ik_summary.length === 0}
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

      {data.ik_summary.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">CPMK MK ini belum dipetakan ke IK manapun.</div>
      ) : (
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left w-24">IK</th>
                <th className="px-3 py-2 text-left">Deskripsi</th>
                <th className="px-3 py-2 text-center w-32">Rata-rata Kelas</th>
                <th className="px-3 py-2 text-center w-28">Mhs dgn Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.ik_summary.map((ik: IkSummaryRow) => (
                <tr key={ik.id_ik} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-blue-700">{ik.kode_ik}</td>
                  <td className="px-3 py-2 text-gray-700">{ik.deskripsi}</td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-800">{ik.rata_rata}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{ik.jumlah_mahasiswa_dengan_nilai}/{data.total_mahasiswa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
