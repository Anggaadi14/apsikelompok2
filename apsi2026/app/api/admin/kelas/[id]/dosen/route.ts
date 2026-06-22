import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/kelas/[id]/dosen
     GET    -> daftar pengampu kelas
     POST   -> assign / update peran (UPSERT). Auto-demote koordinator lama.
               body: { id_staff, peran_di_kelas: 'koordinator'|'anggota' }
     DELETE -> remove dosen dari kelas. body: { id_staff }
   ============================================================ */

const PERAN_ORDER: Record<string, number> = { koordinator: 0, anggota: 1 };

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('mapping_dosen_kelas')
      .select('id_staff, peran_di_kelas, staff:id_staff ( nama_lengkap, email_sso, nip_nidn_nik, peran )')
      .eq('id_kelas', idKelas);
    if (error) throw error;

    const items = (data ?? [])
      .map((r: any) => ({
        id_staff: r.id_staff,
        peran_di_kelas: r.peran_di_kelas,
        nama_lengkap: r.staff?.nama_lengkap,
        email_sso: r.staff?.email_sso,
        nip_nidn_nik: r.staff?.nip_nidn_nik,
        peran: r.staff?.peran,
      }))
      .sort((a: any, b: any) => PERAN_ORDER[a.peran_di_kelas] - PERAN_ORDER[b.peran_di_kelas] || (a.nama_lengkap ?? '').localeCompare(b.nama_lengkap ?? ''));

    return NextResponse.json({ success: true, data: { items } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/kelas/[id]/dosen]', err);
    return serverError('Gagal memuat pengampu kelas.');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const id_staff = Number(body.id_staff);
    const peran = String(body.peran_di_kelas ?? 'anggota').toLowerCase();
    if (!Number.isInteger(id_staff) || id_staff <= 0) return bad('id_staff tidak valid.');
    if (peran !== 'koordinator' && peran !== 'anggota') return bad('peran_di_kelas harus "koordinator" atau "anggota".');

    const admin = createSupabaseAdminClient();
    const { data: ok } = await admin.from('staff').select('id_staff').eq('id_staff', id_staff).in('peran', ['dosen', 'kaprodi']).maybeSingle();
    if (!ok) return bad('Staff yang dipilih bukan dosen/kaprodi.');

    if (peran === 'koordinator') {
      await admin.from('mapping_dosen_kelas').update({ peran_di_kelas: 'anggota' }).eq('id_kelas', idKelas).eq('peran_di_kelas', 'koordinator').neq('id_staff', id_staff);
    }
    const { error } = await admin.from('mapping_dosen_kelas').upsert({ id_kelas: idKelas, id_staff, peran_di_kelas: peran }, { onConflict: 'id_kelas,id_staff' });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/kelas/[id]/dosen]', err);
    return serverError('Gagal menyimpan pengampu.');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) return bad('id kelas tidak valid.');

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const id_staff = Number(body.id_staff);
    if (!Number.isInteger(id_staff) || id_staff <= 0) return bad('id_staff tidak valid.');

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('mapping_dosen_kelas').delete().eq('id_kelas', idKelas).eq('id_staff', id_staff);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[DELETE /api/admin/kelas/[id]/dosen]', err);
    return serverError('Gagal menghapus pengampu.');
  }
}

function bad(message: string) {
  return NextResponse.json({ success: false, error: 'BAD_REQUEST', message }, { status: 400 });
}
