import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from './db'

export type UserRole = 'mahasiswa' | 'dosen' | 'kaprodi' | 'admin'

export interface SessionUser {
  id: number
  rawId: string
  role: UserRole
  nama: string
  email?: string
}

export class AuthError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

interface ParsedEntity {
  prefix: 'mhs' | 'staff'
  id: number
}

/**
 * Parse rawId dari session:
 *  - "mhs_1"   → { prefix: 'mhs',   id: 1 }   → tabel mahasiswa
 *  - "staff_3" → { prefix: 'staff', id: 3 }   → tabel staff
 * Format ini di-emit oleh app/api/auth/login/route.ts.
 */
export function parseEntityId(rawId: string): ParsedEntity {
  const match = /^(mhs|staff)_(\d+)$/.exec(rawId)
  if (!match) {
    throw new AuthError('INVALID_SESSION', 400, 'Format ID session tidak valid')
  }
  return { prefix: match[1] as 'mhs' | 'staff', id: parseInt(match[2], 10) }
}

interface RawSessionPayload {
  id?: unknown
  role?: unknown
  nama?: unknown
  email?: unknown
  [key: string]: unknown
}

export function parseSessionHeader(req: Request): RawSessionPayload {
  const header = req.headers.get('x-user-session')
  if (!header) {
    throw new AuthError('UNAUTHORIZED', 401, 'Session tidak ditemukan di header')
  }
  try {
    const parsed = JSON.parse(header) as RawSessionPayload
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('not-object')
    }
    if (typeof parsed.id !== 'string' || typeof parsed.role !== 'string') {
      throw new Error('missing-fields')
    }
    return parsed
  } catch {
    throw new AuthError('INVALID_SESSION', 400, 'Format session tidak valid')
  }
}

export async function getSessionUser(req: Request): Promise<SessionUser> {
  const raw = parseSessionHeader(req)
  const rawId = raw.id as string
  const claimedRole = raw.role as string

  const { prefix, id } = parseEntityId(rawId)
  const db = getDb()

  if (prefix === 'mhs') {
    if (claimedRole !== 'mahasiswa') {
      throw new AuthError('INVALID_SESSION', 400, 'Role tidak sesuai dengan tipe ID')
    }
    const [rows] = await db.execute(
      'SELECT id_mahasiswa, nama_mahasiswa, email_sso, status_akun FROM mahasiswa WHERE id_mahasiswa = ? LIMIT 1',
      [id],
    )
    const row = (rows as any[])[0]
    if (!row) {
      throw new AuthError('UNAUTHORIZED', 401, 'Mahasiswa tidak ditemukan')
    }
    if (row.status_akun !== 'aktif') {
      throw new AuthError('FORBIDDEN', 403, 'Akun mahasiswa nonaktif')
    }
    return {
      id: row.id_mahasiswa,
      rawId,
      role: 'mahasiswa',
      nama: row.nama_mahasiswa,
      email: row.email_sso ?? undefined,
    }
  }

  // prefix === 'staff'
  const [rows] = await db.execute(
    'SELECT id_staff, nama_lengkap, email_sso, peran, status_akun FROM staff WHERE id_staff = ? LIMIT 1',
    [id],
  )
  const row = (rows as any[])[0]
  if (!row) {
    throw new AuthError('UNAUTHORIZED', 401, 'Staff tidak ditemukan')
  }
  if (row.status_akun !== 'aktif') {
    throw new AuthError('FORBIDDEN', 403, 'Akun staff nonaktif')
  }
  const validStaffRoles: UserRole[] = ['dosen', 'kaprodi', 'admin']
  if (!validStaffRoles.includes(row.peran)) {
    throw new AuthError('FORBIDDEN', 403, `Peran tidak dikenal: ${row.peran}`)
  }
  if (row.peran !== claimedRole) {
    throw new AuthError('INVALID_SESSION', 400, 'Role di session tidak sesuai dengan database')
  }
  return {
    id: row.id_staff,
    rawId,
    role: row.peran as UserRole,
    nama: row.nama_lengkap,
    email: row.email_sso ?? undefined,
  }
}

export async function requireRole(
  req: Request,
  allowed: UserRole[],
): Promise<SessionUser> {
  const user = await getSessionUser(req)
  if (!allowed.includes(user.role)) {
    throw new AuthError('FORBIDDEN', 403, `Akses ditolak untuk role ${user.role}`)
  }
  return user
}

export function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: err.code, message: err.message },
      { status: err.status },
    )
  }
  return null
}

/**
 * Helper response 500 — dipakai oleh login endpoint dan endpoint lain.
 * Di production, `detail` disembunyikan supaya stack trace tidak bocor ke client.
 */
export function serverError(detail?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server.',
      ...(process.env.NODE_ENV !== 'production' && detail ? { detail } : {}),
    },
    { status: 500 },
  )
}

// ─── bcrypt helpers ──────────────────────────────────────────────
const BCRYPT_ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 6) {
    throw new AuthError('WEAK_PASSWORD', 400, 'Password minimal 6 karakter')
  }
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/**
 * Backward-compatible password check.
 * Login endpoint kamu (app/api/auth/login/route.ts) langsung pakai bcrypt.compare,
 * tapi helper ini tetap disediakan untuk endpoint lain (mis. change-password admin).
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  if (!hash.startsWith('$2')) {
    return plain === hash
  }
  return bcrypt.compare(plain, hash)
}
// ─── Legacy shims (kompatibilitas endpoint pre-Tahap 4) ──────────
// Endpoint pre-Tahap 4 (mis. /api/mahasiswa/profile, /api/mahasiswa/semester)
// memanggil getSessionFromRequest secara SYNCHRONOUS dan mengharapkan `null`
// kalau session tidak ada/invalid (bukan throw). Shim di bawah ini meniru
// kontrak lama itu persis supaya file-file route legacy tidak perlu diubah.
//
// Setelah Tahap 5, semua endpoint sebaiknya dimigrasi ke `requireRole(req, [...])`
// yang lebih ketat (cross-check DB + status_akun) dan ringkas.

export interface LegacySession {
  id: string            // "mhs_1" atau "staff_3" (string, dari sessionStorage)
  role: string          // "mahasiswa" | "dosen" | "kaprodi" | "admin"
  username?: string
  name?: string
  identifier?: string   // NIM untuk mahasiswa, NIP untuk staff
  initials?: string
  prodi?: string
  [key: string]: unknown
}

/**
 * Versi lama (SYNCHRONOUS, returns null on failure).
 * Hanya parsing header — TIDAK cross-check ke DB.
 * Endpoint pemanggil bertanggung jawab atas role check sendiri.
 */
export function getSessionFromRequest(req: Request): LegacySession | null {
  const header = req.headers.get('x-user-session')
  if (!header) return null
  try {
    const parsed = JSON.parse(header)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.id !== 'string' || typeof parsed.role !== 'string') return null
    return parsed as LegacySession
  } catch {
    return null
  }
}

export function unauthorized(message = 'Sesi tidak valid atau sudah berakhir.'): NextResponse {
  return NextResponse.json(
    { success: false, error: 'UNAUTHORIZED', message },
    { status: 401 },
  )
}

export function forbidden(message = 'Akses ditolak.'): NextResponse {
  return NextResponse.json(
    { success: false, error: 'FORBIDDEN', message },
    { status: 403 },
  )
}