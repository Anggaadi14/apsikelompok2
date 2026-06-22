import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';

/* ============================================================
   /api/admin/kelas
     GET  -> daftar kelas tayang + ringkasan (MK, TA, jml dosen/mhs)
     POST -> buat kelas baru (id_mk, id_kurikulum, id_tahun_akademik,
             kode_kelas, kuota?). tahun_akademik+semester di-derive
             dari tabel tahun_akademik untuk kompatibel kolom lama.
   ============================================================ */

const SEMESTER_ORDER: Record<string, number> = { Ganjil: 0, Genap: 1, Pendek: 2 };

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const admin = createSupabaseAdminClient();

    const [{ data: kelasRows, error: kelasErr }, { data: dosenList }, { data: mkList }, { data: kurikulumList }, { data: taList }] = await Promise.all([
      admin
        .from('kelas_mk')
        .select(
          `id_kelas, kode_kelas, kuota, tahun_akademik, semester, id_tahun_akademik,
           tahun_akademik_ref:id_tahun_akademik ( kode, label, is_active, semester, tahun_mulai ),
           mata_kuliah:id_mata_kuliah ( id_mata_kuliah, kode_mk, nama_mk, sks ),
           kurikulum:id_kurikulum ( id_kurikulum, kode, nama )`,
        ),
      admin.from('staff').select('id_staff, nama_lengkap, email_sso, nip_nidn_nik, peran').in('peran', ['dosen', 'kaprodi']).order('nama_lengkap'),
      admin.from('mata_kuliah').select('id_mata_kuliah, kode_mk, nama_mk, sks').order('kode_mk'),
      admin.from('kurikulum').select('id_kurikulum, kode, nama, is_active').order('tahun_mulai', { ascending: false }),
      admin.from('tahun_akademik').select('id_tahun_akademik, kode, tahun_mulai, tahun_selesai, semester, label, is_active'),
    ]);
    if (kelasErr) throw kelasErr;

    const kelasIds = (kelasRows ?? []).map((k: any) => k.id_kelas);
    const dosenCounts = new Map<number, number>();
    const mhsCounts = new Map<number, number>();
    if (kelasIds.length) {
      const { data: md } = await admin.from('mapping_dosen_kelas').select('id_kelas').in('id_kelas', kelasIds);
      for (const r of md ?? []) dosenCounts.set(r.id_kelas, (dosenCounts.get(r.id_kelas) ?? 0) + 1);
      const { data: mk2 } = await admin.from('mahasiswa_kelas').select('id_kelas').in('id_kelas', kelasIds);
      for (const r of mk2 ?? []) mhsCounts.set(r.id_kelas, (mhsCounts.get(r.id_kelas) ?? 0) + 1);
    }

    const items = (kelasRows ?? [])
      .map((k: any) => ({
        id_kelas: k.id_kelas,
        kode_kelas: k.kode_kelas,
        kuota: k.kuota,
        ta_legacy: k.tahun_akademik,
        sem_legacy: k.semester,
        id_tahun_akademik: k.id_tahun_akademik,
        ta_kode: k.tahun_akademik_ref?.kode ?? null,
        ta_label: k.tahun_akademik_ref?.label ?? null,
        ta_is_active: k.tahun_akademik_ref?.is_active ?? null,
        ta_semester: k.tahun_akademik_ref?.semester ?? null,
        id_mata_kuliah: k.mata_kuliah?.id_mata_kuliah,
        kode_mk: k.mata_kuliah?.kode_mk,
        nama_mk: k.mata_kuliah?.nama_mk,
        sks: k.mata_kuliah?.sks,
        id_kurikulum: k.kurikulum?.id_kurikulum,
        kode_kurikulum: k.kurikulum?.kode,
        nama_kurikulum: k.kurikulum?.nama,
        jml_dosen: dosenCounts.get(k.id_kelas) ?? 0,
        jml_mahasiswa: mhsCounts.get(k.id_kelas) ?? 0,
        _tahun: k.tahun_akademik_ref?.tahun_mulai ?? 0,
        _sem: SEMESTER_ORDER[k.tahun_akademik_ref?.semester ?? k.semester] ?? 0,
      }))
      .sort((a: any, b: any) => b._tahun - a._tahun || a._sem - b._sem || (a.kode_mk ?? '').localeCompare(b.kode_mk ?? '') || (a.kode_kelas ?? '').localeCompare(b.kode_kelas ?? ''))
      .map(({ _tahun, _sem, ...rest }: any) => rest);

    return NextResponse.json({
      success: true,
      data: { items, options: { dosen: dosenList, mata_kuliah: mkList, kurikulum: kurikulumList, tahun_akademik: taList } },
    });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/kelas]', err);
    return serverError('Gagal memuat data kelas tayang.');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const id_mata_kuliah = Number(body.id_mata_kuliah);
    const id_kurikulum = Number(body.id_kurikulum);
    const id_tahun_akademik = Number(body.id_tahun_akademik);
    const kode_kelas = String(body.kode_kelas ?? '').trim().toUpperCase();
    const kuotaRaw = body.kuota;
    const kuota = kuotaRaw === null || kuotaRaw === undefined || kuotaRaw === '' ? null : Number(kuotaRaw);

    if (!Number.isInteger(id_mata_kuliah) || id_mata_kuliah <= 0) return bad('Mata Kuliah wajib dipilih.');
    if (!Number.isInteger(id_kurikulum) || id_kurikulum <= 0) return bad('Kurikulum wajib dipilih.');
    if (!Number.isInteger(id_tahun_akademik) || id_tahun_akademik <= 0) return bad('Tahun Akademik wajib dipilih.');
    if (!kode_kelas) return bad('Kode kelas wajib diisi (mis. A, B, C).');
    if (kode_kelas.length > 5) return bad('Kode kelas maksimal 5 karakter.');
    if (kuota !== null && (!Number.isFinite(kuota) || kuota < 0)) return bad('Kuota tidak valid.');

    const admin = createSupabaseAdminClient();

    const { data: ta } = await admin.from('tahun_akademik').select('tahun_mulai, tahun_selesai, semester').eq('id_tahun_akademik', id_tahun_akademik).maybeSingle();
    if (!ta) return bad('Tahun Akademik tidak ditemukan.');
    if (ta.semester === 'Pendek') return bad('Tahun Akademik berjenis "Pendek" belum didukung untuk kelas tayang.');
    const ta_string = `${ta.tahun_mulai}/${ta.tahun_selesai}`;

    const { data: linked } = await admin.from('kurikulum_mk').select('id_kurikulum').eq('id_kurikulum', id_kurikulum).eq('id_mata_kuliah', id_mata_kuliah).maybeSingle();
    if (!linked) return bad('Mata Kuliah ini belum terhubung ke Kurikulum yang dipilih.');

    const { data: ins, error: insErr } = await admin
      .from('kelas_mk')
      .insert({ id_mata_kuliah, id_kurikulum, tahun_akademik: ta_string, semester: ta.semester, kode_kelas, kuota, id_tahun_akademik })
      .select('id_kelas')
      .single();
    if (insErr) {
      if (insErr.code === '23505') {
        return NextResponse.json({ success: false, error: 'DUPLICATE', message: 'Kombinasi MK + TA + Semester + Kode Kelas sudah ada.' }, { status: 409 });
      }
      throw insErr;
    }
    return NextResponse.json({ success: true, data: { id_kelas: ins.id_kelas } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/kelas]', err);
    return serverError('Gagal membuat kelas tayang.');
  }
}

function bad(message: string) {
  return NextResponse.json({ success: false, error: 'BAD_REQUEST', message }, { status: 400 });
}
