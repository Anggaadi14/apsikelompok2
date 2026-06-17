'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Dashboard Layout Guard
 *
 * Mengecek session di sessionStorage('currentUser'):
 *  - Tidak ada session  -> redirect ke '/'
 *  - force_password_change === 1 -> redirect ke '/change-password'
 *    (kecuali user memang sedang di /change-password)
 *  - Selain itu -> render children.
 *
 * Render anak ditahan sampai cek selesai supaya tidak "flash" konten
 * sebelum redirect. Setiap role page punya cek sendiri (mismatch role)
 * yang tetap berjalan setelah ini.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
    if (!raw) { router.replace('/'); return; }
    try {
      const u = JSON.parse(raw);
      if (Number(u?.force_password_change) === 1 && pathname !== '/change-password') {
        router.replace('/change-password');
        return;
      }
    } catch {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}