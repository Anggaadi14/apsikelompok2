'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, AlertTriangle, BookOpen, Settings, Users } from 'lucide-react'

interface SessionUser {
  id: string
  email: string
  role: string
  nama?: string
}

export default function JamuDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = sessionStorage.getItem('currentUser')
    if (!raw) {
      router.replace('/')
      return
    }
    const parsed = JSON.parse(raw) as SessionUser
    if (parsed.role !== 'jamu') {
      // role mismatch — redirect ke dashboard sesuai role
      router.replace(`/dashboard/${parsed.role}`)
      return
    }
    setUser(parsed)
    setLoading(false)
  }, [router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Memuat dashboard jamu...</div>
      </div>
    )
  }

  const tiles = [
    {
      icon: BookOpen,
      title: 'CPL & Indikator Kinerja',
      desc: 'Kelola hierarki CPL → IK → CPMK dan bobot mapping.',
      href: '/dashboard/jamu/master-cpl',
      color: 'bg-blue-50 text-blue-700',
      status: 'Coming soon — Tahap 6',
    },
    {
      icon: Settings,
      title: 'Mapping Media Asesmen',
      desc: 'Atur bobot UK1–UK5 per mata kuliah ke CPMK.',
      href: '/dashboard/jamu/master-media',
      color: 'bg-purple-50 text-purple-700',
      status: 'Coming soon — Tahap 6',
    },
    {
      icon: AlertTriangle,
      title: 'Data Bermasalah',
      desc: 'Review & resolve anomali mapping/upload.',
      href: '/dashboard/jamu/data-bermasalah',
      color: 'bg-amber-50 text-amber-700',
      status: 'Coming soon — Tahap 6',
    },
    {
      icon: Activity,
      title: 'Dashboard Capaian',
      desc: 'Lihat agregat CPL seluruh angkatan (read-only seperti kaprodi).',
      href: '/dashboard/kaprodi',
      color: 'bg-green-50 text-green-700',
      status: 'Tersedia',
    },
    {
      icon: Users,
      title: 'Daftar Mahasiswa & Dosen',
      desc: 'Lihat data peserta + dosen pengampu (read-only).',
      href: '/dashboard/kaprodi#mahasiswa',
      color: 'bg-gray-50 text-gray-700',
      status: 'Tersedia',
    },
  ]

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser')
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard Jaminan Mutu (Jamu)</h1>
            <p className="text-sm text-gray-500">SICPL — Sistem Informasi Monitoring Capaian Pembelajaran Luaran</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user.nama ?? user.email}</div>
              <div className="text-xs text-gray-500">Jamu • {user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white border border-amber-200 bg-amber-50 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-amber-900">Dashboard sedang dalam pengembangan</div>
            <div className="text-sm text-amber-800">
              Fitur master mapping CRUD akan dirilis di <strong>Tahap 6</strong>. Sementara, Anda bisa melihat dashboard capaian read-only via tile "Dashboard Capaian" di bawah.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map(t => (
            <button
              key={t.title}
              onClick={() => t.status === 'Tersedia' && router.push(t.href)}
              disabled={t.status !== 'Tersedia'}
              className={`text-left bg-white rounded-lg border border-gray-200 p-5 transition ${
                t.status === 'Tersedia' ? 'hover:border-gray-300 hover:shadow-sm cursor-pointer' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className={`inline-flex p-2 rounded-lg ${t.color} mb-3`}>
                <t.icon className="w-5 h-5" />
              </div>
              <div className="font-medium text-gray-900 mb-1">{t.title}</div>
              <div className="text-sm text-gray-600 mb-3">{t.desc}</div>
              <div className={`text-xs font-medium ${
                t.status === 'Tersedia' ? 'text-green-700' : 'text-gray-500'
              }`}>
                {t.status}
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}