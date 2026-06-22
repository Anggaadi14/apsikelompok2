import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, handleAuthError, serverError, AuthError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';
import { resolveKurikulumId } from '@/app/lib/kurikulum';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/transkrip/[id_mahasiswa]
 * Mengembalikan data lengkap untuk Transkrip OBE seorang mahasiswa.
 *
 * Akses:
 *  - mahasiswa: hanya boleh akses transkrip dirinya sendiri (id_mahasiswa cocok session).
 *  - dosen, kaprodi, jamu, admin: boleh akses semua mahasiswa.
 */
export async function GET(req: NextRequest, ctx: any) {
  try {
    const session = await getSessionUser(req);
    const params = await ctx?.params;
    const idMhsRaw = (params?.id_mahasiswa ?? '').toString();
    const idMhs = Number(idMhsRaw);
    if (!Number.isInteger(idMhs) || idMhs <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_ID', message: 'ID mahasiswa tidak valid.' }, { status: 400 });
    }

    if (session.role === 'mahasiswa' && Number(session.id_mahasiswa) !== idMhs) {
      throw new AuthError('FORBIDDEN', 403, 'Anda hanya bisa melihat transkrip Anda sendiri.');
    }
    if (!['mahasiswa', 'dosen', 'kaprodi', 'jamu', 'admin'].includes(String(session.role))) {
      throw new AuthError('FORBIDDEN', 403, 'Role tidak diizinkan.');
    }

    const admin = createSupabaseAdminClient();

    const { data: mhs, error: mhsErr } = await admin
      .from('mahasiswa')
      .select('id_mahasiswa, nim, nama_mahasiswa, email_sso, angkatan')
      .eq('id_mahasiswa', idMhs)
      .maybeSingle();
    if (mhsErr) throw mhsErr;
    if (!mhs) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'Mahasiswa tidak ditemukan.' }, { status: 404 });
    }

    const idKurikulum = await resolveKurikulumId(admin, mhs.angkatan ?? null);
    if (!idKurikulum) {
      return NextResponse.json({ success: false, error: 'NO_KURIKULUM', message: 'Tidak ada kurikulum aktif untuk angkatan ini.' }, { status: 404 });
    }
    const { data: kur } = await admin
      .from('kurikulum')
      .select('id_kurikulum, kode, nama, tahun_mulai, tahun_selesai')
      .eq('id_kurikulum', idKurikulum)
      .single();

    // CPL — semua CPL kurikulum + nilai dari view (LEFT JOIN semantics: ambil
    // semua CPL dulu, lalu tempel nilai kalau ada).
    const { data: cplRows, error: cplErr } = await admin
      .from('cpl')
      .select('id_cpl, kode_cpl, singkatan, domain, deskripsi_id, urutan')
      .eq('id_kurikulum', idKurikulum)
      .order('urutan');
    if (cplErr) throw cplErr;

    const cplIds = (cplRows ?? []).map((c) => c.id_cpl);
    const { data: nilaiCplRows } = cplIds.length
      ? await admin.from('v_nilai_cpl_per_mhs').select('id_cpl, nilai_cpl').eq('id_mahasiswa', idMhs).in('id_cpl', cplIds)
      : { data: [] as { id_cpl: number; nilai_cpl: number }[] };
    const nilaiCplMap = new Map((nilaiCplRows ?? []).map((r) => [r.id_cpl, Number(r.nilai_cpl)]));

    // IK per CPL + bobot + nilai
    const { data: ikMapRows } = cplIds.length
      ? await admin
          .from('mapping_ik_cpl')
          .select('id_ik, id_cpl, bobot_persen, indikator_kinerja:id_ik ( kode_ik, deskripsi, urutan )')
          .in('id_cpl', cplIds)
      : { data: [] as any[] };

    const ikIds = (ikMapRows ?? []).map((r: any) => r.id_ik);
    const { data: nilaiIkRows } = ikIds.length
      ? await admin.from('v_nilai_ik_per_mhs').select('id_ik, nilai_ik').eq('id_mahasiswa', idMhs).in('id_ik', ikIds)
      : { data: [] as { id_ik: number; nilai_ik: number }[] };
    const nilaiIkMap = new Map((nilaiIkRows ?? []).map((r) => [r.id_ik, Number(r.nilai_ik)]));

    const THRESHOLD = 65;
    const cplWithNilai = (cplRows ?? []).filter((r) => nilaiCplMap.has(r.id_cpl));
    const tercapai = cplWithNilai.filter((r) => (nilaiCplMap.get(r.id_cpl) ?? 0) >= THRESHOLD).length;

    return NextResponse.json({
      success: true,
      data: {
        mahasiswa: {
          id_mahasiswa: mhs.id_mahasiswa,
          nim: mhs.nim,
          nama: mhs.nama_mahasiswa,
          email_sso: mhs.email_sso,
          angkatan: mhs.angkatan,
        },
        kurikulum: kur,
        cpl: (cplRows ?? []).map((r) => {
          const nilai = nilaiCplMap.get(r.id_cpl) ?? null;
          return {
            id_cpl: r.id_cpl,
            kode_cpl: r.kode_cpl,
            singkatan: r.singkatan,
            domain: r.domain,
            deskripsi: r.deskripsi_id,
            nilai_cpl: nilai,
            status: nilai === null ? 'belum_dinilai' : nilai >= THRESHOLD ? 'tercapai' : 'belum_tercapai',
          };
        }),
        ik: (ikMapRows ?? []).map((r: any) => ({
          id_ik: r.id_ik,
          kode_ik: r.indikator_kinerja.kode_ik,
          deskripsi: r.indikator_kinerja.deskripsi,
          id_cpl: r.id_cpl,
          bobot_persen: r.bobot_persen !== null ? Number(r.bobot_persen) : null,
          nilai_ik: nilaiIkMap.get(r.id_ik) ?? null,
        })),
        summary: {
          threshold: THRESHOLD,
          total_cpl: (cplRows ?? []).length,
          dinilai: cplWithNilai.length,
          tercapai,
          belum_tercapai: cplWithNilai.length - tercapai,
        },
      },
    });
  } catch (err: any) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/transkrip/[id_mahasiswa]]', err);
    return serverError(err?.message || 'Gagal memuat transkrip.');
  }
}
