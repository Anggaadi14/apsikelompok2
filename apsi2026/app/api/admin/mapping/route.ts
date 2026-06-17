import { NextRequest, NextResponse } from 'next/server'
import { getDb, getConnection } from '@/app/lib/db'
import { handleAuthError, requireRole } from '@/app/lib/auth'

// GET /api/admin/mapping            → daftar mata kuliah (untuk dropdown)
// GET /api/admin/mapping?id_mata_kuliah=12  → CPMK MK tsb + pemetaan IK sekarang + daftar IK
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin'])
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const idMk = searchParams.get('id_mata_kuliah')

    // Selalu kirim daftar MK untuk dropdown utama
    const [mkList] = await db.query(
      `SELECT id_mata_kuliah, kode_mk, nama_mk FROM mata_kuliah ORDER BY kode_mk ASC`
    )

    if (!idMk) {
      return NextResponse.json({ success: true, data: { mkList } })
    }

    // CPMK milik MK terpilih + IK yang saat ini terpetakan (maks 1 per CPMK)
    const [cpmkList] = await db.query(
      `SELECT cm.id_cpmk, cm.kode_cpmk, cm.deskripsi_id,
              (SELECT mci.id_ik FROM mapping_cpmk_ik mci
                WHERE mci.id_cpmk = cm.id_cpmk LIMIT 1) AS id_ik
       FROM cpmk cm
       WHERE cm.id_mata_kuliah = ?
       ORDER BY cm.urutan ASC, cm.kode_cpmk ASC`,
      [Number(idMk)]
    )

    // Daftar IK (dikelompokkan via CPL induk) untuk pilihan pemetaan
    const [ikList] = await db.query(
      `SELECT ik.id_ik, ik.kode_ik, ik.deskripsi,
              c.id_cpl, c.kode_cpl
       FROM indikator_kinerja ik
       JOIN cpl c ON ik.id_cpl = c.id_cpl
       ORDER BY c.kode_cpl ASC, ik.urutan ASC, ik.kode_ik ASC`
    )

    return NextResponse.json({ success: true, data: { mkList, cpmkList, ikList } })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] GET /api/admin/mapping error:', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal memuat data pemetaan' },
      { status: 500 }
    )
  }
}

// POST /api/admin/mapping
// body: { id_mata_kuliah, mappings: [{ id_cpmk, id_ik | null }] }
// - id_ik null  = CPMK tidak dipetakan (bobot 0)
// - bobot CPMK→IK dibagi rata otomatis (jumlah per IK = 100)
export async function POST(req: NextRequest) {
  let conn: Awaited<ReturnType<typeof getConnection>> | null = null
  try {
    await requireRole(req, ['admin'])
    const body = await req.json().catch(() => ({}))
    const mappings: Array<{ id_cpmk: number; id_ik: number | null }> =
      Array.isArray(body.mappings) ? body.mappings : []

    if (mappings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NO_MAPPING', message: 'Tidak ada data pemetaan yang dikirim.' },
        { status: 400 }
      )
    }

    conn = await getConnection()
    await conn.beginTransaction()

    // IK yang terpengaruh (untuk dihitung ulang bobot ratanya)
    const affectedIks = new Set<number>()

    for (const m of mappings) {
      const idCpmk = Number(m.id_cpmk)
      const idIk = m.id_ik ? Number(m.id_ik) : null
      if (!idCpmk) continue

      // Catat IK lama (kalau ada) lalu hapus pemetaan lama CPMK ini
      const [oldRows]: any = await conn.query(
        `SELECT id_ik FROM mapping_cpmk_ik WHERE id_cpmk = ?`,
        [idCpmk]
      )
      for (const r of oldRows) affectedIks.add(Number(r.id_ik))
      await conn.query(`DELETE FROM mapping_cpmk_ik WHERE id_cpmk = ?`, [idCpmk])

      // Pasang pemetaan baru (maks 1 IK per CPMK)
      if (idIk) {
        await conn.query(
          `INSERT INTO mapping_cpmk_ik (id_cpmk, id_ik, bobot_persen) VALUES (?, ?, 0)`,
          [idCpmk, idIk]
        )
        affectedIks.add(idIk)
      }
    }

    // Hitung ulang bobot RATA per IK terpengaruh (jumlah per IK = 100)
    for (const idIk of affectedIks) {
      const [cntRows]: any = await conn.query(
        `SELECT COUNT(*) AS c FROM mapping_cpmk_ik WHERE id_ik = ?`,
        [idIk]
      )
      const count = Number(cntRows[0]?.c || 0)
      if (count > 0) {
        const bobot = Math.round((100 / count) * 1000) / 1000 // 3 desimal
        await conn.query(
          `UPDATE mapping_cpmk_ik SET bobot_persen = ? WHERE id_ik = ?`,
          [bobot, idIk]
        )
      }
    }

    await conn.commit()
    return NextResponse.json({
      success: true,
      message: 'Sistem menyimpan pemetaan CPMK–IK. Bobot dibagi rata otomatis.',
    })
  } catch (err) {
    if (conn) { try { await conn.rollback() } catch {} }
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    console.error('[API] POST /api/admin/mapping error:', err)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Gagal menyimpan pemetaan' },
      { status: 500 }
    )
  } finally {
    if (conn) conn.release()
  }
}