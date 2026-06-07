import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/app/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // Terima identifier dari beberapa nama field untuk kompatibilitas:
    //   - identifier (baru, direkomendasikan)
    //   - email      (untuk akun seed kaprodi/jamu/admin yang signin pakai email)
    //   - username   (untuk frontend lama yang belum di-update)
    const identifierRaw =
      body?.identifier ?? body?.email ?? body?.username ?? ''
    const password = body?.password ?? ''

    const identifier = String(identifierRaw).trim()

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_INPUT',
          message: 'Email / NIM / NIP dan password wajib diisi',
        },
        { status: 400 },
      )
    }

    const db = getDb()

    // Cari user berdasarkan SALAH SATU dari:
    //   1) user.email (akun seeded + signup baru)
    //   2) mahasiswa.nim (login mahasiswa pakai NIM)
    //   3) staff.nip_nidn_nik (login staff pakai NIP/NIDN/NIK)
    const [rows] = await db.query<any[]>(
      `SELECT
         u.id_user, u.email, u.sandi_hash, u.role, u.status,
         u.id_mahasiswa, u.id_staff, u.nama_input,
         m.nim, m.nama_mahasiswa, m.angkatan,
         s.nip_nidn_nik, s.nama_lengkap, s.peran AS staff_peran
       FROM user u
       LEFT JOIN mahasiswa m ON u.id_mahasiswa = m.id_mahasiswa
       LEFT JOIN staff s     ON u.id_staff     = s.id_staff
       WHERE u.email = ?
          OR m.nim = ?
          OR s.nip_nidn_nik = ?
       LIMIT 1`,
      [identifier, identifier, identifier],
    )

    const user = (rows as any[])[0]

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Email/NIM/NIP atau password salah',
        },
        { status: 401 },
      )
    }

    if (user.status === 'pending_verification') {
      return NextResponse.json(
        {
          success: false,
          error: 'PENDING_VERIFICATION',
          message: 'Akun belum diverifikasi. Silakan cek email untuk link verifikasi.',
        },
        { status: 403 },
      )
    }

    if (user.status !== 'aktif') {
      return NextResponse.json(
        { success: false, error: 'ACCOUNT_INACTIVE', message: 'Akun nonaktif. Hubungi admin.' },
        { status: 403 },
      )
    }

    if (!user.sandi_hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_PASSWORD',
          message: 'Akun belum memiliki sandi. Selesaikan verifikasi terlebih dahulu.',
        },
        { status: 403 },
      )
    }

    const ok = await bcrypt.compare(password, user.sandi_hash)
    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Email/NIM/NIP atau password salah',
        },
        { status: 401 },
      )
    }

    // Bangun session — kompatibel dengan format lama (id "mhs_X" / "staff_X")
    const isMahasiswa = user.role === 'mahasiswa' && !!user.id_mahasiswa
    const legacyId = isMahasiswa
      ? `mhs_${user.id_mahasiswa}`
      : user.id_staff
        ? `staff_${user.id_staff}`
        : ''

    const name = isMahasiswa
      ? user.nama_mahasiswa
      : user.nama_lengkap || user.nama_input || user.email

    const identifierOut = isMahasiswa
      ? user.nim || ''
      : user.nip_nidn_nik || ''

    const initials = String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const session = {
      // baru
      id_user: user.id_user,
      email: user.email,
      role: user.role,
      id_mahasiswa: user.id_mahasiswa,
      id_staff: user.id_staff,
      // legacy
      id: legacyId,
      username: String(user.email).split('@')[0],
      name,
      identifier: identifierOut,
      initials,
      prodi: 'Prodi Teknik Industri UNS',
    }

    return NextResponse.json({ success: true, data: session })
  } catch (err: any) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}