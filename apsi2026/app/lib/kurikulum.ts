import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

/**
 * Mahasiswa tidak punya kolom id_kurikulum langsung — kurikulum yang
 * berlaku untuknya ditentukan dari angkatan (tahun masuk) dicocokkan ke
 * rentang tahun_mulai/tahun_selesai kurikulum, fallback ke kurikulum aktif.
 */
export async function resolveKurikulumId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  angkatan: number | null,
): Promise<number | null> {
  const { data: kurikulumList } = await admin
    .from('kurikulum')
    .select('id_kurikulum, tahun_mulai, tahun_selesai, is_active')
  if (!kurikulumList || kurikulumList.length === 0) return null

  const inRange = angkatan
    ? kurikulumList.find((k) => k.tahun_mulai <= angkatan && (k.tahun_selesai == null || k.tahun_selesai > angkatan))
    : null
  if (inRange) return inRange.id_kurikulum

  const active = kurikulumList.find((k) => k.is_active)
  if (active) return active.id_kurikulum

  return kurikulumList.sort((a, b) => b.tahun_mulai - a.tahun_mulai)[0]?.id_kurikulum ?? null
}
