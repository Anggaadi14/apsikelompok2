import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/dosen/mapping-cpmk-ik/[id_kelas]

   GET  -> data lengkap untuk panel mapping:
           - kelas/MK info + apakah evaluator
           - daftar CPMK MK ybs
           - daftar IK dikelompokkan per CPL (dari kurikulum kelas)
           - existing mappings (pasangan id_cpmk + id_ik)

   PUT  -> simpan ulang mapping per CPMK:
           body: { items: [{ id_cpmk, id_ik_list: number[] }] }
           untuk setiap id_cpmk di payload -> DELETE existing rows lalu INSERT.
           bobot_persen di-set 0 (engine v_nilai_ik tidak memakai bobot).
   ============================================================ */

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

    const { data: own } = await admin.from('mapping_dosen_kelas').select('peran_di_kelas').eq('id_kelas', idKelas).eq('id_staff', user.id_staff).maybeSingle<{ peran_di_kelas: 'koordinator' | 'anggota' }>();
    if (!own) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    const { data: kelas, error: kelasErr } = await admin
      .from('kelas_mk')
      .select(
        `id_kelas, kode_kelas, tahun_akademik, semester,
         mata_kuliah:id_mata_kuliah ( id_mata_kuliah, kode_mk, nama_mk, singkatan, is_evaluator ),
         kurikulum:id_kurikulum ( id_kurikulum, kode, nama )`,
      )
      .eq('id_kelas', idKelas)
      .maybeSingle();
    if (kelasErr) throw kelasErr;
    if (!kelas) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' }, { status: 404 });
    }
    const idMk = (kelas as any).mata_kuliah.id_mata_kuliah;
    const idKurikulum = (kelas as any).kurikulum.id_kurikulum;

    const { data: cpmk } = await admin.from('cpmk').select('id_cpmk, kode_cpmk, deskripsi_id, deskripsi_en, urutan').eq('id_mata_kuliah', idMk).order('urutan').order('kode_cpmk');

    const { data: cpl } = await admin.from('cpl').select('id_cpl, kode_cpl, singkatan, domain, deskripsi_id, deskripsi_en, urutan').eq('id_kurikulum', idKurikulum).order('urutan').order('kode_cpl');
    const { data: ik } = await admin
      .from('indikator_kinerja')
      .select('id_ik, id_cpl, kode_ik, deskripsi, deskripsi_en, urutan')
      .in('id_cpl', (cpl ?? []).map((c) => c.id_cpl))
      .order('urutan')
      .order('kode_ik');

    const idCpmkList = (cpmk ?? []).map((c) => c.id_cpmk);
    const { data: mappings } = idCpmkList.length
      ? await admin.from('mapping_cpmk_ik').select('id_cpmk, id_ik').in('id_cpmk', idCpmkList)
      : { data: [] as Array<{ id_cpmk: number; id_ik: number }> };

    return NextResponse.json({
      success: true,
      data: {
        kelas,
        is_evaluator: (kelas as any).mata_kuliah.is_evaluator === true,
        peran_dosen_login: own.peran_di_kelas,
        cpmk_list: cpmk,
        cpl_list: cpl,
        ik_list: ik,
        existing_mappings: mappings,
      },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/dosen/mapping-cpmk-ik/[id_kelas]]', err);
    return serverError('Gagal memuat data mapping CPMK-IK.');
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id_kelas: string }> }) {
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

    const { data: own } = await admin.from('mapping_dosen_kelas').select('id_staff').eq('id_kelas', idKelas).eq('id_staff', user.id_staff).maybeSingle();
    if (!own) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Body "items" wajib berupa array.' }, { status: 400 });
    }

    const { data: kInfo } = await admin
      .from('kelas_mk')
      .select('mata_kuliah:id_mata_kuliah ( id_mata_kuliah ), kurikulum:id_kurikulum ( id_kurikulum )')
      .eq('id_kelas', idKelas)
      .maybeSingle();
    if (!kInfo) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' }, { status: 404 });
    }
    const idMk = (kInfo as any).mata_kuliah.id_mata_kuliah;
    const idKur = (kInfo as any).kurikulum.id_kurikulum;

    const { data: cpmkRows } = await admin.from('cpmk').select('id_cpmk').eq('id_mata_kuliah', idMk);
    const allowedCpmk = new Set((cpmkRows ?? []).map((r) => r.id_cpmk));

    const { data: cplRows } = await admin.from('cpl').select('id_cpl').eq('id_kurikulum', idKur);
    const { data: ikRows } = await admin.from('indikator_kinerja').select('id_ik').in('id_cpl', (cplRows ?? []).map((c) => c.id_cpl));
    const allowedIk = new Set((ikRows ?? []).map((r) => r.id_ik));

    let totalDeleted = 0;
    let totalInserted = 0;
    const skipped: Array<{ id_cpmk: number; alasan: string }> = [];

    for (const it of items) {
      const idCpmk = Number(it?.id_cpmk);
      const ikListRaw = Array.isArray(it?.id_ik_list) ? it.id_ik_list : [];
      if (!Number.isInteger(idCpmk) || !allowedCpmk.has(idCpmk)) {
        skipped.push({ id_cpmk: idCpmk, alasan: 'CPMK bukan milik MK kelas ini' });
        continue;
      }
      const ikValid: number[] = [];
      for (const v of ikListRaw) {
        const n = Number(v);
        if (Number.isInteger(n) && allowedIk.has(n) && !ikValid.includes(n)) ikValid.push(n);
      }

      const { count } = await admin.from('mapping_cpmk_ik').select('id_ik', { count: 'exact', head: true }).eq('id_cpmk', idCpmk);
      totalDeleted += count ?? 0;
      await admin.from('mapping_cpmk_ik').delete().eq('id_cpmk', idCpmk);

      if (ikValid.length > 0) {
        const { error: insErr } = await admin.from('mapping_cpmk_ik').insert(ikValid.map((idIk) => ({ id_cpmk: idCpmk, id_ik: idIk, bobot_persen: 0 })));
        if (!insErr) totalInserted += ikValid.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mapping CPMK-IK tersimpan.',
      data: { jumlah_hapus_lama: totalDeleted, jumlah_simpan_baru: totalInserted, lewat: skipped },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[PUT /api/dosen/mapping-cpmk-ik/[id_kelas]]', err);
    return serverError('Gagal menyimpan mapping CPMK-IK.');
  }
}
