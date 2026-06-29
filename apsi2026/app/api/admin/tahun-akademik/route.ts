import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/tahun-akademik
   GET   -> list semua TA (urut terbaru -> lama)
   POST  -> tambah TA baru   { tahun_mulai, semester, label?, set_active? }
   PATCH -> ubah TA          { id_tahun_akademik, label?, set_active? }
   Catatan: kalau set_active = true, otomatis non-aktifkan TA lain (1 berjalan).
   ============================================================ */

const SEMESTERS = ['Ganjil', 'Genap', 'Pendek'] as const;
type SemesterVal = typeof SEMESTERS[number];
const SEMESTER_ORDER: Record<string, number> = { Ganjil: 0, Genap: 1, Pendek: 2 };

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('tahun_akademik')
      .select('id_tahun_akademik, kode, tahun_mulai, tahun_selesai, semester, label, is_active, created_at');
    if (error) throw error;

    const sorted = (data ?? []).sort(
      (a, b) => b.tahun_mulai - a.tahun_mulai || SEMESTER_ORDER[a.semester] - SEMESTER_ORDER[b.semester],
    );
    return NextResponse.json({ success: true, data: sorted });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[API] GET /api/admin/tahun-akademik', err);
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal memuat Tahun Akademik.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const tahunMulai = Number(body.tahun_mulai);
    const semester = String(body.semester ?? '') as SemesterVal;
    const label = body.label ? String(body.label).trim() : null;
    const setActive = !!body.set_active;
    if (!Number.isInteger(tahunMulai) || tahunMulai < 2000 || tahunMulai > 2100) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'tahun_mulai harus tahun yang valid (2000-2100).' }, { status: 400 });
    }
    if (!SEMESTERS.includes(semester)) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'semester harus Ganjil/Genap/Pendek.' }, { status: 400 });
    }
    const tahunSelesai = tahunMulai + 1;
    const kode = `${tahunMulai}/${tahunSelesai}-${semester}`;

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin.from('tahun_akademik').select('id_tahun_akademik, label, is_active').eq('kode', kode).maybeSingle();

    if (existing) {
      const { error: updErr } = await admin
        .from('tahun_akademik')
        .update({ label: label ?? existing.label, is_active: setActive || existing.is_active })
        .eq('id_tahun_akademik', existing.id_tahun_akademik);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await admin
        .from('tahun_akademik')
        .insert({ kode, tahun_mulai: tahunMulai, tahun_selesai: tahunSelesai, semester, label, is_active: setActive });
      if (insErr) throw insErr;
    }

    // Deactivate others only after the upsert succeeds
    if (setActive) {
      await admin.from('tahun_akademik').update({ is_active: false }).eq('is_active', true).neq('kode', kode);
    }

    return NextResponse.json({ success: true, message: 'Tahun Akademik tersimpan.', data: { kode } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[API] POST /api/admin/tahun-akademik', err);
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal menyimpan Tahun Akademik.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id_tahun_akademik);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_tahun_akademik tidak valid.' }, { status: 400 });
    }
    const hasLabel = Object.prototype.hasOwnProperty.call(body, 'label');
    const label: string | null = hasLabel ? (body.label === null ? null : String(body.label).trim()) : null;
    const setActive: boolean | undefined = body.set_active === undefined ? undefined : !!body.set_active;

    const admin = createSupabaseAdminClient();

    if (setActive === true) {
      await admin.from('tahun_akademik').update({ is_active: false }).eq('is_active', true).neq('id_tahun_akademik', id);
      await admin.from('tahun_akademik').update({ is_active: true }).eq('id_tahun_akademik', id);
    } else if (setActive === false) {
      await admin.from('tahun_akademik').update({ is_active: false }).eq('id_tahun_akademik', id);
    }
    if (hasLabel) {
      await admin.from('tahun_akademik').update({ label }).eq('id_tahun_akademik', id);
    }

    return NextResponse.json({ success: true, message: 'Tahun Akademik diperbarui.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[API] PATCH /api/admin/tahun-akademik', err);
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'Gagal memperbarui Tahun Akademik.' }, { status: 500 });
  }
}
