'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Mail, Shield, BadgeCheck, Calendar, KeyRound, Loader2, AlertCircle, IdCard, Tag } from 'lucide-react';

interface MeData {
  id_user: number;
  email: string;
  email_sso: string | null;
  role: string;
  status: string;
  force_password_change: 0 | 1;
  name: string;
  identifier: string;
  verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  mahasiswa: { id_mahasiswa: number; nim: string; angkatan: number | null; status_mahasiswa: string | null } | null;
  staff: { id_staff: number; nip_nidn_nik: string; peran: string; status_akun: string } | null;
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  } catch { return s; }
}

const ROLE_LABEL: Record<string, string> = {
  mahasiswa: 'Mahasiswa', dosen: 'Dosen', kaprodi: 'Kaprodi', jamu: 'Jaminan Mutu', admin: 'Admin',
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) { router.replace('/'); return; }
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: { 'Content-Type': 'application/json', 'x-user-session': raw } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) setError(json.message || 'Gagal memuat profil.');
        else setMe(json.data as MeData);
      } catch { setError('Tidak dapat terhubung ke server.'); }
      finally { setLoading(false); }
    })();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error || !me) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
        <div className="flex gap-2 items-start"><AlertCircle className="w-5 h-5 flex-shrink-0" /><div>{error || 'Profil tidak tersedia.'}</div></div>
        <Link href={`/dashboard/${(() => { try { return JSON.parse(sessionStorage.getItem('currentUser') || '{}').role || ''; } catch { return ''; } })()}`} className="inline-flex items-center gap-1 mt-3 text-xs text-red-700 underline"><ArrowLeft className="w-3 h-3" /> Kembali ke dashboard</Link>
      </div>
    </div>
  );

  const roleLabel = ROLE_LABEL[me.role] || me.role;
  const initials = String(me.name || '').split(/\s+/).filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href={`/dashboard/${me.role}`} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-4"><ArrowLeft className="w-4 h-4" /> Kembali ke dashboard</Link>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white relative">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold border-2 border-white/40">{initials || <User className="w-8 h-8" />}</div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">{me.name || 'Tanpa Nama'}</h1>
                <p className="text-indigo-100 text-sm mt-1 truncate">{me.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-xs font-semibold"><Shield className="w-3 h-3" /> {roleLabel}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${me.status === 'aktif' ? 'bg-green-400/30 text-green-50' : 'bg-amber-400/30 text-amber-50'}`}><BadgeCheck className="w-3 h-3" /> {me.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informasi Akun</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Item icon={<Mail className="w-4 h-4" />} label="Email Login" value={me.email} />
                {me.email_sso && me.email_sso !== me.email && <Item icon={<Mail className="w-4 h-4" />} label="Email SSO Kampus" value={me.email_sso} />}
                <Item icon={<IdCard className="w-4 h-4" />} label={me.role === 'mahasiswa' ? 'NIM' : 'NIP/NIDN/NIK'} value={me.identifier || '—'} />
                <Item icon={<Tag className="w-4 h-4" />} label="Role" value={roleLabel} />
              </dl>
            </section>

            {me.mahasiswa && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Data Mahasiswa</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Item label="NIM" value={me.mahasiswa.nim} />
                  <Item label="Angkatan" value={me.mahasiswa.angkatan?.toString() || '—'} />
                  <Item label="Status Mahasiswa" value={me.mahasiswa.status_mahasiswa || '—'} />
                </dl>
              </section>
            )}

            {me.staff && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Data Staff</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Item label="NIP/NIDN/NIK" value={me.staff.nip_nidn_nik} />
                  <Item label="Peran Staff" value={me.staff.peran} />
                  <Item label="Status Akun Staff" value={me.staff.status_akun} />
                </dl>
              </section>
            )}

            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Aktivitas</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Item icon={<Calendar className="w-4 h-4" />} label="Akun Dibuat" value={fmtDate(me.created_at)} />
                <Item icon={<Calendar className="w-4 h-4" />} label="Diverifikasi" value={fmtDate(me.verified_at)} />
                <Item icon={<Calendar className="w-4 h-4" />} label="Terakhir Diperbarui" value={fmtDate(me.updated_at)} />
              </dl>
            </section>

            <section className="pt-2 border-t border-gray-100">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Keamanan</h2>
              <Link href="/change-password" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
                <KeyRound className="w-4 h-4" /> Ubah Password
              </Link>
              <p className="text-xs text-gray-500 mt-2">Direkomendasikan menggunakan password yang berbeda dari layanan lain dan minimal 8 karakter.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">{icon}{label}</dt>
      <dd className="text-sm text-gray-900 font-medium break-all">{value}</dd>
    </div>
  );
}