import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';

/* ============================================================
   /api/admin/kelas
     GET  -> daftar kelas tayang + ringkasan (MK, TA, jml dosen/mhs)
     POST -> buat kelas baru (id_mk, id_kurikulum, id_tahun_akademik,
             kode_kelas, kuota?). tahun_akademik+semester di-derive
             dari tabel tahun_akademik untuk kompatibel kolom lama.
   ============================================================ */

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);

    const [items, dosenList, mkList, kurikulumList, taList] = await Promise.all([
      query(
        `SELECT k.id_kelas, k.kode_kelas, k.kuota,
                k.tahun_akademik AS ta_legacy, k.semester AS sem_legacy,
                k.id_tahun_akademik,
                ta.kode AS ta_kode, ta.label AS ta_label, ta.is_active AS ta_is_active,
                ta.semester AS ta_semester,
                mk.id_mata_kuliah, mk.kode_mk, mk.nama_mk, mk.sks,
                kur.id_kurikulum, kur.kode AS kode_kurikulum, kur.nama AS nama_kurikulum,
                (SELECT COUNT(*) FROM mapping_dosen_kelas md WHERE md.id_kelas = k.id_kelas) AS jml_dosen,
                (SELECT COUNT(*) FROM mahasiswa_kelas mk2 WHERE mk2.id_kelas = k.id_kelas) AS jml_mahasiswa
         FROM kelas_mk k
         JOIN mata_kuliah mk ON mk.id_mata_kuliah = k.id_mata_kuliah
         JOIN kurikulum kur ON kur.id_kurikulum = k.id_kurikulum
         LEFT JOIN tahun_akademik ta ON ta.id_tahun_akademik = k.id_tahun_akademik
         ORDER BY COALESCE(ta.tahun_mulai, 0) DESC,
                  FIELD(COALESCE(ta.semester, k.semester),'Ganjil','Genap','Pendek'),
                  mk.kode_mk, k.kode_kelas`,
      ),
      query(
        `SELECT id_staff, nama_lengkap, email_sso, nip_nidn_nik, peran
         FROM staff WHERE peran IN ('dosen','kaprodi') ORDER BY nama_lengkap`,
      ),
      query(`SELECT id_mata_kuliah, kode_mk, nama_mk, sks FROM mata_kuliah ORDER BY kode_mk`),
      query(`SELECT id_kurikulum, kode, nama, is_active FROM kurikulum ORDER BY tahun_mulai DESC`),
      query(
        `SELECT id_tahun_akademik, kode, tahun_mulai, tahun_selesai, semester, label, is_active
         FROM tahun_akademik
         ORDER BY tahun_mulai DESC, FIELD(semester,'Ganjil','Genap','Pendek')`,
      ),
    ]);

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

    const taRows = (await query(
      `SELECT tahun_mulai, tahun_selesai, semester FROM tahun_akademik WHERE id_tahun_akademik = ? LIMIT 1`,
      [id_tahun_akademik],
    )) as Array<{ tahun_mulai: number; tahun_selesai: number; semester: 'Ganjil'|'Genap'|'Pendek' }>;
    if (taRows.length === 0) return bad('Tahun Akademik tidak ditemukan.');
    const ta = taRows[0];
    if (ta.semester === 'Pendek')
      return bad('Tahun Akademik berjenis "Pendek" belum didukung untuk kelas tayang.');
    const ta_string = `${ta.tahun_mulai}/${ta.tahun_selesai}`;

    const linked = (await query(
      `SELECT 1 FROM kurikulum_mk WHERE id_kurikulum = ? AND id_mata_kuliah = ? LIMIT 1`,
      [id_kurikulum, id_mata_kuliah],
    )) as Array<unknown>;
    if (linked.length === 0)
      return bad('Mata Kuliah ini belum terhubung ke Kurikulum yang dipilih.');

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(
        `INSERT INTO kelas_mk
           (id_mata_kuliah, id_kurikulum, tahun_akademik, semester, kode_kelas, kuota, id_tahun_akademik)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_mata_kuliah, id_kurikulum, ta_string, ta.semester, kode_kelas, kuota, id_tahun_akademik],
      );
      await conn.commit();
      const id_kelas = (ins as { insertId: number }).insertId;
      return NextResponse.json({ success: true, data: { id_kelas } });
    } catch (e) {
      await conn.rollback();
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('uq_kelas') || msg.includes('Duplicate'))
        return NextResponse.json(
          { success: false, error: 'DUPLICATE', message: 'Kombinasi MK + TA + Semester + Kode Kelas sudah ada.' },
          { status: 409 });
      throw e;
    } finally { conn.release(); }
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/kelas]', err);
    return serverError('Gagal membuat kelas tayang.');
  }
}

function bad(message: string) {
  return NextResponse.json({ success: false, error: 'BAD_REQUEST', message }, { status: 400 });
}