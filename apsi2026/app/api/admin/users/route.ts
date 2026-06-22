import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, serverError } from '@/app/lib/auth';
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin';
import { generateRandomPassword } from '@/app/lib/passwordGen';

/* ============================================================
   /api/admin/users
     GET  -> list semua user (+ join staff/mahasiswa)
     POST -> create user baru. Auto-buat row staff/mahasiswa kalau
             linkage_mode='create_new'. Password random + flag
             force_password_change=1.
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'mahasiswa' | 'dosen' | 'kaprodi' | 'jamu' | 'admin';
type Status = 'pending_verification' | 'aktif' | 'nonaktif';

export interface UserRow {
  id_user: number;
  email: string;
  role: Role;
  status: Status;
  force_password_change: 0 | 1;
  id_mahasiswa: number | null;
  id_staff: number | null;
  nama_input: string | null;
  nama_resolved: string;
  identifier: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from('app_user')
      .select(
        `id_user, email, role, status, force_password_change, id_mahasiswa, id_staff, nama_input, created_at, updated_at,
         mahasiswa:id_mahasiswa ( nama_mahasiswa, nim ),
         staff:id_staff ( nama_lengkap, nip_nidn_nik )`,
      )
      .order('created_at', { ascending: false })
      .order('id_user', { ascending: false });
    if (error) throw error;

    const rows: UserRow[] = (data ?? []).map((u: any) => ({
      id_user: u.id_user,
      email: u.email,
      role: u.role,
      status: u.status,
      force_password_change: u.force_password_change ? 1 : 0,
      id_mahasiswa: u.id_mahasiswa,
      id_staff: u.id_staff,
      nama_input: u.nama_input,
      nama_resolved: u.mahasiswa?.nama_mahasiswa || u.staff?.nama_lengkap || u.nama_input || u.email,
      identifier: u.mahasiswa?.nim || u.staff?.nip_nidn_nik || null,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[GET /api/admin/users]', err);
    return serverError('Gagal memuat daftar user.');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));

    const role = String(body.role || '').trim() as Role;
    const email = String(body.email || '').trim().toLowerCase();
    const nama = String(body.nama || '').trim();
    const linkage_mode = (body.linkage_mode === 'existing' ? 'existing' : 'create_new') as 'existing' | 'create_new';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
    if (!nama)
      return NextResponse.json({ success: false, message: 'Nama wajib diisi.' }, { status: 400 });
    if (!['mahasiswa', 'dosen', 'kaprodi', 'jamu', 'admin'].includes(role))
      return NextResponse.json({ success: false, message: 'Role tidak valid.' }, { status: 400 });

    const admin = createSupabaseAdminClient();

    const { data: dup } = await admin.from('app_user').select('id_user').eq('email', email).maybeSingle();
    if (dup) return NextResponse.json({ success: false, message: 'Email sudah terdaftar.' }, { status: 409 });

    let id_mahasiswa: number | null = null;
    let id_staff: number | null = null;

    try {
      if (role === 'mahasiswa') {
        if (linkage_mode === 'existing') {
          const idIn = Number(body.id_mahasiswa);
          if (!Number.isFinite(idIn) || idIn <= 0) throw new Error('id_mahasiswa wajib untuk linkage existing.');
          const { data: chk } = await admin.from('mahasiswa').select('id_mahasiswa').eq('id_mahasiswa', idIn).maybeSingle();
          if (!chk) throw new Error('Mahasiswa tidak ditemukan.');
          id_mahasiswa = idIn;
        } else {
          const nim = String(body.nim || '').trim();
          const angkatan = Number(body.angkatan);
          if (!nim || !/^[A-Za-z0-9_-]{4,15}$/.test(nim)) throw new Error('NIM wajib (4-15 char alfanumerik).');
          if (!Number.isFinite(angkatan) || angkatan < 1990 || angkatan > 2100) throw new Error('Angkatan tidak valid.');
          const { data: ins, error: insErr } = await admin
            .from('mahasiswa')
            .insert({ nim, nama_mahasiswa: nama, email_sso: email, angkatan })
            .select('id_mahasiswa')
            .single();
          if (insErr) throw new Error(insErr.message);
          id_mahasiswa = ins.id_mahasiswa;
        }
      } else {
        if (linkage_mode === 'existing') {
          const idIn = Number(body.id_staff);
          if (!Number.isFinite(idIn) || idIn <= 0) throw new Error('id_staff wajib untuk linkage existing.');
          const { data: chk } = await admin.from('staff').select('id_staff').eq('id_staff', idIn).maybeSingle();
          if (!chk) throw new Error('Staff tidak ditemukan.');
          id_staff = idIn;
        } else {
          const nip = String(body.nip_nidn_nik || '').trim();
          if (!nip || nip.length < 4 || nip.length > 20) throw new Error('NIP/NIDN/NIK wajib (4-20 char).');
          const peran = role === 'admin' ? 'admin' : role === 'kaprodi' ? 'kaprodi' : role === 'jamu' ? 'jamu' : 'dosen';
          const { data: ins, error: insErr } = await admin
            .from('staff')
            .insert({ nip_nidn_nik: nip, nama_lengkap: nama, email_sso: email, peran })
            .select('id_staff')
            .single();
          if (insErr) throw new Error(insErr.message);
          id_staff = ins.id_staff;
        }
      }

      const plainPassword = generateRandomPassword(10);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password: plainPassword, email_confirm: true });
      if (createErr || !created?.user) throw new Error(createErr?.message || 'Gagal membuat akun Supabase Auth.');

      const { data: insUser, error: insUserErr } = await admin
        .from('app_user')
        .insert({
          auth_user_id: created.user.id,
          email,
          role,
          status: 'aktif',
          force_password_change: true,
          id_mahasiswa,
          id_staff,
          nama_input: nama,
          verified_at: new Date().toISOString(),
        })
        .select('id_user')
        .single();
      if (insUserErr) throw new Error(insUserErr.message);

      return NextResponse.json({
        success: true,
        data: {
          id_user: insUser.id_user,
          email,
          role,
          nama,
          id_mahasiswa,
          id_staff,
          generated_password: plainPassword,
          force_password_change: 1,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat user.';
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    console.error('[POST /api/admin/users]', err);
    return serverError('Gagal membuat user.');
  }
}
