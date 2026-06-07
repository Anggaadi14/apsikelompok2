'use client';
// app/signup/page.tsx
//
// Form pendaftaran akun. Hanya untuk mahasiswa dan dosen (sesuai notul Zoom).
// Setelah submit, user diarahkan ke halaman "cek email" + di dev mode
// link verifikasi langsung di-show untuk kemudahan testing.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, User, Mail, Lock, AlertCircle, CheckCircle2,
  Loader2, ArrowLeft, ExternalLink,
} from 'lucide-react';

type Role = 'mahasiswa' | 'dosen';

export default function SignupPage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('mahasiswa');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State sukses
  const [success, setSuccess] = useState<{
    email: string;
    role: Role;
    sent: boolean;
    verifyUrl?: string;
  } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setError(`Endpoint tidak ditemukan (HTTP ${res.status}). Cek server.`);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setSuccess({
          email: data.data.email,
          role: data.data.role,
          sent: data.data.sent,
          verifyUrl: data.data.verifyUrl,
        });
      } else {
        setError(data.message || 'Gagal mendaftar.');
      }
    } catch (err: any) {
      setError(`Tidak dapat menghubungi server: ${err?.message || 'unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Tampilan setelah berhasil signup ─────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex flex-col justify-center items-center p-4 font-sans">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8 relative z-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-4">
              Pendaftaran Berhasil
            </h1>
            <p className="text-xs text-indigo-300 mt-1">
              Email verifikasi telah dikirim ke <b className="text-white">{success.email}</b>
            </p>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-indigo-100 leading-relaxed">
              {success.sent
                ? '✉️ Cek inbox kamu (atau Mailtrap inbox kalau lagi demo) untuk menyelesaikan verifikasi.'
                : '⚠️ Email belum bisa dikirim (SMTP belum di-set). Pakai link manual di bawah.'}
            </p>
          </div>

          {success.verifyUrl && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-amber-200 mb-2">
                Link Verifikasi (Dev Mode)
              </p>
              <a
                href={success.verifyUrl}
                className="text-xs text-amber-100 break-all underline flex items-start gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{success.verifyUrl}</span>
              </a>
              {success.role === 'mahasiswa' && (
                <p className="text-[11px] text-amber-200/80 mt-2">
                  Klik link → akan diminta isi NIM untuk validasi.
                </p>
              )}
            </div>
          )}

          <Link
            href="/"
            className="block w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg text-center"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  // ─── Form signup ──────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full filter blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-3 hover:text-indigo-200"
        >
          <ArrowLeft className="w-3 h-3" />
          Kembali ke Login
        </Link>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight mt-3">Daftar Akun SICPL</h1>
          <p className="text-[11px] text-indigo-300 mt-1 uppercase tracking-widest">
            Mahasiswa & Dosen Saja
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-200 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3.5">
          {/* Role selector */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
              Daftar Sebagai
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['mahasiswa', 'dosen'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={isLoading}
                  className={`py-2.5 px-3 rounded-xl text-sm font-bold border transition-all ${
                    role === r
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                      : 'bg-slate-900/40 border-white/10 text-slate-400 hover:border-indigo-500/30'
                  }`}
                >
                  {r === 'mahasiswa' ? 'Mahasiswa' : 'Dosen'}
                </button>
              ))}
            </div>
          </div>

          {/* Nama */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-indigo-400" />
              </span>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama sesuai KTP / data prodi"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-indigo-400" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === 'mahasiswa'
                    ? 'email@student.uns.ac.id'
                    : 'email kampus dosen'
                }
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {role === 'dosen' && (
              <p className="text-[10px] text-indigo-300/70 mt-1.5 leading-relaxed">
                ⚠️ Email harus sama dengan email kampus yang sudah didaftarkan admin prodi.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-indigo-400" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                required
                minLength={6}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
              Konfirmasi Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-indigo-400" />
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftarkan...</span>
              </>
            ) : (
              <span>Daftar & Kirim Verifikasi</span>
            )}
          </button>
        </form>

        <p className="text-[10px] text-slate-400 text-center mt-4 leading-relaxed">
          Kaprodi, Tim Jamu, dan Admin tidak dapat mendaftar mandiri.
          <br />Hubungi admin sistem untuk pembuatan akun.
        </p>
      </div>
    </div>
  );
}