import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pct(n: number): number {
  return Math.round(n * 10) / 10;
}

function kodeCplLabel(kode: string): string {
  return kode.toUpperCase().startsWith('CPL') ? kode : `CPL-${kode}`;
}

type Status = 'Tercapai' | 'Belum Tercapai' | 'Belum Ditempuh';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const idKelas = Number(id);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Parameter id_kelas tidak valid.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // 1) Verifikasi dosen mengampu kelas ini
    const { data: ownership } = await admin
      .from('mapping_dosen_kelas')
      .select('id_staff')
      .eq('id_kelas', idKelas)
      .eq('id_staff', user.id_staff)
      .maybeSingle();
    if (!ownership) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    // 2) Info kelas + MK + kurikulum
    const { data: kelas, error: kelasErr } = await admin
      .from('kelas_mk')
      .select(
        `id_kelas, kode_kelas, tahun_akademik, semester, id_kurikulum, id_mata_kuliah,
         mata_kuliah:id_mata_kuliah ( kode_mk, nama_mk ),
         kurikulum:id_kurikulum ( kode, nama )`,
      )
      .eq('id_kelas', idKelas)
      .maybeSingle<{
        id_kelas: number; kode_kelas: string | null; tahun_akademik: string; semester: string; id_kurikulum: number; id_mata_kuliah: number;
        mata_kuliah: { kode_mk: string; nama_mk: string };
        kurikulum: { kode: string; nama: string };
      }>();
    if (kelasErr) throw kelasErr;
    if (!kelas) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' }, { status: 404 });
    }

    // 3) Daftar CPL untuk kurikulum kelas ini
    const { data: cplRows, error: cplErr } = await admin
      .from('cpl')
      .select('id_cpl, kode_cpl, deskripsi_id, singkatan, target_minimal, urutan')
      .eq('id_kurikulum', kelas.id_kurikulum)
      .order('urutan');
    if (cplErr) throw cplErr;
    const cplList = cplRows ?? [];
    const cplIds = cplList.map((c) => c.id_cpl);

    // 4) Mahasiswa terdaftar di kelas ini
    const { data: mhsRows, error: mhsErr } = await admin
      .from('mahasiswa_kelas')
      .select('mahasiswa:id_mahasiswa ( id_mahasiswa, nim, nama_mahasiswa )')
      .eq('id_kelas', idKelas);
    if (mhsErr) throw mhsErr;
    const mahasiswaList = (mhsRows ?? [])
      .map((r: any) => ({ id_mahasiswa: r.mahasiswa.id_mahasiswa as number, nim: r.mahasiswa.nim as string, nama_mahasiswa: r.mahasiswa.nama_mahasiswa as string }))
      .sort((a, b) => (a.nim ?? '').localeCompare(b.nim ?? ''));
    const mhsIds = mahasiswaList.map((m) => m.id_mahasiswa);

    // 5) Nilai CPL — baris hadir di view berarti mahasiswa sudah punya minimal satu
    //    nilai yang mengalir ke CPL tsb (lewat CPMK -> IK). Absen = belum ditempuh.
    let nilaiCplRows: Array<{ id_mahasiswa: number; id_cpl: number; nilai_cpl: number }> = [];
    if (mhsIds.length > 0 && cplIds.length > 0) {
      const { data, error } = await admin
        .from('v_nilai_cpl_per_mhs')
        .select('id_mahasiswa, id_cpl, nilai_cpl')
        .in('id_mahasiswa', mhsIds)
        .in('id_cpl', cplIds);
      if (error) throw error;
      nilaiCplRows = data ?? [];
    }
    const nilaiMap = new Map<string, number>();
    for (const r of nilaiCplRows) nilaiMap.set(`${r.id_mahasiswa}_${r.id_cpl}`, Number(r.nilai_cpl));

    // 6) Matriks per-mahasiswa x per-CPL
    const mahasiswaDetail = mahasiswaList.map((m) => ({
      id_mahasiswa: m.id_mahasiswa,
      nim: m.nim,
      nama_mahasiswa: m.nama_mahasiswa,
      per_cpl: cplList.map((c) => {
        const nilai = nilaiMap.get(`${m.id_mahasiswa}_${c.id_cpl}`);
        const status: Status = nilai === undefined ? 'Belum Ditempuh' : nilai >= Number(c.target_minimal) ? 'Tercapai' : 'Belum Tercapai';
        return { id_cpl: c.id_cpl, kode_cpl: kodeCplLabel(c.kode_cpl), nilai: nilai !== undefined ? pct(nilai) : null, status };
      }),
    }));

    // 7) Ringkasan per-CPL untuk kelas ini
    const cplSummary = cplList.map((c) => {
      const agg = { sum: 0, count: 0 };
      let jumlahTercapai = 0;
      let jumlahBelumTercapai = 0;
      for (const m of mahasiswaList) {
        const nilai = nilaiMap.get(`${m.id_mahasiswa}_${c.id_cpl}`);
        if (nilai === undefined) continue;
        agg.sum += nilai;
        agg.count += 1;
        if (nilai >= Number(c.target_minimal)) jumlahTercapai++;
        else jumlahBelumTercapai++;
      }
      return {
        id_cpl: c.id_cpl,
        kode_cpl: kodeCplLabel(c.kode_cpl),
        deskripsi_id: c.deskripsi_id,
        target_minimal: Number(c.target_minimal),
        rata_rata: agg.count > 0 ? pct(agg.sum / agg.count) : 0,
        jumlah_tercapai: jumlahTercapai,
        jumlah_belum_tercapai: jumlahBelumTercapai,
        jumlah_belum_ditempuh: mahasiswaList.length - agg.count,
      };
    });

    // 8) Daftar CPMK milik mata kuliah kelas ini, rata-rata persis untuk kelas
    //    ini saja (v_nilai_cpmk_per_mhs punya kolom id_kelas, jadi tidak
    //    tercampur dengan kelas lain dari MK yang sama).
    const { data: cpmkRows, error: cpmkErr } = await admin
      .from('cpmk')
      .select('id_cpmk, kode_cpmk, deskripsi_id, urutan')
      .eq('id_mata_kuliah', kelas.id_mata_kuliah)
      .order('urutan');
    if (cpmkErr) throw cpmkErr;
    const cpmkList = cpmkRows ?? [];
    const cpmkIds = cpmkList.map((c) => c.id_cpmk);

    let nilaiCpmkRows: Array<{ id_mahasiswa: number; id_cpmk: number; nilai_cpmk: number }> = [];
    if (cpmkIds.length > 0) {
      const { data, error } = await admin
        .from('v_nilai_cpmk_per_mhs')
        .select('id_mahasiswa, id_cpmk, nilai_cpmk')
        .eq('id_kelas', idKelas)
        .in('id_cpmk', cpmkIds);
      if (error) throw error;
      nilaiCpmkRows = data ?? [];
    }
    const cpmkAgg = new Map<number, { sum: number; count: number }>();
    for (const r of nilaiCpmkRows) {
      const cur = cpmkAgg.get(r.id_cpmk) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.nilai_cpmk);
      cur.count += 1;
      cpmkAgg.set(r.id_cpmk, cur);
    }
    const cpmkSummary = cpmkList.map((c) => {
      const agg = cpmkAgg.get(c.id_cpmk);
      return {
        id_cpmk: c.id_cpmk,
        kode_cpmk: c.kode_cpmk,
        deskripsi_id: c.deskripsi_id,
        rata_rata: agg && agg.count > 0 ? pct(agg.sum / agg.count) : 0,
        jumlah_mahasiswa_dengan_nilai: agg?.count ?? 0,
      };
    });

    // 9) Daftar IK yang dituju oleh CPMK MK ini (lintas-MK seperti CPL,
    //    karena IK diagregasi per-mahasiswa di seluruh kuliahnya).
    type IkSummaryRow = { id_ik: number; kode_ik: string; deskripsi: string; rata_rata: number; jumlah_mahasiswa_dengan_nilai: number };
    let ikSummary: IkSummaryRow[] = [];
    if (cpmkIds.length > 0) {
      const { data: mciRows, error: mciErr } = await admin
        .from('mapping_cpmk_ik')
        .select('id_ik')
        .in('id_cpmk', cpmkIds);
      if (mciErr) throw mciErr;
      const ikIds = Array.from(new Set((mciRows ?? []).map((r) => r.id_ik)));

      if (ikIds.length > 0) {
        const { data: ikRows, error: ikErr } = await admin
          .from('indikator_kinerja')
          .select('id_ik, kode_ik, deskripsi, urutan')
          .in('id_ik', ikIds)
          .order('urutan');
        if (ikErr) throw ikErr;

        let nilaiIkRows: Array<{ id_mahasiswa: number; id_ik: number; nilai_ik: number }> = [];
        if (mhsIds.length > 0) {
          const { data, error } = await admin
            .from('v_nilai_ik_per_mhs')
            .select('id_mahasiswa, id_ik, nilai_ik')
            .in('id_mahasiswa', mhsIds)
            .in('id_ik', ikIds);
          if (error) throw error;
          nilaiIkRows = data ?? [];
        }
        const ikAgg = new Map<number, { sum: number; count: number }>();
        for (const r of nilaiIkRows) {
          const cur = ikAgg.get(r.id_ik) ?? { sum: 0, count: 0 };
          cur.sum += Number(r.nilai_ik);
          cur.count += 1;
          ikAgg.set(r.id_ik, cur);
        }
        ikSummary = (ikRows ?? []).map((ik) => {
          const agg = ikAgg.get(ik.id_ik);
          return {
            id_ik: ik.id_ik,
            kode_ik: ik.kode_ik,
            deskripsi: ik.deskripsi,
            rata_rata: agg && agg.count > 0 ? pct(agg.sum / agg.count) : 0,
            jumlah_mahasiswa_dengan_nilai: agg?.count ?? 0,
          };
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        kelas: {
          kode_mk: kelas.mata_kuliah.kode_mk,
          nama_mk: kelas.mata_kuliah.nama_mk,
          kode_kelas: kelas.kode_kelas,
          tahun_akademik: kelas.tahun_akademik,
          semester: kelas.semester,
          kode_kurikulum: kelas.kurikulum.kode,
        },
        total_mahasiswa: mahasiswaList.length,
        cpmk_summary: cpmkSummary,
        ik_summary: ikSummary,
        cpl_summary: cplSummary,
        mahasiswa: mahasiswaDetail,
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[GET /api/dosen/kelas/[id]/capaian-cpl]', err);
    return serverError('Gagal memuat capaian CPL kelas.');
  }
}
