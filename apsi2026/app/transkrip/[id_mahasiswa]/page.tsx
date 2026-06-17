'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Loader2, AlertCircle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface TranskripCpl { id_cpl: number; kode_cpl: string; singkatan: string; domain: string; deskripsi: string; nilai_cpl: number | null; status: 'tercapai' | 'belum_tercapai' | 'belum_dinilai'; }
interface TranskripIk { id_ik: number; kode_ik: string; deskripsi: string; id_cpl: number; bobot_persen: number | null; nilai_ik: number | null; }
interface TranskripData {
  mahasiswa: { id_mahasiswa: number; nim: string; nama: string; email_sso: string | null; angkatan: number | null; status_mahasiswa: string | null };
  kurikulum: { id_kurikulum: number; kode: string; nama: string; tahun_mulai: number; tahun_selesai: number | null };
  cpl: TranskripCpl[];
  ik: TranskripIk[];
  summary: { threshold: number; total_cpl: number; dinilai: number; tercapai: number; belum_tercapai: number };
}

const DOMAIN_COLOR: Record<string, string> = {
  'Pengetahuan': 'bg-blue-50 text-blue-800 border-blue-200',
  'Keterampilan Khusus': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Keterampilan Umum': 'bg-amber-50 text-amber-800 border-amber-200',
  'Sikap': 'bg-purple-50 text-purple-800 border-purple-200',
};

function StatusBadge({ status }: { status: TranskripCpl['status'] }) {
  if (status === 'tercapai') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3" /> Tercapai</span>;
  if (status === 'belum_tercapai') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> Belum Tercapai</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600"><MinusCircle className="w-3 h-3" /> Belum Dinilai</span>;
}

export default function TranskripPage() {
  const params = useParams() as { id_mahasiswa?: string };
  const router = useRouter();
  const [data, setData] = useState<TranskripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) { router.replace('/'); return; }
    (async () => {
      try {
        const res = await fetch(`/api/transkrip/${params?.id_mahasiswa}`, {
          headers: { 'Content-Type': 'application/json', 'x-user-session': raw },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) setError(json.message || 'Gagal memuat transkrip.');
        else setData(json.data as TranskripData);
      } catch { setError('Tidak dapat terhubung ke server.'); }
      finally { setLoading(false); }
    })();
  }, [params?.id_mahasiswa, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
        <div className="flex gap-2 items-start"><AlertCircle className="w-5 h-5 flex-shrink-0" /><div>{error || 'Transkrip tidak tersedia.'}</div></div>
      </div>
    </div>
  );

  const m = data.mahasiswa;
  const k = data.kurikulum;
  const printDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const ikByCpl = data.ik.reduce((acc: Record<number, TranskripIk[]>, ik: TranskripIk) => {
    (acc[ik.id_cpl] ||= []).push(ik);
    return acc;
  }, {} as Record<number, TranskripIk[]>);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm 14mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .avoid-break { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* Toolbar (hidden in print) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow">
          <Printer className="w-4 h-4" /> Cetak / Save as PDF
        </button>
      </div>

      {/* Paper */}
      <div className="max-w-4xl mx-auto my-6 bg-white shadow-lg print-page p-10 print:p-0">

        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-5">
          <h1 className="text-base font-bold uppercase tracking-wide">Program Studi Sarjana Teknik Industri</h1>
          <h2 className="text-sm font-semibold">Fakultas Teknik &mdash; Universitas Sebelas Maret</h2>
          <h3 className="text-lg font-extrabold mt-2 uppercase">Transkrip Capaian Pembelajaran Lulusan (CPL)</h3>
          <p className="text-[11px] text-gray-600 mt-1">Kurikulum {k.kode} &mdash; {k.nama}</p>
        </div>

        {/* Identitas */}
        <table className="w-full text-[12px] mb-6 avoid-break">
          <tbody>
            <tr><td className="py-0.5 pr-3 w-40 text-gray-600">Nama Lengkap</td><td className="py-0.5 font-semibold">: {m.nama}</td></tr>
            <tr><td className="py-0.5 pr-3 text-gray-600">NIM</td><td className="py-0.5 font-semibold">: {m.nim}</td></tr>
            <tr><td className="py-0.5 pr-3 text-gray-600">Angkatan</td><td className="py-0.5">: {m.angkatan ?? '—'}</td></tr>
            <tr><td className="py-0.5 pr-3 text-gray-600">Status</td><td className="py-0.5">: {m.status_mahasiswa ?? '—'}</td></tr>
            <tr><td className="py-0.5 pr-3 text-gray-600">Email SSO</td><td className="py-0.5">: {m.email_sso ?? '—'}</td></tr>
            <tr><td className="py-0.5 pr-3 text-gray-600">Tanggal Cetak</td><td className="py-0.5">: {printDate}</td></tr>
          </tbody>
        </table>

        {/* Ringkasan */}
        <div className="grid grid-cols-4 gap-3 mb-6 text-center avoid-break">
          <div className="border border-gray-300 rounded p-2"><div className="text-[10px] text-gray-500">Total CPL</div><div className="text-xl font-bold">{data.summary.total_cpl}</div></div>
          <div className="border border-gray-300 rounded p-2"><div className="text-[10px] text-gray-500">Dinilai</div><div className="text-xl font-bold">{data.summary.dinilai}</div></div>
          <div className="border border-green-300 bg-green-50 rounded p-2"><div className="text-[10px] text-green-700">Tercapai (≥ {data.summary.threshold})</div><div className="text-xl font-bold text-green-700">{data.summary.tercapai}</div></div>
          <div className="border border-red-300 bg-red-50 rounded p-2"><div className="text-[10px] text-red-700">Belum Tercapai</div><div className="text-xl font-bold text-red-700">{data.summary.belum_tercapai}</div></div>
        </div>

        {/* Tabel CPL utama */}
        <h4 className="text-sm font-bold mb-2 mt-4">Rekap Capaian CPL</h4>
        <table className="w-full text-[11px] border border-gray-400 mb-6 avoid-break">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-400 px-2 py-1.5 w-10">No</th>
              <th className="border border-gray-400 px-2 py-1.5 w-14">Kode</th>
              <th className="border border-gray-400 px-2 py-1.5 w-16">Singk.</th>
              <th className="border border-gray-400 px-2 py-1.5 w-32">Domain</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left">Deskripsi</th>
              <th className="border border-gray-400 px-2 py-1.5 w-16">Nilai</th>
              <th className="border border-gray-400 px-2 py-1.5 w-28">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.cpl.map((c: TranskripCpl, idx: number) => (
              <tr key={c.id_cpl} className="align-top">
                <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{c.kode_cpl}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{c.singkatan}</td>
                <td className={`border border-gray-300 px-2 py-1 text-center ${DOMAIN_COLOR[c.domain] || ''}`}>{c.domain}</td>
                <td className="border border-gray-300 px-2 py-1">{c.deskripsi}</td>
                <td className="border border-gray-300 px-2 py-1 text-center font-bold">{c.nilai_cpl !== null ? c.nilai_cpl.toFixed(2) : '—'}</td>
                <td className="border border-gray-300 px-2 py-1 text-center"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rincian IK */}
        <h4 className="text-sm font-bold mb-2 mt-6 page-break-before:auto">Rincian Capaian Indikator Kinerja (IK) per CPL</h4>
        <table className="w-full text-[10.5px] border border-gray-400 avoid-break">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-400 px-2 py-1.5 w-14">CPL</th>
              <th className="border border-gray-400 px-2 py-1.5 w-16">Kode IK</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left">Deskripsi IK</th>
              <th className="border border-gray-400 px-2 py-1.5 w-16">Bobot</th>
              <th className="border border-gray-400 px-2 py-1.5 w-16">Nilai IK</th>
            </tr>
          </thead>
          <tbody>
            {data.cpl.flatMap((c: TranskripCpl) =>
              (ikByCpl[c.id_cpl] || []).map((ik: TranskripIk, j: number) => (
                <tr key={`${c.id_cpl}-${ik.id_ik}`} className="align-top">
                  {j === 0 && (
                    <td className="border border-gray-300 px-2 py-1 text-center font-semibold bg-gray-50" rowSpan={ikByCpl[c.id_cpl]?.length || 1}>{c.kode_cpl}</td>
                  )}
                  <td className="border border-gray-300 px-2 py-1 text-center">{ik.kode_ik}</td>
                  <td className="border border-gray-300 px-2 py-1">{ik.deskripsi}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{ik.bobot_persen !== null ? `${ik.bobot_persen.toFixed(2)}%` : '—'}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center font-bold">{ik.nilai_ik !== null ? ik.nilai_ik.toFixed(2) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Catatan */}
        <div className="mt-6 text-[10px] text-gray-600 leading-relaxed avoid-break">
          <p><strong>Catatan:</strong> Nilai CPL dihitung melalui rumus OBE berjenjang: <em>UK → CPMK → IK → CPL</em>. CPL dikatakan tercapai apabila skor agregat ≥ {data.summary.threshold}.</p>
          <p>Dokumen ini dihasilkan otomatis oleh Sistem Informasi Capaian Pembelajaran Lulusan (SICPL) pada {printDate}.</p>
        </div>

        {/* Tanda tangan */}
        <div className="mt-12 grid grid-cols-2 gap-4 text-[11px] avoid-break">
          <div></div>
          <div className="text-center">
            <p>Surakarta, {printDate}</p>
            <p>Kepala Program Studi</p>
            <div className="h-16"></div>
            <p className="font-semibold underline">_____________________</p>
            <p>NIP. _____________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}