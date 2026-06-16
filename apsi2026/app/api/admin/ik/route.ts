// app/api/admin/ik/route.ts
//
// IK Management — versi bilingual (ID + EN) sesuai arahan dosen.
// Kolom DB: `deskripsi` = Bahasa Indonesia (existing), `deskripsi_en` = Bahasa Inggris (baru, nullable).
//
// GET  → daftar IK (deskripsi_id + deskripsi_en) + daftar CPL untuk dropdown
// POST → simpan IK, validasi:
//        - kode_ik kosong         → 400 KODE_IK_EMPTY
//        - id_cpl tidak diisi     → 400 CPL_REQUIRED   (TC-AP-005: IK tanpa CPL)
//        - deskripsi_id kosong    → 400 DESKRIPSI_REQUIRED
//        - CPL tidak ada          → 400 CPL_NOT_FOUND
//        - duplikat (cpl,kode)    → 400 DUPLICATE_IK
//        - valid                  → 201 (TC-AP-004)

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { handleAuthError, requireRole } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const db = getDb();

    // 1) Daftar IK + konteks CPL & Kurikulum (deskripsi dwibahasa)
    const [ikRows] = await db.query(
      `SELECT ik.id_ik, ik.id_cpl, ik.kode_ik,
              ik.deskripsi AS deskripsi_id, ik.deskripsi_en, ik.urutan,
              c.kode_cpl, c.singkatan AS singkatan_cpl, c.domain AS domain_cpl,
              c.id_kurikulum,
              k.kode AS kode_kurikulum, k.nama AS nama_kurikulum
       FROM indikator_kinerja ik
       JOIN cpl c ON c.id_cpl = ik.id_cpl
       JOIN kurikulum k ON k.id_kurikulum = c.id_kurikulum
       ORDER BY k.tahun_mulai DESC, c.urutan ASC, c.kode_cpl ASC,
                ik.urutan ASC, ik.kode_ik ASC`
    );

    // 2) Daftar CPL untuk dropdown form
    const [cplRows] = await db.query(
      `SELECT c.id_cpl, c.kode_cpl, c.singkatan, c.domain, c.deskripsi_id,
              c.id_kurikulum,
              k.kode AS kode_kurikulum, k.nama AS nama_kurikulum, k.is_active
       FROM cpl c
       JOIN kurikulum k ON k.id_kurikulum = c.id_kurikulum
       ORDER BY k.tahun_mulai DESC, c.urutan ASC, c.kode_cpl ASC`
    );

    return NextResponse.json({
      success: true,
      data: { ikList: ikRows, cplList: cplRows },
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('[API] GET /api/admin/ik error:', err);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal memuat data IK' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));

    const id_cpl = body.id_cpl ? Number(body.id_cpl) : null;
    const kode_ik = body.kode_ik ? String(body.kode_ik).trim() : '';
    const deskripsi_id = body.deskripsi_id ? String(body.deskripsi_id).trim() : '';
    const deskripsi_en = body.deskripsi_en ? String(body.deskripsi_en).trim() : null;
    const urutan = body.urutan ? Number(body.urutan) : 0;

    // 1) Kode IK wajib
    if (!kode_ik) {
      return NextResponse.json(
        { success: false, error: 'KODE_IK_EMPTY', message: 'Sistem meminta kode IK. Kode IK tidak boleh kosong!' },
        { status: 400 }
      );
    }

    // 2) IK harus terhubung ke CPL (TC-AP-005)
    if (!id_cpl) {
      return NextResponse.json(
        {
          success: false,
          error: 'CPL_REQUIRED',
          message: 'Sistem menolak penyimpanan IK. IK harus terhubung ke CPL.',
        },
        { status: 400 }
      );
    }

    // 3) Deskripsi Indonesia wajib (EN opsional)
    if (!deskripsi_id) {
      return NextResponse.json(
        { success: false, error: 'DESKRIPSI_REQUIRED', message: 'Deskripsi (Indonesia) wajib diisi!' },
        { status: 400 }
      );
    }

    const db = getDb();

    // 4) Pastikan CPL ada
    const [cplExists] = await db.query<any[]>(
      `SELECT id_cpl FROM cpl WHERE id_cpl = ? LIMIT 1`,
      [id_cpl]
    );
    if (!cplExists || cplExists.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CPL_NOT_FOUND', message: 'CPL yang dipilih tidak ditemukan.' },
        { status: 400 }
      );
    }

    // 5) Cek duplikat dalam CPL yang sama
    const [existing] = await db.query<any[]>(
      `SELECT id_ik FROM indikator_kinerja WHERE id_cpl = ? AND kode_ik = ? LIMIT 1`,
      [id_cpl, kode_ik]
    );
    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE_IK',
          message: 'Sistem menolak data duplikat. Kode IK sudah terdaftar untuk CPL ini.',
        },
        { status: 400 }
      );
    }

    // 6) Insert (deskripsi = ID, deskripsi_en = EN)
    await db.query(
      `INSERT INTO indikator_kinerja (id_cpl, kode_ik, deskripsi, deskripsi_en, urutan)
       VALUES (?, ?, ?, ?, ?)`,
      [id_cpl, kode_ik, deskripsi_id, deskripsi_en, urutan]
    );

    return NextResponse.json(
      { success: true, message: 'Sistem menyimpan data IK. Data berhasil disimpan!' },
      { status: 201 }
    );
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('[API] POST /api/admin/ik error:', err);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal menyimpan data IK' },
      { status: 500 }
    );
  }
}