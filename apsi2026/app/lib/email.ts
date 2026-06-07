// app/lib/email.ts
//
// Wrapper SMTP via nodemailer. Default ke Mailtrap sandbox untuk dev/demo.
// Production nanti tinggal swap env ke SMTP real (Resend, SendGrid, Gmail, dll).

import nodemailer from 'nodemailer'


const MAILTRAP_HOST = process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io'
const MAILTRAP_PORT = Number(process.env.MAILTRAP_PORT) || 2525
const MAILTRAP_USER = process.env.MAILTRAP_USER || ''
const MAILTRAP_PASS = process.env.MAILTRAP_PASS || ''

const FROM_EMAIL = process.env.MAIL_FROM || 'noreply@sicpl.test'
const FROM_NAME = process.env.MAIL_FROM_NAME || 'SICPL Portal'
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

// Lazy singleton transporter
let _transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (_transporter) return _transporter

  if (!MAILTRAP_USER || !MAILTRAP_PASS) {
    console.warn(
      '[email] MAILTRAP_USER / MAILTRAP_PASS belum di-set di .env.local — ' +
        'email tidak akan terkirim, tapi link verifikasi tetap akan di-log ke console.',
    )
  }

  _transporter = nodemailer.createTransport({
    host: MAILTRAP_HOST,
    port: MAILTRAP_PORT,
    auth: {
      user: MAILTRAP_USER,
      pass: MAILTRAP_PASS,
    },
  })

  return _transporter
}

export type SendVerificationEmailArgs = {
  to: string
  nama: string
  token: string
  role: 'mahasiswa' | 'dosen'
}

/**
 * Kirim email verifikasi. Return { verifyUrl, sent }.
 * - Jika SMTP belum di-set, sent=false tapi verifyUrl tetap di-return
 *   supaya developer bisa copy manual untuk testing.
 */
export async function sendVerificationEmail(
  opts: SendVerificationEmailArgs,
): Promise<{ verifyUrl: string; sent: boolean }> {
  const verifyUrl = `${APP_BASE_URL}/verify?token=${encodeURIComponent(opts.token)}`

  const subject = 'Verifikasi Akun SICPL'

  const text = [
    `Halo ${opts.nama},`,
    ``,
    `Terima kasih sudah mendaftar di SICPL Portal sebagai ${opts.role}.`,
    `Untuk mengaktifkan akun, klik link verifikasi berikut:`,
    ``,
    verifyUrl,
    ``,
    `Link berlaku selama 24 jam. Jika kamu tidak merasa mendaftar, abaikan email ini.`,
    ``,
    `— Tim SICPL Portal`,
  ].join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
      <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <h1 style="font-size:20px;margin:0 0 12px;color:#4f46e5">SICPL Portal</h1>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px">Sistem Informasi Capaian Kelulusan • Teknik Industri UNS</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <p style="font-size:15px;margin:0 0 12px">Halo <b>${escapeHtml(opts.nama)}</b>,</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 16px">
          Terima kasih sudah mendaftar di SICPL Portal sebagai <b>${opts.role}</b>.
          Klik tombol di bawah untuk verifikasi akun kamu.
        </p>
        <div style="text-align:center;margin:24px 0">
          <a href="${verifyUrl}"
             style="display:inline-block;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px">
            Verifikasi Akun Saya
          </a>
        </div>
        <p style="font-size:12px;color:#64748b;margin:0 0 8px">Atau salin link berikut ke browser:</p>
        <p style="font-size:12px;word-break:break-all;background:#f1f5f9;padding:8px;border-radius:6px;margin:0 0 16px">
          <a href="${verifyUrl}" style="color:#4f46e5">${verifyUrl}</a>
        </p>
        <p style="font-size:12px;color:#94a3b8;margin:16px 0 0">
          Link berlaku selama 24 jam. Jika kamu tidak merasa mendaftar, abaikan email ini.
        </p>
      </div>
      <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">
        SICPL Portal • Teknik Industri UNS • 2026
      </p>
    </div>
  `

  if (!MAILTRAP_USER || !MAILTRAP_PASS) {
    console.log('[email] (DEV MODE — no SMTP) verifyUrl =', verifyUrl)
    return { verifyUrl, sent: false }
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: opts.to,
      subject,
      text,
      html,
    })
    console.log(`[email] sent to ${opts.to} (verifyUrl=${verifyUrl})`)
    return { verifyUrl, sent: true }
  } catch (err: any) {
    console.error('[email] send failed:', err?.message)
    console.log('[email] fallback verifyUrl =', verifyUrl)
    return { verifyUrl, sent: false }
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─────────────────────────────────────────────────────────────────────────
// Generic sendEmail wrapper — dipakai untuk notifikasi non-verifikasi
// (misalnya notifikasi antar ko-pengampu di Tahap 5.5).
// Mengikuti pola yang sama dengan sendVerificationEmail: kalau SMTP belum
// di-set, sent=false tapi tidak melempar error supaya caller tetap jalan.
// ─────────────────────────────────────────────────────────────────────────

export type SendEmailArgs = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}

export async function sendEmail(opts: SendEmailArgs): Promise<{ sent: boolean }> {
  const toLabel = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to

  if (!MAILTRAP_USER || !MAILTRAP_PASS) {
    console.log(
      `[email] (DEV MODE — no SMTP) sendEmail skipped: "${opts.subject}" → ${toLabel}`,
    )
    return { sent: false }
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    })
    console.log(`[email] sent: "${opts.subject}" → ${toLabel}`)
    return { sent: true }
  } catch (err: any) {
    console.error('[email] sendEmail failed:', err?.message)
    return { sent: false }
  }
}