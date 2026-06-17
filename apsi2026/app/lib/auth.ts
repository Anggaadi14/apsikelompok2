import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// =====================================================================
// Types
// =====================================================================

/** 5 kelompok role sesuai notul Zoom */
export type UserRole = 'mahasiswa' | 'dosen' | 'kaprodi' | 'jamu' | 'admin'

/**
 * Session shape dipakai semua endpoint.
 * 
 * Field BARU (Tahap 4.5.A):
 *   - id_user, email, id_mahasiswa, id_staff
 * 
 * Field LEGACY (tetap dipertahankan untuk komponen lama):
 *   - id ("mhs_X" | "staff_X"), username, name, identifier, initials, prodi
 */
export interface SessionUser {
  // Baru
  id_user: number
  email: string
  id_mahasiswa: number | null
  id_staff: number | null
  role: UserRole
  force_password_change?: 0 | 1

  // Legacy compat
  id: string
  username: string
  name: string
  identifier: string
  initials: string
  prodi: string
}

export class AuthError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_SESSION',
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// =====================================================================
// Parse entitas legacy: "mhs_1" / "staff_3"
// =====================================================================

export function parseEntityId(id: string): { kind: 'mhs' | 'staff'; entityId: number } | null {
  const m = /^(mhs|staff)_(\d+)$/.exec(id)
  if (!m) return null
  return { kind: m[1] as 'mhs' | 'staff', entityId: parseInt(m[2], 10) }
}

// =====================================================================
// Session parsing dari header X-User-Session
// =====================================================================

export function parseSessionHeader(raw: string | null): SessionUser {
  if (!raw) throw new AuthError('UNAUTHORIZED', 401, 'Header X-User-Session tidak ada')

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new AuthError('INVALID_SESSION', 401, 'X-User-Session bukan JSON valid')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AuthError('INVALID_SESSION', 401, 'X-User-Session kosong')
  }

  // Backward compat: kalau session lama (sebelum Tahap 4.5.A), id_user mungkin tidak ada.
  // Derive dari parseEntityId(id) supaya tidak break komponen yang masih kirim format lama.
  let id_user = typeof parsed.id_user === 'number' ? parsed.id_user : 0
  let id_mahasiswa: number | null =
    typeof parsed.id_mahasiswa === 'number' ? parsed.id_mahasiswa : null
  let id_staff: number | null =
    typeof parsed.id_staff === 'number' ? parsed.id_staff : null

  if (id_mahasiswa === null && id_staff === null && typeof parsed.id === 'string') {
    const ent = parseEntityId(parsed.id)
    if (ent) {
      if (ent.kind === 'mhs') id_mahasiswa = ent.entityId
      else id_staff = ent.entityId
    }
  }

  const role = parsed.role as UserRole
  const validRoles: UserRole[] = ['mahasiswa', 'dosen', 'kaprodi', 'jamu', 'admin']
  if (!validRoles.includes(role)) {
    throw new AuthError('INVALID_SESSION', 401, `Role '${role}' tidak dikenal`)
  }

  const legacyId =
    parsed.id ||
    (id_mahasiswa ? `mhs_${id_mahasiswa}` : id_staff ? `staff_${id_staff}` : '')

  const force_password_change = (Number(parsed.force_password_change) === 1 ? 1 : 0) as 0 | 1;
  return {
    id_user,
    force_password_change,
    email: parsed.email || '',
    id_mahasiswa,
    id_staff,
    role,
    id: legacyId,
    username: parsed.username || (parsed.email ? String(parsed.email).split('@')[0] : ''),
    name: parsed.name || '',
    identifier: parsed.identifier || '',
    initials: parsed.initials || '',
    prodi: parsed.prodi || 'Prodi Teknik Industri UNS',
  }
}

// =====================================================================
// Public helpers untuk endpoint
// =====================================================================

export async function getSessionUser(req: NextRequest): Promise<SessionUser> {
  const raw = req.headers.get('x-user-session') || req.headers.get('X-User-Session')
  return parseSessionHeader(raw)
}

export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[],
): Promise<SessionUser> {
  const session = await getSessionUser(req)
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError(
      'FORBIDDEN',
      403,
      `Role '${session.role}' tidak diizinkan. Diperlukan: ${allowedRoles.join(', ')}`,
    )
  }
  return session
}

export function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: err.code, message: err.message },
      { status: err.statusCode },
    )
  }
  return null
}

export function serverError(message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: 'SERVER_ERROR', message },
    { status: 500 },
  )
}

// =====================================================================
// Password hashing
// =====================================================================

const BCRYPT_ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  // Backward compat: hash bcrypt mulai dengan $2*
  if (hash.startsWith('$2')) {
    return bcrypt.compare(plain, hash)
  }
  // Plaintext legacy (jangan diandalkan, hanya untuk migrasi awal)
  return plain === hash
}

// =====================================================================
// LEGACY SHIMS (pertahankan untuk komponen lama yang belum di-refactor)
// =====================================================================

export interface LegacySession {
  id: string
  role: UserRole
  name?: string
}

/** Sync version, digunakan oleh endpoint profile + semester yang belum migrasi */
export function getSessionFromRequest(req: NextRequest): LegacySession | null {
  const raw = req.headers.get('x-user-session') || req.headers.get('X-User-Session')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      id: parsed.id || '',
      role: parsed.role,
      name: parsed.name,
    }
  } catch {
    return null
  }
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: 'UNAUTHORIZED', message },
    { status: 401 },
  )
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: 'FORBIDDEN', message },
    { status: 403 },
  )
}