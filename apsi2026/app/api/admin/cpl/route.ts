import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/app/lib/db'
import { handleAuthError, requireRole } from '@/app/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Pastikan pengguna adalah admin
    await requireRole(req, ['admin'])
    const db = getDb()

    // 1. Ambil daftar CPL beserta informasi kurikulumnya
    const [cplRows] = await db.query(
      `SELECT c.id_cpl, c.id_kurikulum, c.kode_cpl, c.singkatan, c.domain, 
              c.deskripsi_id, c.deskripsi_en, c.urutan, 
              k.kode AS kode_kurikulum, k.nama AS nama_kurikulum
       FROM cpl c
       JOIN kurikulum k ON c.id_kurikulum = k.id_kurikulum
       ORDER BY k.tahun_mulai DESC, c.urutan ASC, c.kode_cpl ASC`
    )

    // 2. Ambil daftar kurikulum untuk dropdown form input CPL
    const [kurikulumRows] = await db.query(
      `SELECT id_kurikulum, kode, nama, is_active 
       FROM kurikulum 
       ORDER BY tahun_mulai DESC`
    )

    return NextResponse.json({
      success: true,
      data: {
        cplList: cplRows,
        kurikulumList: kurikulumRows,
      },
    })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] GET /api/admin/cpl error:', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal memuat data CPL' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Pastikan pengguna adalah admin
    await requireRole(req, ['admin'])
    const body = await req.json().catch(() => ({}))

    const id_kurikulum = body.id_kurikulum ? Number(body.id_kurikulum) : null
    const kode_cpl = body.kode_cpl ? String(body.kode_cpl).trim() : ''
    const singkatan = body.singkatan ? String(body.singkatan).trim() : ''
    const domain = body.domain ? String(body.domain).trim() : ''
    const deskripsi_id = body.deskripsi_id ? String(body.deskripsi_id).trim() : ''
    const deskripsi_en = body.deskripsi_en ? String(body.deskripsi_en).trim() : null
    const urutan = body.urutan ? Number(body.urutan) : 0

    // 1. Validasi Kode CPL kosong
    if (!kode_cpl) {
      return NextResponse.json(
        {
          success: false,
          error: 'KODE_CPL_EMPTY',
          message: 'Sistem meminta kode CPL. Kode CPL tidak boleh kosong!',
        },
        { status: 400 }
      )
    }

    // Validasi parameter wajib lainnya
    if (!id_kurikulum) {
      return NextResponse.json(
        { success: false, error: 'KURIKULUM_REQUIRED', message: 'Kurikulum wajib dipilih!' },
        { status: 400 }
      )
    }

    if (!singkatan) {
      return NextResponse.json(
        { success: false, error: 'SINGKATAN_REQUIRED', message: 'Singkatan wajib diisi!' },
        { status: 400 }
      )
    }

    const validDomains = ['Pengetahuan', 'Keterampilan Khusus', 'Keterampilan Umum', 'Sikap']
    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_DOMAIN', message: 'Domain CPL tidak valid!' },
        { status: 400 }
      )
    }

    if (!deskripsi_id) {
      return NextResponse.json(
        { success: false, error: 'DESKRIPSI_REQUIRED', message: 'Deskripsi ID wajib diisi!' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 2. Validasi Input CPL duplikat (untuk kurikulum yang sama)
    const [existing] = await db.query<any[]>(
      `SELECT id_cpl FROM cpl WHERE id_kurikulum = ? AND kode_cpl = ? LIMIT 1`,
      [id_kurikulum, kode_cpl]
    )

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE_CPL',
          message: 'Sistem menolak data duplikat. Kode CPL sudah terdaftar untuk kurikulum ini.',
        },
        { status: 400 }
      )
    }

    // 3. Simpan data CPL jika valid
    await db.query(
      `INSERT INTO cpl (id_kurikulum, kode_cpl, singkatan, domain, deskripsi_id, deskripsi_en, urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_kurikulum, kode_cpl, singkatan, domain, deskripsi_id, deskripsi_en, urutan]
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Sistem menyimpan data CPL. Data berhasil disimpan!',
      },
      { status: 201 }
    )
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] POST /api/admin/cpl error:', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal menyimpan data CPL' },
      { status: 500 }
    )
  }
}
