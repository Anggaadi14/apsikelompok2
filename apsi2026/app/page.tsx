'use client';
// app/page.tsx
//
// PERUBAHAN dari versi sebelumnya (Batch 4.5.A — Auth Rewire):
//   DIUBAH: state `username` → `identifier` (semantik lebih tepat: bisa email/NIM/NIP)
//   DIUBAH: label "Username (NIM / NIP)" → "Email / NIM / NIP"
//   DIUBAH: placeholder dan helper text
//   DIUBAH: payload fetch — kirim { identifier, password } (bukan { username, password })
//   DITAMBAH: contoh akun demo di footer kecil (helpful untuk presentasi)
//
// Yang TIDAK berubah:
//   - Seluruh tampilan UI (form, warna, layout, animasi)
//   - Format session yang disimpan di sessionStorage (key: 'currentUser')
//   - Redirect ke /dashboard/{role} setelah login berhasil
//   - State isLoading untuk mencegah double-submit
//
// Cara login sekarang (5 role):
//   - Mahasiswa  → NIM (contoh: I0320045) atau email kampus
//   - Dosen      → NIP/NIDN/NIK atau email kampus
//   - Kaprodi    → email seed (contoh: kaprodi1@sicpl.test) — password: demo123
//   - Jamu       → email seed (contoh: jamu1@sicpl.test)    — password: demo123
//   - Admin      → email seed (contoh: admin1@sicpl.test)   — password: demo123
//
// Backend (app/api/auth/login/route.ts) menerima identifier dengan fallback chain:
//   body.identifier ?? body.email ?? body.username
// Lalu mencari di kolom user.email OR mahasiswa.nim OR staff.nip_nidn_nik.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, GraduationCap, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // State loading — mencegah submit ganda saat request sedang berjalan
  const [isLoading, setIsLoading] = useState(false);

  // Clear existing session on mount
  useEffect(() => {
    sessionStorage.removeItem('currentUser');
  }, []);

  // ─────────────────────────────────────────────
  // handleLogin — async, memanggil API POST /api/auth/login
  //
  // Payload baru: { identifier, password }
  //   identifier dapat berupa email, NIM, atau NIP/NIDN/NIK.
  //   Backend yang menentukan sumber pencarian (user.email vs mhs.nim vs staff.nip_nidn_nik).
  // ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // PENTING: trim() tapi TIDAK toLowerCase()
          // NIM mengandung huruf kapital (I0320045) — jangan diubah kasusnya.
          // Email akan di-lowercase di sisi backend kalau perlu.
          identifier: identifier.trim(),
          password: password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Simpan session ke sessionStorage — sama persis dengan format sebelumnya
        // data.data sudah dalam format SessionUser yang benar (dari route.ts)
        sessionStorage.setItem('currentUser', JSON.stringify(data.data));

        // Redirect ke dashboard sesuai role
        router.push(`/dashboard/${data.data.role}`);
      } else {
        // Tampilkan pesan error dari server
        setError(data.message || 'Email/NIM/NIP atau password yang Anda masukkan tidak valid.');
      }
    } catch {
      // Error jaringan / server tidak bisa diakses
      setError('Tidak dapat terhubung ke server. Pastikan server sedang berjalan (npm run dev).');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Visual background lights */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full filter blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Main card wrapper */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 relative z-10 transition-all duration-300">

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-lg border border-indigo-400/20">
            <GraduationCap className="w-9 h-9 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-4">SICPL Portal</h1>
          <p className="text-xs text-indigo-300 font-medium mt-1 uppercase tracking-widest">Sistem Informasi Capaian Kelulusan</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-200 text-xs font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
              Email / NIM / NIP
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-indigo-400" />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan email, NIM, atau NIP/NIDN/NIK..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-indigo-400" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98] cursor-pointer mt-6 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk Portal</span>
            )}
          </button>
        </form>

{/* Link ke Signup */}
<div className="mt-5 text-center">
  <Link
    href="/signup"
    className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold transition-colors"
  >
    Belum punya akun? <span className="text-white underline">Daftar di sini</span>
  </Link>
</div>

        {/* Helper text — akun demo */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <p className="text-[10px] text-indigo-300/70 font-semibold uppercase tracking-wider mb-1.5">
            Akun Demo (password: <code className="text-indigo-200">demo123</code>)
          </p>
          <ul className="text-[10px] text-slate-400 space-y-0.5 leading-relaxed">
            <li>• Mahasiswa: <code className="text-indigo-300">I0320045</code> (NIM)</li>
            <li>• Kaprodi: <code className="text-indigo-300">kaprodi1@sicpl.test</code></li>
            <li>• Jamu: <code className="text-indigo-300">jamu1@sicpl.test</code></li>
            <li>• Admin: <code className="text-indigo-300">admin1@sicpl.test</code></li>
          </ul>
        </div>

      </div>

      {/* Footer credits */}
      <p className="text-[9px] text-indigo-400/60 font-bold uppercase tracking-widest mt-6 relative z-10 text-center">
        Sistem Informasi Capaian Kelulusan &bull; Teknik Industri UNS &bull; 2026
      </p>
    </div>
  );
}