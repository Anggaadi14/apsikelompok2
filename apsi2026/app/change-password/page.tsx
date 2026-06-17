'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';

interface SessionLite {
  id_user?: number;
  role: string;
  name?: string;
  email?: string;
  identifier?: string;
  force_password_change?: 0 | 1;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionLite | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) { router.replace('/'); return; }
    try { setSession(JSON.parse(raw)); } catch { router.replace('/'); }
  }, [router]);

  const isForce = session?.force_password_change === 1;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (newPassword.length < 8) { setError('Password baru minimal 8 karakter.'); return; }
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak cocok.'); return; }
    if (!isForce && !oldPassword) { setError('Password lama wajib diisi.'); return; }

    setSubmitting(true);
    try {
      const raw = sessionStorage.getItem('currentUser') || '';
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-session': raw },
        body: JSON.stringify({ oldPassword: oldPassword || undefined, newPassword, confirmPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || 'Gagal mengubah password.');
      } else {
        // Update sessionStorage: clear force flag
        if (session) {
          const updated = { ...session, force_password_change: 0 as 0 | 1 };
          sessionStorage.setItem('currentUser', JSON.stringify(updated));
        }
        setSuccess('Password berhasil diubah. Mengarahkan ke dashboard...');
        setTimeout(() => router.replace(`/dashboard/${session?.role || ''}`), 1200);
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><KeyRound className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ubah Password</h1>
              <p className="text-xs text-gray-500">{session.email || session.identifier}</p>
            </div>
          </div>

          {isForce && (
            <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 flex gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>Akun ini menggunakan password sementara dari admin. Silakan ubah password Anda sebelum melanjutkan.</div>
            </div>
          )}

          {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}</div>}
          {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg p-3 flex gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> {success}</div>}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Password Lama {isForce && <span className="text-gray-400">(opsional — dari email/admin)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type={showOld ? 'text' : 'password'} value={oldPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                  placeholder={isForce ? 'Password sementara (kalau ingat)' : 'Password Anda saat ini'}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                <button type="button" onClick={() => setShowOld((v: boolean) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password Baru <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type={showNew ? 'text' : 'password'} value={newPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 karakter" required
                  className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                <button type="button" onClick={() => setShowNew((v: boolean) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Konfirmasi Password Baru <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type={showNew ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru" required
                  className="w-full pl-9 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Tidak cocok dengan password baru.</p>
              )}
            </div>

            <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-md text-sm disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>

            {!isForce && (
              <button type="button" onClick={() => router.replace(`/dashboard/${session.role}`)} className="w-full text-xs text-gray-500 hover:text-gray-700">
                Batal &mdash; kembali ke dashboard
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">SICPL · Prodi Teknik Industri UNS</p>
      </div>
    </div>
  );
}