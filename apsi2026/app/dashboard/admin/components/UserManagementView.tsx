'use client';

import { UserSession } from '../../../data/users';
import { Search, Plus, Edit2, KeyRound, UserX, Shield, Loader2, X, Copy, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';

interface UserManagementViewProps {
  sessionUser: UserSession;
}

type Role = 'mahasiswa' | 'dosen' | 'kaprodi' | 'jamu' | 'admin';
type Status = 'pending_verification' | 'aktif' | 'nonaktif';

interface UserRow {
  id_user: number;
  email: string;
  role: Role;
  status: Status;
  force_password_change: 0 | 1;
  id_mahasiswa: number | null;
  id_staff: number | null;
  nama_input: string | null;
  nama_resolved: string;
  identifier: string | null;
  created_at: string;
  updated_at: string;
}

interface CreatePayload {
  role: Role;
  email: string;
  nama: string;
  linkage_mode: 'create_new' | 'existing';
  // create_new (mahasiswa)
  nim?: string;
  angkatan?: number;
  // create_new (staff)
  nip_nidn_nik?: string;
  // existing
  id_mahasiswa?: number;
  id_staff?: number;
}

function authHeaders(): Record<string, string> {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['x-user-session'] = raw;
  return headers;
}

const ROLE_LABEL: Record<Role, string> = {
  mahasiswa: 'Mahasiswa', dosen: 'Dosen', kaprodi: 'Kaprodi', jamu: 'Jamu', admin: 'Admin',
};
const ROLE_COLOR: Record<Role, string> = {
  mahasiswa: 'bg-blue-50 text-blue-700 border-blue-200',
  dosen:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  kaprodi:   'bg-purple-50 text-purple-700 border-purple-200',
  jamu:      'bg-amber-50 text-amber-700 border-amber-200',
  admin:     'bg-rose-50 text-rose-700 border-rose-200',
};
const STATUS_LABEL: Record<Status, string> = {
  pending_verification: 'Belum verifikasi', aktif: 'Aktif', nonaktif: 'Nonaktif',
};
const STATUS_COLOR: Record<Status, string> = {
  pending_verification: 'bg-amber-50 text-amber-700 border-amber-200',
  aktif:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  nonaktif: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function UserManagementView({ sessionUser }: UserManagementViewProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [pwDialog, setPwDialog] = useState<{ email: string; password: string; title: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || 'Gagal memuat daftar user.');
      } else {
        setUsers(json.data as UserRow[]);
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u: UserRow) => {
      const matchQ = !q ||
        u.nama_resolved.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.identifier ?? '').toLowerCase().includes(q);
      const matchR = filterRole === 'all' || u.role === filterRole;
      const matchS = filterStatus === 'all' || u.status === filterStatus;
      return matchQ && matchR && matchS;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const handleCreated = (payload: { email: string; generated_password: string }) => {
    setShowCreate(false);
    setPwDialog({
      title: 'User berhasil dibuat',
      email: payload.email,
      password: payload.generated_password,
    });
    fetchUsers();
  };

  const handleResetPassword = async (u: UserRow) => {
    if (!confirm(`Reset password untuk ${u.nama_resolved} (${u.email})?\n\nPassword lama akan TIDAK BERLAKU.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id_user}/reset-password`, {
        method: 'POST', headers: authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        alert(json.message || 'Gagal reset password.');
        return;
      }
      setPwDialog({
        title: 'Password berhasil di-reset',
        email: json.data.email,
        password: json.data.generated_password,
      });
      fetchUsers();
    } catch {
      alert('Tidak dapat terhubung ke server.');
    }
  };

  const handleSoftDelete = async (u: UserRow) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id_user}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        alert(json.message || 'Gagal menonaktifkan user.');
        return;
      }
      setConfirmDelete(null);
      fetchUsers();
    } catch {
      alert('Tidak dapat terhubung ke server.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl font-sans">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen User</h1>
          <p className="text-gray-600 mt-1">Kelola akun pengguna sistem &mdash; tambah, edit, nonaktifkan, dan reset password.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Tambah User
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, email, NIM/NIP&hellip;"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterRole(e.target.value as Role | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Semua role</option>
          <option value="mahasiswa">Mahasiswa</option>
          <option value="dosen">Dosen</option>
          <option value="kaprodi">Kaprodi</option>
          <option value="jamu">Jamu</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as Status | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
          <option value="pending_verification">Belum verifikasi</option>
        </select>
        <div className="text-xs text-gray-500 ml-auto">
          {filteredUsers.length} dari {users.length} user
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat user&hellip;
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            Tidak ada user yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">NIM/NIP</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u: UserRow) => {
                  const isSelf = u.id_user === sessionUser.id_user;
                  return (
                    <tr key={u.id_user} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{u.nama_resolved}</span>
                          {isSelf && <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">Anda</span>}
                          {u.force_password_change === 1 && (
                            <span title="User wajib ganti password saat login berikutnya" className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                              Ganti pwd
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.identifier ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLOR[u.role]}`}>
                          {ROLE_LABEL[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[u.status]}`}>
                          {STATUS_LABEL[u.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Edit user"
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            title="Reset password"
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={isSelf || u.status === 'nonaktif'}
                            title={isSelf ? 'Tidak bisa menonaktifkan akun sendiri' : u.status === 'nonaktif' ? 'Sudah nonaktif' : 'Nonaktifkan user'}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsers(); }}
        />
      )}
      {pwDialog && (
        <PasswordDialog
          title={pwDialog.title}
          email={pwDialog.email}
          password={pwDialog.password}
          onClose={() => setPwDialog(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Nonaktifkan user?"
          message={`User ${confirmDelete.nama_resolved} (${confirmDelete.email}) akan diset ke status nonaktif. Mereka tidak bisa login lagi, tapi data tetap tersimpan untuk audit.`}
          confirmLabel="Nonaktifkan"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleSoftDelete(confirmDelete)}
        />
      )}
    </div>
  );
}
/* ================== Sub-components ================== */

function CreateUserModal(props: {
  onClose: () => void;
  onCreated: (data: { email: string; generated_password: string }) => void;
}) {
  const [role, setRole] = useState<Role>('dosen');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [nim, setNim] = useState('');
  const [angkatan, setAngkatan] = useState<string>('');
  const [nipNidn, setNipNidn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const submit = async () => {
    setErrMsg(null);
    if (!nama.trim() || !email.trim()) { setErrMsg('Nama dan email wajib diisi.'); return; }
    if (role === 'mahasiswa') {
      if (!nim.trim() || !angkatan.trim()) { setErrMsg('NIM dan angkatan wajib diisi.'); return; }
    } else {
      if (!nipNidn.trim()) { setErrMsg('NIP/NIDN/NIK wajib diisi.'); return; }
    }
    const payload: CreatePayload = {
      role, email: email.trim(), nama: nama.trim(),
      linkage_mode: 'create_new',
      ...(role === 'mahasiswa'
        ? { nim: nim.trim(), angkatan: Number(angkatan) }
        : { nip_nidn_nik: nipNidn.trim() }),
    };
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setErrMsg(json.message || 'Gagal membuat user.');
      } else {
        props.onCreated(json.data);
      }
    } catch {
      setErrMsg('Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Tambah User Baru" onClose={props.onClose}>
      <div className="space-y-4">
        <Field label="Role">
          <select
            value={role}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as Role)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="mahasiswa">Mahasiswa</option>
            <option value="dosen">Dosen</option>
            <option value="kaprodi">Kaprodi</option>
            <option value="jamu">Jamu (Tim Penjamin Mutu)</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Nama Lengkap">
          <input value={nama} onChange={(e: ChangeEvent<HTMLInputElement>) => setNama(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="mis. Dr. Andi Wijaya, S.T., M.T." />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={role === 'mahasiswa' ? 'mis. F0221001@student.uns.ac.id' : 'nip@staff.uns.ac.id'} />
        </Field>
        {role === 'mahasiswa' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="NIM">
              <input value={nim} onChange={(e: ChangeEvent<HTMLInputElement>) => setNim(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="I0322001" />
            </Field>
            <Field label="Angkatan">
              <input type="number" value={angkatan} onChange={(e: ChangeEvent<HTMLInputElement>) => setAngkatan(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="2024" />
            </Field>
          </div>
        ) : (
          <Field label="NIP / NIDN / NIK">
            <input value={nipNidn} onChange={(e: ChangeEvent<HTMLInputElement>) => setNipNidn(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="198203152008122001" />
          </Field>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            Sistem akan generate password random + flag &ldquo;wajib ganti saat login pertama&rdquo;.
            Salin password dari dialog yang muncul setelah ini &mdash; password tidak bisa dilihat lagi.
          </div>
        </div>

        {errMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {errMsg}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={props.onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
        <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Membuat&hellip;' : 'Buat User'}
        </button>
      </div>
    </ModalShell>
  );
}

function EditUserModal(props: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState(props.user.nama_resolved);
  const [email, setEmail] = useState(props.user.email);
  const [role, setRole] = useState<Role>(props.user.role);
  const [status, setStatus] = useState<Status>(props.user.status);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const submit = async () => {
    setErrMsg(null); setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${props.user.id_user}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ nama, email, role, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setErrMsg(json.message || 'Gagal menyimpan.'); }
      else { props.onSaved(); }
    } catch {
      setErrMsg('Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Edit User" onClose={props.onClose}>
      <div className="space-y-4">
        <Field label="Nama">
          <input value={nama} onChange={(e: ChangeEvent<HTMLInputElement>) => setNama(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select value={role} onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as Role)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="mahasiswa">Mahasiswa</option>
              <option value="dosen">Dosen</option>
              <option value="kaprodi">Kaprodi</option>
              <option value="jamu">Jamu</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as Status)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
              <option value="pending_verification">Belum verifikasi</option>
            </select>
          </Field>
        </div>
        {errMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {errMsg}
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={props.onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
        <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Menyimpan&hellip;' : 'Simpan'}
        </button>
      </div>
    </ModalShell>
  );
}

function PasswordDialog(props: { title: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyAll = async () => {
    const text = `Email: ${props.email}\nPassword sementara: ${props.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  };
  return (
    <ModalShell title={props.title} onClose={props.onClose}>
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            Salin kredensial di bawah dan berikan ke user. Password ini <strong>hanya bisa dilihat sekarang</strong>.
            User wajib mengganti password saat login pertama.
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-sm">
          <div className="text-gray-500 text-xs">Email</div>
          <div className="text-gray-900 break-all">{props.email}</div>
          <div className="text-gray-500 text-xs mt-2">Password sementara</div>
          <div className="text-gray-900 text-base font-bold tracking-wide">{props.password}</div>
        </div>
        <button
          onClick={copyAll}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Copy className="w-4 h-4" /> {copied ? 'Tersalin!' : 'Salin Email + Password'}
        </button>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={props.onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Tutup</button>
      </div>
    </ModalShell>
  );
}

function ConfirmDialog(props: {
  title: string; message: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <ModalShell title={props.title} onClose={props.onCancel}>
      <p className="text-sm text-gray-700">{props.message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={props.onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
        <button onClick={props.onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">{props.confirmLabel}</button>
      </div>
    </ModalShell>
  );
}

function ModalShell(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={props.onClose}>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
          <button onClick={props.onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{props.children}</div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">{props.label}</label>
      {props.children}
    </div>
  );
}