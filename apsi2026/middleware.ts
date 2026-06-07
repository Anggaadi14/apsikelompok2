import { NextRequest, NextResponse } from 'next/server'

/**
 * IP Whitelist Middleware
 *
 * Behavior:
 * - Skip jika BYPASS_IP_CHECK=true (untuk dev/test)
 * - Allow jika IP klien match daftar di ALLOWED_IPS (comma-separated)
 * - Support CIDR notation (mis. 10.0.0.0/8) untuk subnet kampus
 * - Skip static assets & internal Next.js routes
 * - Reject dengan 403 JSON response
 */

const BYPASS = process.env.BYPASS_IP_CHECK === 'true'
const ALLOWED_RAW = process.env.ALLOWED_IPS ?? ''
const ALLOWED_LIST = ALLOWED_RAW
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// Path yang di-skip dari pengecekan IP (assets, healthcheck, dll)
const SKIP_PATHS = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/health',
]

function ipToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let result = 0
  for (const p of parts) {
    const n = parseInt(p, 10)
    if (isNaN(n) || n < 0 || n > 255) return null
    result = (result << 8) | n
  }
  return result >>> 0
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [subnet, bitsStr] = cidr.split('/')
  const bits = parseInt(bitsStr, 10)
  if (isNaN(bits) || bits < 0 || bits > 32) return false
  const ipInt = ipToInt(ip)
  const subnetInt = ipToInt(subnet)
  if (ipInt === null || subnetInt === null) return false
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return (ipInt & mask) === (subnetInt & mask)
}

function isAllowed(clientIp: string): boolean {
  if (ALLOWED_LIST.length === 0) return true  // safety: empty = allow all
  for (const entry of ALLOWED_LIST) {
    if (entry === '*') return true
    if (entry.includes('/')) {
      if (ipMatchesCidr(clientIp, entry)) return true
    } else {
      if (entry === clientIp) return true
    }
  }
  return false
}

function getClientIp(req: NextRequest): string {
  // Order: x-forwarded-for (first), x-real-ip, x-vercel-forwarded-for, then req.ip
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri.trim()
  // Next.js 16: req.ip tidak ada di Edge. Pakai socket info kalau ada.
  return '0.0.0.0'
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip assets & internal paths
  for (const skip of SKIP_PATHS) {
    if (pathname.startsWith(skip)) return NextResponse.next()
  }

  // Bypass mode (dev only)
  if (BYPASS) return NextResponse.next()

  const clientIp = getClientIp(req)
  if (isAllowed(clientIp)) {
    return NextResponse.next()
  }

  // Reject dengan 403
  // Untuk API route → return JSON. Untuk halaman → return halaman HTML simple.
  const isApi = pathname.startsWith('/api/')
  if (isApi) {
    return NextResponse.json(
      {
        success: false,
        error: 'IP_NOT_WHITELISTED',
        message: 'Akses ke sistem ini dibatasi pada jaringan kampus. Hubungi admin jika Anda mengakses dari lokasi yang seharusnya diizinkan.',
        detail: { clientIp },
      },
      { status: 403 }
    )
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><title>403 — Akses Dibatasi</title>
    <meta charset="utf-8">
    <style>
      body { font-family: system-ui, sans-serif; background: #f8f9fa; padding: 60px 20px; color: #212529; text-align: center; }
      .box { max-width: 540px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
      h1 { color: #dc3545; margin: 0 0 12px; }
      code { background: #f1f3f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    </style></head>
    <body><div class="box">
      <h1>403 — Akses Dibatasi</h1>
      <p>Sistem Informasi Monitoring Capaian Pembelajaran Luaran (SICPL) hanya dapat diakses dari jaringan kampus.</p>
      <p>IP Anda: <code>${clientIp}</code></p>
      <p>Hubungi administrator jika Anda mengakses dari lokasi yang seharusnya diizinkan.</p>
    </div></body></html>`,
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export const config = {
  // Jalanin middleware di semua route kecuali static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}