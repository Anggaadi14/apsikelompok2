'use client';
// app/verify/page.tsx
//
// Halaman yang dibuka user setelah klik link di email verifikasi.
// Flow:
//   1. Ambil ?token=... dari URL
//   2. Call GET /api/auth/verify?token=...
//   3. Cabang berdasarkan response:
//      - already_verified → tampilkan "sudah aktif, silakan login"
//      - role=dosen + verified=true → tampilkan sukses
//      - role=mahasiswa + needs_nim → tampilkan form isi NIM
//      - error → tampilkan pesan error

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap, CheckCircle2, AlertCircle, Loader2,
  IdCard,
} from 'lucide-react';

type VerifyState =
  | { kind: 'loading' }
  | { kind: 'needs_nim'; token: string; email: string; nama: string }
  | { kind: 'verified'; role: 'mahasiswa' | 'dosen'; email: string; nama?: string; message: string }
  | { kind: 'already_verified'; email: string; message: string }
  | { kind: 'error'; message: string };

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<VerifyState>({ kind: 'loading' });

  // NIM form state (only used for mahasiswa)
  const [nim, setNim] = useState('');
  const [nimError, setNimError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'error', message: 'Token verifikasi tidak ditemukan di URL.' });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          if (!cancelled) {
            setState({ kind: 'error', message: `Endpoint tidak ditemukan (HTTP ${res.status}).` });
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        if (!data.success) {
          setState({ kind: 'error', message: data.message || 'Verifikasi gagal.' });
          return;
        }

        if (data.data.already_verified) {
          setState({
            kind: 'already_verified',
            email: data.data.email,
            message: data.data.message || 'Akun sudah aktif.',
          });
          return;
        }

        if (data.data.needs_nim) {
          setState({
            kind: 'needs_nim',
            token: data.data.token,
            email: data.data.email,
            nama: data.data.nama,
          });
          return;
        }

        if (data.data.verified) {
          setState({
            kind: 'verified',
            role: data.data.role,
            email: data.data.email,
            nama: data.data.nama,
            message: data.data.message || 'Verifikasi berhasil.',
          });
          return;
        }

        setState({ kind: 'error', message: 'Respons tidak dikenali.' });
      } catch (err: any) {
        if (cancelled) return;
        setState({ kind: 'error', message: `Gagal menghubungi server: ${err?.message || 'unknown'}` });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const submitNim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind !== 'needs_nim') return;
    setNimError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/complete-mahasiswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.token, nim: nim.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setState({
          kind: 'verified',
          role: 'mahasiswa',
          email: data.data.email,
          nama: data.data.nama,
          message: data.data.message || 'Verifikasi berhasil.',
        });
      } else {
        setNimError(data.message || 'Validasi NIM gagal.');
      }
    } catch (err: any) {
      setNimError(`Tidak dapat menghubungi server: ${err?.message || 'unknown'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full filter blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 relative z-10">
        {state.kind === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
            <p className="text-sm text-indigo-200 mt-4 font-semibold">Memverifikasi akun...</p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-red-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-4">Verifikasi Gagal</h1>
            <p className="text-sm text-rose-200 mt-3 leading-relaxed">{state.message}</p>
            <Link
              href="/signup"
              className="inline-block mt-6 py-2.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold"
            >
              Daftar Ulang
            </Link>
          </div>
        )}

        {state.kind === 'already_verified' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-4">Akun Sudah Aktif</h1>
            <p className="text-sm text-amber-200 mt-3 leading-relaxed">{state.message}</p>
            <p className="text-xs text-indigo-300 mt-2">
              Email: <b className="text-white">{state.email}</b>
            </p>
            <Link
              href="/"
              className="inline-block mt-6 py-2.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold"
            >
              Masuk ke Portal
            </Link>
          </div>
        )}

        {state.kind === 'verified' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-4">Verifikasi Berhasil</h1>
            <p className="text-sm text-emerald-200 mt-3 leading-relaxed">{state.message}</p>
            {state.nama && (
              <p className="text-xs text-indigo-300 mt-3">
                Halo, <b className="text-white">{state.nama}</b> — akun {state.role} kamu sudah aktif.
              </p>
            )}
            <Link
              href="/"
              className="inline-block mt-6 py-2.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold"
            >
              Masuk ke Portal
            </Link>
          </div>
        )}

        {state.kind === 'needs_nim' && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight mt-3">Validasi Mahasiswa</h1>
              <p className="text-[11px] text-indigo-300 mt-1 uppercase tracking-widest">
                Satu Langkah Lagi
              </p>
              <p className="text-xs text-slate-300 mt-3">
                Halo <b className="text-white">{state.nama}</b>, masukkan NIM kamu untuk verifikasi.
              </p>
            </div>

            {nimError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-200 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{nimError}</span>
              </div>
            )}

            <form onSubmit={submitNim} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
                  NIM (Nomor Induk Mahasiswa)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <IdCard className="w-4 h-4 text-indigo-400" />
                  </span>
                  <input
                    type="text"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    placeholder="contoh: I0320045"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                    required
                    disabled={submitting}
                  />
                </div>
                <p className="text-[10px] text-indigo-300/70 mt-1.5">
                  NIM harus sama persis dengan yang didaftarkan admin prodi.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !nim.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memvalidasi...</span>
                  </>
                ) : (
                  <span>Validasi & Aktifkan Akun</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-indigo-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>}>
      <VerifyInner />
    </Suspense>
  );
}