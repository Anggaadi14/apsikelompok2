import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id_kelas: string }> }) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const { id_kelas } = await ctx.params;
    const idKelas = Number(id_kelas);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: ownership } = await admin.from('mapping_dosen_kelas').select('id_staff').eq('id_kelas', idKelas).eq('id_staff', user.id_staff).maybeSingle();
    if (!ownership) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    const { data, error } = await admin
      .from('nilai_detail')
      .select(
        `id_nilai, id_mahasiswa, id_komponen, nilai_asli, nilai_remedi, catatan, diinput_at, diupdate_at,
         mahasiswa:id_mahasiswa ( nim, nama_mahasiswa ),
         komponen_nilai:id_komponen ( kode_media, nama_media, urutan )`,
      )
      .eq('id_kelas', idKelas);
    if (error) throw error;

    const rows = (data ?? [])
      .map((r: any) => ({
        id_nilai: r.id_nilai,
        id_mahasiswa: r.id_mahasiswa,
        id_komponen: r.id_komponen,
        nilai_asli: r.nilai_asli,
        nilai_remedi: r.nilai_remedi,
        catatan: r.catatan,
        diinput_at: r.diinput_at,
        diupdate_at: r.diupdate_at,
        nim: r.mahasiswa?.nim,
        nama_mahasiswa: r.mahasiswa?.nama_mahasiswa,
        kode_media: r.komponen_nilai?.kode_media,
        nama_media: r.komponen_nilai?.nama_media,
        _urutan: r.komponen_nilai?.urutan ?? 0,
      }))
      .sort((a: any, b: any) => (a.nim ?? '').localeCompare(b.nim ?? '') || a._urutan - b._urutan || (a.kode_media ?? '').localeCompare(b.kode_media ?? ''))
      .map(({ _urutan, ...rest }: any) => rest);

    return NextResponse.json({ success: true, data: { nilai: rows, total: rows.length } });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/nilai/[id_kelas]]', err);
    return serverError('Gagal memuat nilai kelas.');
  }
}

// PATCH: upsert satu sel nilai (manual edit dari tabel nilai)
// URL segment dipakai sebagai id_kelas; body berisi id_mahasiswa, id_komponen, field, value
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id_kelas: string }> }) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const { id_kelas } = await ctx.params;
    const idKelas = Number(id_kelas);

    const body = await req.json().catch(() => ({}));
    const idMahasiswa = Number(body.id_mahasiswa);
    const idKomponen = Number(body.id_komponen);
    const field = body.field as string;
    const value: number | null = body.value === null ? null : Number(body.value);

    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json({ success: false, message: 'id_kelas tidak valid.' }, { status: 400 });
    }
    if (!Number.isInteger(idMahasiswa) || idMahasiswa <= 0) {
      return NextResponse.json({ success: false, message: 'id_mahasiswa tidak valid.' }, { status: 400 });
    }
    if (!Number.isInteger(idKomponen) || idKomponen <= 0) {
      return NextResponse.json({ success: false, message: 'id_komponen tidak valid.' }, { status: 400 });
    }
    if (field !== 'nilai_asli' && field !== 'nilai_remedi') {
      return NextResponse.json({ success: false, message: 'field harus nilai_asli atau nilai_remedi.' }, { status: 400 });
    }
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      return NextResponse.json({ success: false, message: 'value harus angka 0–100 atau null.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: ownership } = await admin
      .from('mapping_dosen_kelas')
      .select('id_staff')
      .eq('id_kelas', idKelas)
      .eq('id_staff', user.id_staff)
      .maybeSingle();
    if (!ownership) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    // Check existing record
    const { data: existing } = await admin
      .from('nilai_detail')
      .select('id_nilai')
      .eq('id_mahasiswa', idMahasiswa)
      .eq('id_komponen', idKomponen)
      .eq('id_kelas', idKelas)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from('nilai_detail')
        .update({ [field]: value, diinput_oleh_staff: user.id_staff })
        .eq('id_nilai', existing.id_nilai);
      if (error) throw error;
    } else if (value !== null) {
      const { error } = await admin
        .from('nilai_detail')
        .insert({ id_mahasiswa: idMahasiswa, id_komponen: idKomponen, id_kelas: idKelas, [field]: value, diinput_oleh_staff: user.id_staff });
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Nilai tersimpan.' });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[PATCH /api/dosen/nilai/[id_kelas]]', err);
    return serverError('Gagal menyimpan nilai.');
  }
}
