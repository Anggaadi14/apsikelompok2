'use client';

import { UserSession } from '../../../data/users';
import { Search, Plus, Edit2, Trash2, Shield } from 'lucide-react';
import { useState } from 'react';

interface UserManagementViewProps {
  sessionUser: UserSession;
}

interface User {
  id: string;
  nama: string;
  username: string;
  email: string;
  role: string;
  status: string;
  joinDate: string;
}

export default function UserManagementView({ sessionUser }: UserManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const users: User[] = [
    {
      id: 'user_mhs',
      nama: 'Ahmad Fadli',
      username: 'mahasiswa',
      email: 'ahmad.fadli@example.com',
      role: 'mahasiswa',
      status: 'Aktif',
      joinDate: '2020-08-15',
    },
    {
      id: 'user_kap',
      nama: 'Prof. Dr. Ir. Budi Santoso, M.T.',
      username: 'kaprodi',
      email: 'budi.santoso@example.com',
      role: 'kaprodi',
      status: 'Aktif',
      joinDate: '2020-01-10',
    },
    {
      id: 'user_dsn',
      nama: 'Dr. Siti Aminah, S.T., M.T.',
      username: 'dosen',
      email: 'siti.aminah@example.com',
      role: 'dosen',
      status: 'Aktif',
      joinDate: '2020-02-01',
    },
    {
      id: 'user_adm',
      nama: 'Administrator Portal',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      status: 'Aktif',
      joinDate: '2020-01-01',
    },
  ];

  const filteredUsers = users.filter(
    (u) =>
      (u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterRole === 'all' || u.role === filterRole)
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'mahasiswa':
        return 'bg-blue-100 text-blue-700';
      case 'dosen':
        return 'bg-green-100 text-green-700';
      case 'kaprodi':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen User</h1>
          <p className="text-gray-600 mt-1">Kelola semua pengguna sistem</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari user berdasarkan nama, username, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Semua Role</option>
          <option value="admin">Admin</option>
          <option value="kaprodi">Kaprodi</option>
          <option value="dosen">Dosen</option>
          <option value="mahasiswa">Mahasiswa</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Join Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">{user.nama}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{user.username}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.joinDate}</td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex gap-2">
                        <button className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada user yang ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total User</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Admin</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Kaprodi</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter((u) => u.role === 'kaprodi').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Dosen</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter((u) => u.role === 'dosen').length}
          </p>
        </div>
      </div>
    </div>
  );
}
