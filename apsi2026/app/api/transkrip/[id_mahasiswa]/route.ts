import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, handleAuthError, serverError, AuthError } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/transkrip/[id_mahasiswa]
 * Mengembalikan data lengkap untuk Transkrip OBE seorang mahasiswa.
 *
 * Akses:
 *  - mahasiswa: hanya boleh akses transkrip dirinya sendiri (id_mahasiswa cocok session).
 *  - dosen, kaprodi, jamu, admin: boleh akses semua mahasiswa.
 *
 * Data yang dikembalikan:
 *  - mahasiswa: identitas + kurikulum
 *  - cpl[]: semua CPL pada kurikulum, beserta capaian (NULL jika belum dinilai)
 *  - ik[]: rincian IK per CPL
 *  - summary: jumlah CPL tercapai vs total (threshold default 65)
 */
export async function GET(req: NextRequest, ctx: any) {
  try {
    const session = await getSessionUser(req);
    const idMhsRaw = (ctx?.params?.id_mahasiswa ?? '').toString();
    const idMhs = Number(idMhsRaw);
    if (!Number.isInteger(idMhs) || idMhs <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_ID', message: 'ID mahasiswa tidak valid.' }, { status: 400 });
    }

    // Authorization
    if (session.role === 'mahasiswa' && Number(session.id_mahasiswa) !== idMhs) {
      throw new AuthError('FORBIDDEN', 403, 'Anda hanya bisa melihat transkrip Anda sendiri.');
    }
    if (!['mahasiswa', 'dosen', 'kaprodi', 'jamu', 'admin'].includes(String(session.role))) {
      throw new AuthError('FORBIDDEN', 403, 'Role tidak diizinkan.');
    }

    const db = getDb();

    // 1. Mahasiswa identity
    const [mRows] = await db.query<any[]>(
      `SELECT id_mahasiswa, nim, nama_mahasiswa, email_sso, angkatan, status_mahasiswa
       FROM mahasiswa WHERE id_mahasiswa = ? LIMIT 1`,
      [idMhs],
    );
    const mhs = (mRows as any[])[0];
    if (!mhs) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'Mahasiswa tidak ditemukan.' }, { status: 404 });
    }

    // 2. Tentukan kurikulum berlaku untuk angkatan ini
    const [kRows] = await db.query<any[]>(
      `SELECT id_kurikulum, kode, nama, tahun_mulai, tahun_selesai, is_active
       FROM kurikulum
       WHERE (tahun_mulai <= ? AND (tahun_selesai IS NULL OR tahun_selesai > ?))
          OR is_active = 1
       ORDER BY (tahun_mulai <= ? AND (tahun_selesai IS NULL OR tahun_selesai > ?)) DESC,
                is_active DESC, tahun_mulai DESC
       LIMIT 1`,
      [mhs.angkatan || 0, mhs.angkatan || 0, mhs.angkatan || 0, mhs.angkatan || 0],
    );
    const kur = (kRows as any[])[0];
    if (!kur) {
      return NextResponse.json({ success: false, error: 'NO_KURIKULUM', message: 'Tidak ada kurikulum aktif untuk angkatan ini.' }, { status: 404 });
    }

    // 3. Capaian CPL — semua CPL kurikulum + LEFT JOIN nilai_cpl view
    const [cplRows] = await db.query<any[]>(
      `SELECT c.id_cpl, c.kode_cpl, c.singkatan, c.domain, c.deskripsi_id, c.urutan,
              v.nilai_cpl
       FROM cpl c
       LEFT JOIN v_nilai_cpl_per_mhs v ON v.id_cpl = c.id_cpl AND v.id_mahasiswa = ?
       WHERE c.id_kurikulum = ?
       ORDER BY c.urutan, c.kode_cpl`,
      [idMhs, kur.id_kurikulum],
    );

    // 4. Rincian IK per CPL + nilai IK
    const [ikRows] = await db.query<any[]>(
      `SELECT ik.id_ik, ik.kode_ik, ik.deskripsi, ik.id_cpl, ik.urutan,
              mic.bobot_persen,
              v.nilai_ik
       FROM indikator_kinerja ik
       JOIN cpl c           ON c.id_cpl = ik.id_cpl AND c.id_kurikulum = ?
       LEFT JOIN mapping_ik_cpl mic ON mic.id_ik = ik.id_ik AND mic.id_cpl = ik.id_cpl
       LEFT JOIN v_nilai_ik_per_mhs v ON v.id_ik = ik.id_ik AND v.id_mahasiswa = ?
       ORDER BY ik.id_cpl, ik.urutan, ik.kode_ik`,
      [kur.id_kurikulum, idMhs],
    );

    // 5. Summary
    const THRESHOLD = 65;
    const cplWithNilai = (cplRows as any[]).filter((r: any) => r.nilai_cpl !== null && r.nilai_cpl !== undefined);
    const tercapai = cplWithNilai.filter((r: any) => Number(r.nilai_cpl) >= THRESHOLD).length;

    return NextResponse.json({
      success: true,
      data: {
        mahasiswa: {
          id_mahasiswa: mhs.id_mahasiswa,
          nim: mhs.nim,
          nama: mhs.nama_mahasiswa,
          email_sso: mhs.email_sso,
          angkatan: mhs.angkatan,
          status_mahasiswa: mhs.status_mahasiswa,
        },
        kurikulum: {
          id_kurikulum: kur.id_kurikulum,
          kode: kur.kode,
          nama: kur.nama,
          tahun_mulai: kur.tahun_mulai,
          tahun_selesai: kur.tahun_selesai,
        },
        cpl: (cplRows as any[]).map((r: any) => ({
          id_cpl: r.id_cpl,
          kode_cpl: r.kode_cpl,
          singkatan: r.singkatan,
          domain: r.domain,
          deskripsi: r.deskripsi_id,
          nilai_cpl: r.nilai_cpl !== null ? Number(r.nilai_cpl) : null,
          status: r.nilai_cpl === null ? 'belum_dinilai' : (Number(r.nilai_cpl) >= THRESHOLD ? 'tercapai' : 'belum_tercapai'),
        })),
        ik: (ikRows as any[]).map((r: any) => ({
          id_ik: r.id_ik,
          kode_ik: r.kode_ik,
          deskripsi: r.deskripsi,
          id_cpl: r.id_cpl,
          bobot_persen: r.bobot_persen !== null ? Number(r.bobot_persen) : null,
          nilai_ik: r.nilai_ik !== null ? Number(r.nilai_ik) : null,
        })),
        summary: {
          threshold: THRESHOLD,
          total_cpl: (cplRows as any[]).length,
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