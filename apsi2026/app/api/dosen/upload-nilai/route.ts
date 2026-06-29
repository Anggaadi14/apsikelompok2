import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';
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
      return NextResponse.json({ success: false, error: 'INVALID_SESSION', message: 'Sesi dosen tidak memiliki id_staff.' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // 1) Parse multipart
    const form = await req.formData();
    const file = form.get('file');
    const idKelasRaw = form.get('id_kelas');
    const idTaRaw = form.get('id_tahun_akademik');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Field "file" wajib diisi (Excel SIAKAD).' }, { status: 400 });
    }
    const idKelas = Number(idKelasRaw);
    if (!Number.isInteger(idKelas) || idKelas <= 0) {
      return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Field "id_kelas" tidak valid.' }, { status: 400 });
    }

    // Resolve id_tahun_akademik (opsional). Kalau dosen kirim eksplisit -> validasi keberadaannya.
    // Kalau tidak -> pakai TA yang is_active = 1. Boleh tetap null kalau belum ada TA aktif.
    let idTahunAkademik: number | null = null;
    if (idTaRaw !== null && String(idTaRaw).trim() !== '') {
      const n = Number(idTaRaw);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Field "id_tahun_akademik" tidak valid.' }, { status: 400 });
      }
      const { data: ok } = await admin.from('tahun_akademik').select('id_tahun_akademik').eq('id_tahun_akademik', n).maybeSingle();
      if (!ok) {
        return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Tahun Akademik tidak ditemukan.' }, { status: 400 });
      }
      idTahunAkademik = n;
    } else {
      const { data: act } = await admin.from('tahun_akademik').select('id_tahun_akademik').eq('is_active', true).maybeSingle();
      idTahunAkademik = act ? Number(act.id_tahun_akademik) : null;
    }

    // 2) Verifikasi ownership
    const { data: ownership } = await admin.from('mapping_dosen_kelas').select('id_staff').eq('id_kelas', idKelas).eq('id_staff', user.id_staff).maybeSingle();
    if (!ownership) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'Anda tidak terdaftar sebagai pengampu kelas ini.' }, { status: 403 });
    }

    // 3) Ambil id_mata_kuliah kelas
    const { data: kelasInfo } = await admin.from('kelas_mk').select('id_mata_kuliah').eq('id_kelas', idKelas).maybeSingle<{ id_mata_kuliah: number }>();
    if (!kelasInfo) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' }, { status: 404 });
    }
    const idMataKuliah = kelasInfo.id_mata_kuliah;

    // 4) Parse Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed;
    try {
      parsed = parseSiakadFile(buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Format file tidak dikenali.';
      return NextResponse.json({ success: false, error: 'PARSE_ERROR', message: msg }, { status: 400 });
    }

    // 5) Cek duplikat token
    const { data: dupToken } = await admin
      .from('upload_log_nilai')
      .select('id')
      .eq('token_siakad', parsed.token)
      .eq('id_kelas', idKelas)
      .eq('token_valid', true)
      .maybeSingle();
    if (dupToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE_TOKEN',
          message: 'File SIAKAD ini sudah pernah di-upload sebelumnya (token sama). Gunakan file ekspor SIAKAD yang baru jika ingin update nilai.',
        },
        { status: 409 },
      );
    }

    // 6) Lookup komponen_nilai untuk MK ini, map kode → id_komponen
    const { data: komponenRows } = await admin.from('komponen_nilai').select('id_komponen, kode_media, nama_media').eq('id_mata_kuliah', idMataKuliah);

    const komponenIndex = new Map<string, number>();
    for (const k of komponenRows ?? []) {
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
    // Two-step: first get enrolled ids, then resolve NIM from mahasiswa table directly
    const { data: enrolledRows } = await admin
      .from('mahasiswa_kelas')
      .select('id_mahasiswa')
      .eq('id_kelas', idKelas);
    const enrolledIds = (enrolledRows ?? []).map((r) => r.id_mahasiswa);
    const nimIndex = new Map<string, number>();
    if (enrolledIds.length > 0) {
      const { data: mhsRows } = await admin
        .from('mahasiswa')
        .select('id_mahasiswa, nim')
        .in('id_mahasiswa', enrolledIds);
      for (const m of mhsRows ?? []) {
        nimIndex.set(m.nim.trim().toUpperCase(), m.id_mahasiswa);
      }
    }

    // 8) Distribusi nilai
    const details: UploadDetail[] = [];
    let jumlahBerhasil = 0;
    let jumlahGagal = 0;
    const masalahQueue: Array<{ jenis: string; ref_id: string | number; detail: Record<string, unknown> }> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const barisExcel = 14 + i + 1; // 1-indexed untuk pesan ke user
      const idMhs = nimIndex.get(row.nim.toUpperCase());

      if (!idMhs) {
        jumlahGagal++;
        details.push({ baris_excel: barisExcel, nim: row.nim, status: 'gagal', catatan: 'Mahasiswa tidak terdaftar di kelas ini.' });
        masalahQueue.push({
          jenis: 'mahasiswa_tidak_enrolled',
          ref_id: row.nim,
          detail: { id_kelas: idKelas, nim: row.nim, nama: row.nama, baris_excel: barisExcel },
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
        const { error: upErr } = await admin
          .from('nilai_detail')
          .upsert(
            { id_mahasiswa: idMhs, id_komponen: idKomponen, id_kelas: idKelas, nilai_asli: nilai, diinput_oleh_staff: user.id_staff },
            { onConflict: 'id_mahasiswa,id_komponen,id_kelas' },
          );
        if (!upErr) ukTersimpan++;
        else ukGagal.push(uk);
      }

      if (ukTersimpan > 0 && ukGagal.length === 0) {
        jumlahBerhasil++;
        details.push({ baris_excel: barisExcel, nim: row.nim, status: 'sukses', uk_tersimpan: ukTersimpan });
      } else if (ukTersimpan > 0) {
        jumlahBerhasil++;
        details.push({
          baris_excel: barisExcel, nim: row.nim, status: 'sebagian', uk_tersimpan: ukTersimpan, uk_gagal: ukGagal,
          catatan: `Komponen ${ukGagal.join(', ')} tidak ditemukan di MK ini.`,
        });
      } else {
        jumlahGagal++;
        details.push({ baris_excel: barisExcel, nim: row.nim, status: 'gagal', uk_gagal: ukGagal, catatan: 'Tidak ada nilai yang berhasil disimpan.' });
      }
    }

    // Queue mapping MK kosong (sekali per UK yang missing, bukan per baris)
    for (const uk of ukMappingMissing) {
      masalahQueue.push({
        jenis: 'komponen_nilai_tidak_ditemukan',
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

    const statusUpload = jumlahGagal === 0 ? 'success' : jumlahBerhasil === 0 ? 'failed' : 'partial';

    const { data: logResult, error: logErr } = await admin
      .from('upload_log_nilai')
      .insert({
        id_kelas: idKelas,
        id_tahun_akademik: idTahunAkademik,
        id_staff_uploader: user.id_staff,
        nama_file: file.name,
        token_siakad: parsed.token,
        token_valid: true,
        jumlah_baris: parsed.rows.length,
        jumlah_berhasil: jumlahBerhasil,
        jumlah_gagal: jumlahGagal,
        status: statusUpload,
        detail: { warnings: parsed.warnings, bobot_media: parsed.bobot_media, details },
      })
      .select('id')
      .single();
    if (logErr) throw logErr;
    const idUploadLog = logResult.id;

    if (masalahQueue.length > 0) {
      await admin.from('data_bermasalah').insert(
        masalahQueue.map((m) => ({
          jenis_masalah: m.jenis,
          ref_table: m.jenis === 'mahasiswa_tidak_enrolled' ? 'mahasiswa' : 'mata_kuliah',
          ref_id: String(m.ref_id),
          detail: { ...m.detail, id_upload_log: idUploadLog },
          status: 'open',
        })),
      );
    }

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
        id_tahun_akademik: idTahunAkademik,
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
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    console.error('[POST /api/dosen/upload-nilai]', err);
    return serverError('Gagal memproses upload nilai SIAKAD.');
  }
}
