'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, GraduationCap, AlertCircle } from 'lucide-react';
import { usersSeeder } from './data/users';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Clear existing session on mount
  useEffect(() => {
    sessionStorage.removeItem('currentUser');
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = usersSeeder.find(
      (u) => u.username === username.trim().toLowerCase() && u.password === password
    );

    if (user) {
      const sessionData = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        identifier: user.identifier,
        initials: user.initials,
        prodi: user.prodi,
      };
      sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
      
      // Redirect
      router.push(`/dashboard/${user.role}`);
    } else {
      setError('Username atau Password yang Anda masukkan tidak valid.');
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

        {/* Error alert component */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-200 text-xs font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form elements */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-indigo-400" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                required
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
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98] cursor-pointer mt-6"
          >
            Masuk Portal
          </button>
        </form>



      </div>

      {/* Footer credits */}
      <p className="text-[9px] text-indigo-400/60 font-bold uppercase tracking-widest mt-6 relative z-10 text-center">
        Sistem Informasi Capaian Kelulusan &bull; Teknik Industri UNS &bull; 2026
      </p>
    </div>
  );
}
