# 📚 SICPL Portal - Login & Dashboard System

Sistem login dengan 4 role berbeda (Mahasiswa, Dosen, Kaprodi, Admin) dengan dashboard terpisah untuk setiap role.

## 🎯 Fitur Utama

### 1. **4 Role Berbeda dengan Dashboard Terpisah**

#### 👨‍🎓 **Mahasiswa Dashboard** (`/dashboard/mahasiswa`)
- Melihat CPL (Capaian Pembelajaran Lulusan) progress
- Detail CPL berdasarkan learning outcomes
- Riwayat nilai per semester
- Download laporan CPL

**Default Credentials:**
- Username: `mahasiswa`
- Password: `password123`
- Default User: Ahmad Fadli (I0320045)

#### 👨‍🏫 **Dosen Dashboard** (`/dashboard/dosen`)
- Overview kelas yang diajar
- Kelola nilai mahasiswa
- Upload materi pembelajaran
- Track aktivitas terbaru
- Deadline management

**Default Credentials:**
- Username: `dosen`
- Password: `password123`
- Default User: Dr. Siti Aminah (198203152008122001)

#### 👔 **Kaprodi Dashboard** (`/dashboard/kaprodi`)
- Statistik program studi
- Data mahasiswa dengan search
- Performa akademik per semester
- Export data mahasiswa (CSV)
- Monitoring IPK dan kelulusan

**Default Credentials:**
- Username: `kaprodi`
- Password: `password123`
- Default User: Prof. Dr. Ir. Budi Santoso, M.T.

#### 🛡️ **Admin Dashboard** (`/dashboard/admin`)
- System health monitoring
- Manajemen user (CRUD operations)
- System logs dan audit trail
- Quick actions (backup, settings)
- Database statistics

**Default Credentials:**
- Username: `admin`
- Password: `password123`
- Default User: Administrator Portal (ADM-001)

## 🚀 Cara Menggunakan

### Login Page (`/`)
1. Buka aplikasi, Anda akan masuk ke halaman login
2. Pilih salah satu dari 4 quick demo buttons di bawah form login:
   - 👨‍🎓 **Mahasiswa** - Ahmad Fadli
   - 👔 **Kaprodi** - Prof. Budi
   - 👨‍🏫 **Dosen** - Dr. Siti
   - 🛡️ **Admin** - Administrator
3. Atau input username & password secara manual
4. Setelah login, Anda akan diarahkan ke dashboard sesuai role

### Authentication Flow
```
Login Page (/) 
    ↓
Validate credentials against usersSeeder
    ↓
Store session in sessionStorage
    ↓
Redirect to /dashboard/{role}
    ↓
Auth guard di setiap page cek session
    ↓
Display dashboard atau redirect kembali ke login
```

## 📁 Project Structure

```
app/
├── page.tsx                          # Login page dengan 4 quick demo buttons
├── data/
│   └── users.ts                     # User seeder dengan 11 user (termasuk duplikat role)
├── components/
│   ├── Navbar.tsx                   # Navigation bar (shared)
│   └── Sidebar.tsx                  # Sidebar menu (shared)
├── dashboard/
│   ├── layout.tsx                   # Dashboard layout wrapper
│   ├── mahasiswa/
│   │   ├── page.tsx                 # Mahasiswa dashboard main page
│   │   ├── data.ts                  # Mock data untuk mahasiswa
│   │   └── components/
│   │       ├── ProfileCard.tsx      # Profile card component
│   │       ├── DashboardView.tsx    # Main dashboard view
│   │       ├── CplView.tsx          # CPL detail view
│   │       └── RiwayatView.tsx      # Grade history view
│   ├── dosen/
│   │   ├── page.tsx                 # Dosen dashboard main page
│   │   └── components/
│   │       ├── DosenDashboardView.tsx    # Main dashboard view
│   │       └── KelasView.tsx             # Class management view
│   ├── kaprodi/
│   │   ├── page.tsx                 # Kaprodi dashboard main page
│   │   └── components/
│   │       ├── KaprodiDashboardView.tsx  # Main dashboard view
│   │       └── MahasiswaListView.tsx     # Student list view
│   └── admin/
│       ├── page.tsx                 # Admin dashboard main page
│       └── components/
│           ├── AdminDashboardView.tsx    # Main dashboard view
│           └── UserManagementView.tsx    # User management view
├── globals.css                       # Global styles
├── layout.tsx                        # Root layout
├── middleware.ts                     # Authentication middleware
└── AUTH_DOCUMENTATION.md             # Auth system documentation
```

## 👥 User Seeder Data

File: `app/data/users.ts`

### Mahasiswa Users (4)
| Username | Name | NIM | Password |
|----------|------|-----|----------|
| mahasiswa | Ahmad Fadli | I0320045 | password123 |
| mhs_siti | Siti Nurhaliza | I0320046 | password123 |
| mhs_budi | Budi Santoso | I0320047 | password123 |
| mhs_dewi | Dewi Kusuma | I0321001 | password123 |

### Dosen Users (3)
| Username | Name | NIP | Password |
|----------|------|-----|----------|
| dosen | Dr. Siti Aminah, S.T., M.T. | 198203152008122001 | password123 |
| dsn_rendra | Ir. Rendra Sukma, M.T. | 197809082005011001 | password123 |
| dsn_maya | Dr. Maya Puspita, S.T., M.T. | 198505252010122002 | password123 |

### Kaprodi Users (1)
| Username | Name | NIP | Password |
|----------|------|-----|----------|
| kaprodi | Prof. Dr. Ir. Budi Santoso, M.T. | 197508212002121003 | password123 |

### Admin Users (2)
| Username | Name | ID | Password |
|----------|------|-----|----------|
| admin | Administrator Portal | ADM-001 | password123 |
| admin_support | Support Administrator | ADM-002 | password123 |

## 🔐 Session Management

### Session Storage Structure
```typescript
{
  id: string;           // Unique user ID
  username: string;     // Username for login
  name: string;        // Full name
  role: UserRole;      // 'mahasiswa' | 'kaprodi' | 'dosen' | 'admin'
  identifier: string;  // NIM/NIP/ID
  initials: string;    // Name initials for avatar
  prodi: string;       // Program studi
}
```

### Session Location
- **Storage Type**: `sessionStorage` (browser)
- **Key**: `currentUser`
- **Cleared on**: Browser tab/window close or manual logout

### Auth Guard Implementation
Setiap dashboard page memiliki auth guard di useEffect:
```typescript
useEffect(() => {
  const rawUser = sessionStorage.getItem('currentUser');
  if (!rawUser) router.push('/');
  
  const userObj = JSON.parse(rawUser);
  if (userObj.role !== expectedRole) {
    router.push(`/dashboard/${userObj.role}`);
  }
  setSessionUser(userObj);
}, [router]);
```

## 🎨 UI Components

### Shared Components

#### Navbar (`app/components/Navbar.tsx`)
- Portal title
- User name & role display
- User initials avatar
- Logout button

#### Sidebar (`app/components/Sidebar.tsx`)
- Navigation menu items
- Active state highlighting
- Role-specific menu items

### Dashboard-Specific Components
Setiap dashboard memiliki komponen khusus untuk menampilkan data yang relevan dengan role tersebut.

## 📊 Mock Data

- Dashboard Mahasiswa menggunakan mock data dari `app/dashboard/mahasiswa/data.ts`
- Dashboard Kaprodi menggunakan mock data untuk performance metrics dan student list
- Dashboard Dosen menggunakan mock data untuk classes dan activities
- Dashboard Admin menggunakan mock data untuk system logs dan user list

## 🧪 Testing

### Quick Test Flow
1. **Login as Mahasiswa**
   - View CPL progress
   - Check grades history
   - Download CPL report

2. **Login as Dosen**
   - View classes
   - Check class management options
   - See recent activities

3. **Login as Kaprodi**
   - View program statistics
   - Search students
   - Export student data

4. **Login as Admin**
   - View system logs
   - Manage users
   - Check system health

## 🔧 Development Notes

### Adding New Users
1. Update `app/data/users.ts`
2. Add new entry to `usersSeeder` array
3. Ensure unique username
4. Ensure password is hashed in production

### Customizing Dashboard Views
- Each dashboard has ViewComponent structure
- Modify respective component file in `components/` folder
- Update tab switching logic in page.tsx

### Session Persistence
- Current implementation uses `sessionStorage`
- For production: implement proper JWT or server-side session
- Clear sensitive data on logout

## ⚠️ Production Considerations

1. **Password Security**
   - Current seeder uses plain text passwords (development only)
   - Implement proper password hashing in production
   - Use bcrypt or similar library

2. **Session Management**
   - Replace sessionStorage with secure HTTP-only cookies
   - Implement JWT tokens with expiry
   - Add refresh token mechanism

3. **Database Integration**
   - Replace mock users.ts with actual database query
   - Implement user authentication with backend API
   - Add audit logging for all auth events

4. **Role-Based Access Control**
   - Implement granular permissions system
   - Use middleware for route protection
   - Add API endpoint authorization

## 📝 Important Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Login page with quick demo |
| `app/data/users.ts` | User seeder database |
| `middleware.ts` | Auth middleware |
| `AUTH_DOCUMENTATION.md` | Auth system docs |
| `app/dashboard/[role]/page.tsx` | Role-specific dashboards |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
# Use quick demo buttons to test different roles
```

## 📞 Support

Untuk menambah users baru atau mengubah credentials, edit file `app/data/users.ts` dan restart development server.
