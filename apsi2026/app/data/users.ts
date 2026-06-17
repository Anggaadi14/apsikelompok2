export type UserRole = 'mahasiswa' | 'kaprodi' | 'dosen' | 'admin' | 'jamu';

export interface UserSession {
  id: string;
  id_user?: number;
  username: string;
  name: string;
  role: UserRole;
  identifier: string;
  initials: string;
  prodi: string;
  force_password_change?: 0 | 1;
}

/**
 * USER SEEDER DATA
 * 
 * Quick Login Credentials (from Login page quick demo buttons):
 * - Mahasiswa: username=mahasiswa, password=password123
 * - Kaprodi: username=kaprodi, password=password123
 * - Dosen: username=dosen, password=password123
 * - Admin: username=admin, password=password123
 */
export const usersSeeder: (UserSession & { password: string })[] = [
  // ============ MAHASISWA USERS ============
  {
    id: 'user_mhs_001',
    username: 'mahasiswa',
    password: 'password123',
    name: 'Ahmad Fadli',
    role: 'mahasiswa',
    identifier: 'I0320045',
    initials: 'AF',
    prodi: 'Prodi Teknik Industri UNS',
  },
  {
    id: 'user_mhs_002',
    username: 'mhs_siti',
    password: 'password123',
    name: 'Siti Nurhaliza',
    role: 'mahasiswa',
    identifier: 'I0320046',
    initials: 'SN',
    prodi: 'Prodi Teknik Industri UNS',
  },
  {
    id: 'user_mhs_003',
    username: 'mhs_budi',
    password: 'password123',
    name: 'Budi Santoso',
    role: 'mahasiswa',
    identifier: 'I0320047',
    initials: 'BS',
    prodi: 'Prodi Teknik Industri UNS',
  },
  {
    id: 'user_mhs_004',
    username: 'mhs_dewi',
    password: 'password123',
    name: 'Dewi Kusuma',
    role: 'mahasiswa',
    identifier: 'I0321001',
    initials: 'DK',
    prodi: 'Prodi Teknik Industri UNS',
  },

  // ============ KAPRODI USERS ============
  {
    id: 'user_kap_001',
    username: 'kaprodi',
    password: 'password123',
    name: 'Prof. Dr. Ir. Budi Santoso, M.T.',
    role: 'kaprodi',
    identifier: '197508212002121003',
    initials: 'BS',
    prodi: 'Prodi Teknik Industri UNS',
  },

  // ============ DOSEN USERS ============
  {
    id: 'user_dsn_001',
    username: 'dosen',
    password: 'password123',
    name: 'Dr. Siti Aminah, S.T., M.T.',
    role: 'dosen',
    identifier: '198203152008122001',
    initials: 'SA',
    prodi: 'Prodi Teknik Industri UNS',
  },
  {
    id: 'user_dsn_002',
    username: 'dsn_rendra',
    password: 'password123',
    name: 'Ir. Rendra Sukma, M.T.',
    role: 'dosen',
    identifier: '197809082005011001',
    initials: 'RS',
    prodi: 'Prodi Teknik Industri UNS',
  },
  {
    id: 'user_dsn_003',
    username: 'dsn_maya',
    password: 'password123',
    name: 'Dr. Maya Puspita, S.T., M.T.',
    role: 'dosen',
    identifier: '198505252010122002',
    initials: 'MP',
    prodi: 'Prodi Teknik Industri UNS',
  },

  // ============ ADMIN USERS ============
  {
    id: 'user_adm_001',
    username: 'admin',
    password: 'password123',
    name: 'Administrator Portal',
    role: 'admin',
    identifier: 'ADM-001',
    initials: 'AD',
    prodi: 'Pusat Data Akademik UNS',
  },
  {
    id: 'user_adm_002',
    username: 'admin_support',
    password: 'password123',
    name: 'Support Administrator',
    role: 'admin',
    identifier: 'ADM-002',
    initials: 'SA',
    prodi: 'Pusat Data Akademik UNS',
  },

  // ============ JAMU USERS ============
  {
    id: 'user_jamu_001',
    username: 'jamu1',
    password: 'password123',
    name: 'Tim Jamu Satu, S.T., M.T.',
    role: 'jamu',
    identifier: 'JM001',
    initials: 'TJ',
    prodi: 'Prodi Teknik Industri UNS',
  },
  {
    id: 'user_jamu_002',
    username: 'jamu2',
    password: 'password123',
    name: 'Tim Jamu Dua, S.T., M.T.',
    role: 'jamu',
    identifier: 'JM002',
    initials: 'TJ',
    prodi: 'Prodi Teknik Industri UNS',
  },
];

