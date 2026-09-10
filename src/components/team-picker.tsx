'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { NEUTRAL } from '@/lib/palette'
import type { Me } from '@/lib/types'
import { useApi } from '@/lib/use-api'

export function TeamPicker() {
  const { data, error, loading } = useApi<Me>('/api/me')

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-sm font-semibold leading-tight">Linear Graph</h1>
            <p className="text-xs text-muted">{data?.organization.name ?? ' '}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.user.avatarUrl && <img src={data.user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}
          <a href="/api/auth/logout" className="text-xs text-muted hover:text-fg">
            Disconnect
          </a>
          <ThemeToggle />
        </div>
      </header>

      <h2 className="section-title mt-14">Choose a team</h2>
      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-soft" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {data?.teams.map((team) => (
            <Link
              key={team.id}
              href={`/team/${team.id}`}
              className="group flex items-center gap-3 rounded-lg border border-line bg-panel p-4 transition hover:border-fg/30"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team.color ?? NEUTRAL }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{team.name}</span>
                <span className="text-xs text-muted">{team.key}</span>
              </span>
              <ChevronRight size={16} className="text-muted opacity-0 transition group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
