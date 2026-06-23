import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('notifikasi')
      .select('id_notifikasi, judul, pesan, jenis, id_kelas, is_read, created_at')
      .eq('id_staff', user.id_staff)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;

    const items = data ?? [];
    const unread_count = items.filter((n) => !n.is_read).length;

    return NextResponse.json({ success: true, data: { items, unread_count } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/dosen/notifikasi]', err);
    return serverError('Gagal memuat notifikasi.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const admin = createSupabaseAdminClient();

    if (body?.mark_all) {
      const { error } = await admin
        .from('notifikasi')
        .update({ is_read: true })
        .eq('id_staff', user.id_staff)
        .eq('is_read', false);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
    }

    const id_notifikasi = Number(body?.id_notifikasi);
    if (!Number.isInteger(id_notifikasi) || id_notifikasi <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'id_notifikasi tidak valid.' }, { status: 400 });
    }
    const { error } = await admin
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id_notifikasi', id_notifikasi)
      .eq('id_staff', user.id_staff);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PATCH /api/dosen/notifikasi]', err);
    return serverError('Gagal memperbarui notifikasi.');
  }
}
