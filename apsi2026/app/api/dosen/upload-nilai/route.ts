import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { query, getConnection } from '@/app/lib/db';
import {
  parseSiakadFile,
  UK_CODE_PRIORITY,
  type SiakadBobotMedia,
} from '@/app/lib/siakadParser';
import { notifyKoPengampuOnUpload } from '@/app/lib/notifikasiPengampu';

type UploadDetail = {
  baris_excel: number;
  nim: string;
  status: 'sukses' | 'gagal' | 'sebagian';
  catatan?: string;
  uk_tersimpan?: number;
  uk_gagal?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['dosen']);
    if (!user.id_staff) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' },
        { status: 401 },
      );
    }

    // 1) Parse multipart
    const form = await req.formData();
    const file = form.get('file');
    const idKelasRaw = form.get('id_kelas');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Field "file" wajib diisi (Excel SIAKAD).' },
        { status: 400 },
      );
    }
    const idKelas = Number(idKelasRaw);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Field "id_kelas" tidak valid.' },
        { status: 400 },
      );
    }

    // 2) Verifikasi ownership
    const ownership = (await query(
      `SELECT 1 FROM mapping_dosen_kelas WHERE id_kelas = ? AND id_staff = ? LIMIT 1`,
      [idKelas, user.id_staff],
    )) as Array<unknown>;
    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' },
        { status: 403 },
      );
    }

    // 3) Ambil id_mata_kuliah kelas
    const kelasInfo = (await query(
      `SELECT id_mata_kuliah FROM kelas_mk WHERE id_kelas = ? LIMIT 1`,
      [idKelas],
    )) as Array<{ id_mata_kuliah: number }>;
    if (kelasInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' },
        { status: 404 },
      );
    }
    const idMataKuliah = kelasInfo[0].id_mata_kuliah;

    // 4) Parse Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed;
    try {
      parsed = parseSiakadFile(buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Format file tidak dikenali.';
      return NextResponse.json(
        { success: false, error: 'PARSE_ERROR', message: msg },
        { status: 400 },
      );
    }

    // 5) Cek duplikat token
    const dupToken = (await query(
      `SELECT id FROM upload_log_nilai
       WHERE token_siakad = ? AND id_kelas = ? AND token_valid = 1 LIMIT 1`,
      [parsed.token, idKelas],
    )) as Array<{ id: number }>;
    if (dupToken.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE_TOKEN',
          message:
            'File SIAKAD ini sudah pernah di-upload sebelumnya (token sama). Gunakan file ekspor SIAKAD yang baru jika ingin update nilai.',
        },
        { status: 409 },
      );
    }

    // 6) Lookup komponen_nilai untuk MK ini, map kode → id_komponen
    const komponenRows = (await query(
      `SELECT id_komponen, kode_media, nama_media
       FROM komponen_nilai WHERE id_mata_kuliah = ?`,
      [idMataKuliah],
    )) as Array<{ id_komponen: number; kode_media: string; nama_media: string }>;

    const komponenIndex = new Map<string, number>();
    for (const k of komponenRows) {
      komponenIndex.set(k.kode_media.toUpperCase(), k.id_komponen);
      komponenIndex.set(k.nama_media.toUpperCase(), k.id_komponen);
    }

    function resolveKomponen(uk: keyof SiakadBobotMedia): number | null {
      for (const candidate of UK_CODE_PRIORITY[uk]) {
        const found = komponenIndex.get(candidate.toUpperCase());
        if (found) return found;
      }
      return null;
    }

    const ukKeys: (keyof SiakadBobotMedia)[] = ['UK1', 'UK2', 'UK3', 'UK4', 'UK5'];
    const ukToKomponen: Record<string, number | null> = {};
    const ukMappingMissing: string[] = [];
    for (const uk of ukKeys) {
      const id = resolveKomponen(uk);
      ukToKomponen[uk] = id;
      if (id === null) ukMappingMissing.push(uk);
    }

    // 7) Lookup mahasiswa enrolled di kelas, map NIM → id_mahasiswa
    const enrolled = (await query(
      `SELECT m.id_mahasiswa, m.nim
       FROM mahasiswa_kelas mks
       JOIN mahasiswa m ON m.id_mahasiswa = mks.id_mahasiswa
       WHERE mks.id_kelas = ?`,
      [idKelas],
    )) as Array<{ id_mahasiswa: number; nim: string }>;
    const nimIndex = new Map<string, number>();
    for (const m of enrolled) nimIndex.set(m.nim.toUpperCase(), m.id_mahasiswa);

    // 8) Distribusi nilai — pakai connection + transaction
    const conn = await getConnection();
    const details: UploadDetail[] = [];
    let jumlahBerhasil = 0;
    let jumlahGagal = 0;
    const masalahQueue: Array<{
      jenis: string;
      ref_id: string | number;
      detail: Record<string, unknown>;
    }> = [];

    try {
      await conn.beginTransaction();

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const barisExcel = 14 + i + 1; // 1-indexed untuk pesan ke user
        const idMhs = nimIndex.get(row.nim.toUpperCase());

        if (!idMhs) {
          jumlahGagal++;
          details.push({
            baris_excel: barisExcel,
            nim: row.nim,
            status: 'gagal',
            catatan: 'Mahasiswa tidak terdaftar di kelas ini.',
          });
          masalahQueue.push({
            jenis: 'mahasiswa_tidak_enrolled',
            ref_id: row.nim,
            detail: {
              id_kelas: idKelas,
              nim: row.nim,
              nama: row.nama,
              baris_excel: barisExcel,
            },
          });
          continue;
        }

        let ukTersimpan = 0;
        const ukGagal: string[] = [];
        for (const uk of ukKeys) {
          const nilai = row.nilai[uk];
          if (nilai === null) continue;
          const idKomponen = ukToKomponen[uk];
          if (!idKomponen) {
            ukGagal.push(uk);
            continue;
          }
          await conn.query(
            `INSERT INTO nilai_detail
               (id_mahasiswa, id_komponen, id_kelas, nilai_asli, diinput_oleh_staff, diinput_at, diupdate_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
               nilai_asli = VALUES(nilai_asli),
               diinput_oleh_staff = VALUES(diinput_oleh_staff),
               diupdate_at = NOW()`,
            [idMhs, idKomponen, idKelas, nilai, user.id_staff],
          );
          ukTersimpan++;
        }

        if (ukTersimpan > 0 && ukGagal.length === 0) {
          jumlahBerhasil++;
          details.push({ baris_excel: barisExcel, nim: row.nim, status: 'sukses', uk_tersimpan: ukTersimpan });
        } else if (ukTersimpan > 0) {
          jumlahBerhasil++;
          details.push({
            baris_excel: barisExcel,
            nim: row.nim,
            status: 'sebagian',
            uk_tersimpan: ukTersimpan,
            uk_gagal: ukGagal,
            catatan: `Komponen ${ukGagal.join(', ')} tidak ditemukan di MK ini.`,
          });
        } else {
          jumlahGagal++;
          details.push({
            baris_excel: barisExcel,
            nim: row.nim,
            status: 'gagal',
            uk_gagal: ukGagal,
            catatan: 'Tidak ada nilai yang berhasil disimpan.',
          });
        }
      }

      // Queue mapping MK kosong (sekali per UK yang missing, bukan per baris)
      for (const uk of ukMappingMissing) {
        masalahQueue.push({
          jenis: 'komponen_nilai_kosong',
          ref_id: idMataKuliah,
          detail: {
            id_mata_kuliah: idMataKuliah,
            id_kelas: idKelas,
            uk_label: uk,
            kandidat_kode: UK_CODE_PRIORITY[uk as keyof SiakadBobotMedia],
            catatan: `Tidak ada komponen_nilai dengan kode_media/nama_media yang match untuk ${uk}.`,
          },
        });
      }

      // Insert log + data_bermasalah
      const statusUpload =
        jumlahGagal === 0 ? 'sukses' : jumlahBerhasil === 0 ? 'gagal' : 'sebagian';

      const [logResult] = await conn.query(
        `INSERT INTO upload_log_nilai
           (id_kelas, id_staff_uploader, nama_file, token_siakad, token_valid,
            jumlah_baris, jumlah_berhasil, jumlah_gagal, status, detail, uploaded_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, NOW())`,
        [
          idKelas,
          user.id_staff,
          file.name,
          parsed.token,
          parsed.rows.length,
          jumlahBerhasil,
          jumlahGagal,
          statusUpload,
          JSON.stringify({ warnings: parsed.warnings, bobot_media: parsed.bobot_media, details }),
        ],
      );
      const idUploadLog = (logResult as { insertId: number }).insertId;

      for (const m of masalahQueue) {
        await conn.query(
          `INSERT INTO data_bermasalah
             (jenis_masalah, ref_table, ref_id, detail, status, dibuat_at)
           VALUES (?, ?, ?, ?, 'belum_diselesaikan', NOW())`,
          [
            m.jenis,
            m.jenis === 'mahasiswa_tidak_enrolled' ? 'mahasiswa' : 'mata_kuliah',
            String(m.ref_id),
            JSON.stringify({ ...m.detail, id_upload_log: idUploadLog }),
          ],
        );
      }

      await conn.commit();

      // 🔔 Notifikasi email ke ko-pengampu (fire-and-forget, tidak blocking response)
      void notifyKoPengampuOnUpload({
        id_kelas: idKelas,
        id_staff_editor: user.id_staff,
        fileName: file.name,
        jumlahBerhasil,
        jumlahGagal,
        masalahDilaporkan: masalahQueue.length,
      }).catch((e) => console.error('[notif upload]', e));

      return NextResponse.json({
        success: true,
        data: {
          id_upload_log: idUploadLog,
          status: statusUpload,
          jumlah_baris: parsed.rows.length,
          jumlah_berhasil: jumlahBerhasil,
          jumlah_gagal: jumlahGagal,
          warnings: parsed.warnings,
          bobot_media: parsed.bobot_media,
          uk_mapping_missing: ukMappingMissing,
          masalah_dilaporkan: masalahQueue.length,
          details,
        },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[POST /api/dosen/upload-nilai]', err);
    return serverError('Gagal memproses upload nilai SIAKAD.');
  }
}