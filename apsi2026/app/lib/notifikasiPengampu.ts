// app/lib/notifikasiPengampu.ts
//
// Helper notifikasi email ke ko-pengampu kelas.
// Dipanggil dari endpoint dosen (edit manual nilai + upload SIAKAD).
//
// - Reuse lib/email.ts (sama dengan yang dipakai signup).
// - Fire-and-forget pattern: caller pakai `void notify... .catch(console.error)`.
// - Debounce in-memory untuk edit per sel (mencegah spam).

import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';
import { sendEmail } from '@/app/lib/email';

// ── Debounce state (in-memory, reset saat server restart) ─────────────────
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 menit
const lastEditNotif = new Map<string, number>(); // key = `${id_kelas}|${id_staff_editor}`

function shouldSendEditNotif(id_kelas: number, id_staff_editor: number): boolean {
  const key = `${id_kelas}|${id_staff_editor}`;
  const now = Date.now();
  const last = lastEditNotif.get(key);
  if (last && now - last < DEBOUNCE_MS) return false;
  lastEditNotif.set(key, now);
  return true;
}

// ── Internal: query ko-pengampu (exclude editor) ──────────────────────────
type KoPengampuRow = {
  id_staff: number;
  nama: string;
  email: string;
  peran_di_kelas: 'koordinator' | 'anggota';
};

async function getKoPengampu(
  id_kelas: number,
  exclude_id_staff: number,
): Promise<KoPengampuRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('mapping_dosen_kelas')
    .select('id_staff, peran_di_kelas, staff:id_staff ( nama_lengkap, email_sso )')
    .eq('id_kelas', id_kelas)
    .neq('id_staff', exclude_id_staff);

  return (data ?? [])
    .filter((r: any) => r.staff?.email_sso)
    .map((r: any) => ({
      id_staff: r.id_staff,
      nama: r.staff.nama_lengkap,
      email: r.staff.email_sso,
      peran_di_kelas: r.peran_di_kelas,
    }));
}

// ── Internal: query meta kelas + editor ───────────────────────────────────
type KelasMeta = {
  kode_mk: string;
  nama_mk: string;
  kode_kelas: string | null;
  tahun_akademik: string;
  semester: string;
};

type EditorMeta = {
  nama_editor: string;
  kode_dosen: string;
};

async function getKelasMeta(id_kelas: number): Promise<KelasMeta | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('kelas_mk')
    .select('kode_kelas, tahun_akademik, semester, mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk )')
    .eq('id_kelas', id_kelas)
    .maybeSingle<{ kode_kelas: string | null; tahun_akademik: string; semester: string; mata_kuliah: { kode_mk: string; nama_mk: string } }>();
  if (!data) return null;
  return {
    kode_mk: data.mata_kuliah.kode_mk,
    nama_mk: data.mata_kuliah.nama_mk,
    kode_kelas: data.kode_kelas,
    tahun_akademik: data.tahun_akademik,
    semester: data.semester,
  };
}

async function getEditorMeta(id_staff: number): Promise<EditorMeta | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('staff')
    .select('nama_lengkap, nip_nidn_nik')
    .eq('id_staff', id_staff)
    .maybeSingle<{ nama_lengkap: string; nip_nidn_nik: string }>();
  if (!data) return null;
  return { nama_editor: data.nama_lengkap, kode_dosen: data.nip_nidn_nik };
}

// ── HTML template builder ────────────────────────────────────────────────
function buildEmailHtml(opts: {
  greeting: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const cta = opts.ctaText && opts.ctaUrl
    ? `<p style="margin:24px 0;">
         <a href="${opts.ctaUrl}"
            style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:6px;
                   text-decoration:none;font-size:14px;font-weight:600;">
           ${opts.ctaText}
         </a>
       </p>`
    : '';

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;
                padding:24px;color:#1f2937;line-height:1.5;">
      <div style="border-left:4px solid #4f46e5;padding-left:12px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:18px;color:#1f2937;">SICPL — Notifikasi Pengampuan</h2>
      </div>
      <p style="font-size:15px;">${opts.greeting}</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
                  padding:16px;font-size:14px;color:#374151;">
        ${opts.body}
      </div>
      ${cta}
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #f3f4f6;
                padding-top:12px;">
        Email otomatis dari SICPL (Sistem Informasi Monitoring CPL).
        Anda menerima ini karena tercatat sebagai pengampu kelas terkait.
      </p>
    </div>
  `.trim();
}

function getDashboardUrl(): string {
  // Pakai env kalau ada, kalau tidak fallback ke localhost
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

// ── Public: notifikasi edit manual (debounced) ────────────────────────────
export async function notifyKoPengampuOnEdit(opts: {
  id_kelas: number;
  id_staff_editor: number;
}): Promise<void> {
  try {
    if (!shouldSendEditNotif(opts.id_kelas, opts.id_staff_editor)) {
      // Debounced — skip
      return;
    }

    const [kelas, editor, koPengampu] = await Promise.all([
      getKelasMeta(opts.id_kelas),
      getEditorMeta(opts.id_staff_editor),
      getKoPengampu(opts.id_kelas, opts.id_staff_editor),
    ]);

    if (!kelas || !editor || koPengampu.length === 0) return;

    const kelasLabel = `${kelas.kode_mk} ${kelas.nama_mk}${kelas.kode_kelas ? ` (Kelas ${kelas.kode_kelas})` : ''
      }`;

    const subject = `[SICPL] Nilai diubah — ${kelas.kode_mk} ${kelas.kode_kelas ?? ''}`.trim();
    const html = buildEmailHtml({
      greeting: `Halo, tim pengampu <strong>${kelasLabel}</strong>.`,
      body: `
        <p style="margin:0 0 8px 0;">
          <strong>${editor.nama_editor}</strong> (${editor.kode_dosen})
          baru saja mengubah satu atau beberapa nilai mahasiswa
          di kelas <strong>${kelasLabel}</strong>
          (${kelas.tahun_akademik} ${kelas.semester}).
        </p>
        <p style="margin:0;color:#6b7280;font-size:13px;">
          Notifikasi ini dikirim maksimal sekali per 5 menit untuk menghindari spam.
          Login ke SICPL untuk melihat detail dan riwayat input nilai.
        </p>
      `,
      ctaText: 'Buka Dashboard Dosen',
      ctaUrl: `${getDashboardUrl()}/dashboard/dosen`,
    });

    const text =
      `Tim pengampu ${kelasLabel}:\n\n` +
      `${editor.nama_editor} (${editor.kode_dosen}) baru saja mengubah ` +
      `nilai mahasiswa di kelas ini. Login ke SICPL untuk melihat detail.\n\n` +
      `${getDashboardUrl()}/dashboard/dosen`;

    await sendEmail({
      to: koPengampu.map((k) => k.email),
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('[notifyKoPengampuOnEdit] gagal:', err);
  }
}

// ── Internal: insert notifikasi in-app untuk ko-pengampu ──────────────────
async function insertNotifikasiInApp(opts: {
  koPengampu: KoPengampuRow[];
  judul: string;
  pesan: string;
  jenis: 'upload_nilai' | 'edit_nilai';
  id_kelas: number;
}): Promise<void> {
  if (opts.koPengampu.length === 0) return;
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('notifikasi').insert(
      opts.koPengampu.map((k) => ({
        id_staff: k.id_staff,
        judul: opts.judul,
        pesan: opts.pesan,
        jenis: opts.jenis,
        id_kelas: opts.id_kelas,
      })),
    );
  } catch (err) {
    console.error('[insertNotifikasiInApp] gagal:', err);
  }
}

// ── Public: notifikasi upload SIAKAD ──────────────────────────────────────
export async function notifyKoPengampuOnUpload(opts: {
  id_kelas: number;
  id_staff_editor: number;
  fileName: string;
  jumlahBerhasil: number;
  jumlahGagal: number;
  masalahDilaporkan: number;
}): Promise<void> {
  try {
    const [kelas, editor, koPengampu] = await Promise.all([
      getKelasMeta(opts.id_kelas),
      getEditorMeta(opts.id_staff_editor),
      getKoPengampu(opts.id_kelas, opts.id_staff_editor),
    ]);

    if (!kelas || !editor || koPengampu.length === 0) return;

    const kelasLabel = `${kelas.kode_mk} ${kelas.nama_mk}${kelas.kode_kelas ? ` (Kelas ${kelas.kode_kelas})` : ''
      }`;

    await insertNotifikasiInApp({
      koPengampu,
      judul: `Upload nilai — ${kelas.kode_mk} ${kelas.kode_kelas ?? ''}`.trim(),
      pesan: `${editor.nama_editor} (${editor.kode_dosen}) mengunggah nilai SIAKAD ke kelas ${kelasLabel} (${kelas.tahun_akademik} ${kelas.semester}). Berhasil: ${opts.jumlahBerhasil}, Gagal: ${opts.jumlahGagal}.`,
      jenis: 'upload_nilai',
      id_kelas: opts.id_kelas,
    });

    const subject = `[SICPL] Upload SIAKAD — ${kelas.kode_mk} ${kelas.kode_kelas ?? ''}`.trim();
    const html = buildEmailHtml({
      greeting: `Halo, tim pengampu <strong>${kelasLabel}</strong>.`,
      body: `
        <p style="margin:0 0 8px 0;">
          <strong>${editor.nama_editor}</strong> (${editor.kode_dosen})
          baru saja mengunggah nilai dari SIAKAD
          ke kelas <strong>${kelasLabel}</strong>
          (${kelas.tahun_akademik} ${kelas.semester}).
        </p>
        <ul style="margin:8px 0;padding-left:18px;color:#374151;font-size:13px;">
          <li>File: <code>${opts.fileName}</code></li>
          <li>Berhasil: <strong>${opts.jumlahBerhasil}</strong> nilai tersimpan</li>
          <li>Gagal: ${opts.jumlahGagal} baris</li>
          ${opts.masalahDilaporkan > 0
          ? `<li>Dilaporkan ke modul data bermasalah: ${opts.masalahDilaporkan} item</li>`
          : ''
        }
        </ul>
        <p style="margin:8px 0 0 0;color:#6b7280;font-size:13px;">
          Login ke SICPL untuk melihat hasil dan melakukan koreksi jika perlu.
        </p>
      `,
      ctaText: 'Buka Dashboard Dosen',
      ctaUrl: `${getDashboardUrl()}/dashboard/dosen`,
    });

    const text =
      `Tim pengampu ${kelasLabel}:\n\n` +
      `${editor.nama_editor} (${editor.kode_dosen}) mengunggah nilai SIAKAD.\n` +
      `File: ${opts.fileName}\n` +
      `Berhasil: ${opts.jumlahBerhasil}, Gagal: ${opts.jumlahGagal}` +
      (opts.masalahDilaporkan > 0 ? `, Dilaporkan: ${opts.masalahDilaporkan}` : '') +
      `\n\n${getDashboardUrl()}/dashboard/dosen`;

    await sendEmail({
      to: koPengampu.map((k) => k.email),
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('[notifyKoPengampuOnUpload] gagal:', err);
  }
}