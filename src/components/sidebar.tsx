'use client'

import { ChevronLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { StatusIcon } from './status-icon'
import { ThemeToggle } from './theme-toggle'
import { COLOR_MODES, type Category, type ColorMode } from '@/lib/color'
import { cx } from '@/lib/cx'
import { LINK_KINDS, type LayoutMode, type LinkKind } from '@/lib/graph'
import type { Issue, Team } from '@/lib/types'

interface Props {
  team: Team
  total: number
  layout: LayoutMode
  onLayout: (layout: LayoutMode) => void
  mode: ColorMode
  onMode: (mode: ColorMode) => void
  categories: Category[]
  hidden: Set<string>
  onToggleCategory: (key: string) => void
  linkKinds: Set<LinkKind>
  onToggleKind: (kind: LinkKind) => void
  showClosed: boolean
  onShowClosed: (value: boolean) => void
  query: string
  onQuery: (value: string) => void
  matches: Issue[] | null
  onPick: (id: string) => void
}

export function Sidebar(p: Props) {
  return (
    <aside className="floating absolute top-4 bottom-4 left-4 z-10 flex w-64 flex-col">
      <div className="border-b border-line p-4">
        <Link href="/" className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-fg">
          <ChevronLeft size={14} /> Teams
        </Link>
        <h1 className="mt-2 truncate text-base font-semibold tracking-tight">{p.team.name}</h1>
        <p className="text-xs text-muted">
          {p.team.key} · {p.total} issues
        </p>
      </div>

      <div className="relative border-b border-line p-3">
        <Search size={14} className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-muted" />
        <input
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              p.onQuery('')
              e.currentTarget.blur()
              e.stopPropagation()
            } else if (e.key === 'Enter' && p.matches?.[0]) {
              p.onPick(p.matches[0].id)
            }
          }}
          placeholder="Search issues"
          className="h-8 w-full rounded-md bg-soft pr-2 pl-8 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
        />
        {p.matches && (
          <ul className="absolute top-full right-3 left-3 z-10 mt-1 overflow-hidden rounded-md border border-line bg-panel py-1 shadow-lg">
            {p.matches.slice(0, 8).map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => p.onPick(issue.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-soft"
                >
                  <span className="shrink-0 font-mono text-xs text-muted">{issue.identifier}</span>
                  <span className="truncate text-[13px]">{issue.title}</span>
                </button>
              </li>
            ))}
            <li className="px-3 py-1 text-xs text-muted">
              {p.matches.length === 0 ? 'No matches' : `${p.matches.length} match${p.matches.length === 1 ? '' : 'es'}`}
            </li>
          </ul>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section>
          <h2 className="section-title">Layout</h2>
          <Segmented
            options={LAYOUTS}
            value={p.layout}
            onChange={p.onLayout}
          />
        </section>

        <section>
          <h2 className="section-title">Color by</h2>
          <Segmented
            options={COLOR_MODES.map(({ mode, label }) => ({ value: mode, label }))}
            value={p.mode}
            onChange={p.onMode}
          />
          <ul className="mt-3 space-y-px">
            {p.categories.map((c) => {
              const off = p.hidden.has(c.key)
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => p.onToggleCategory(c.key)}
                    title={off ? 'Show' : 'Hide'}
                    className={cx('flex w-full items-center gap-2.5 rounded px-1.5 py-1 text-left text-[13px] hover:bg-soft', off && 'opacity-40')}
                  >
                    {c.state ? (
                      <StatusIcon state={c.state} size={12} />
                    ) : (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={off ? { boxShadow: `inset 0 0 0 1.5px ${c.color}` } : { background: c.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{c.label}</span>
                    <span className="text-xs tabular-nums text-muted">{c.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2 className="section-title">Links</h2>
          <ul className="space-y-px">
            {LINK_KINDS.filter(({ kind }) => kind !== 'team' || p.layout === 'radial').map(({ kind, label }) => {
              const on = p.linkKinds.has(kind)
              return (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => p.onToggleKind(kind)}
                    className={cx('flex w-full items-center gap-2.5 rounded px-1.5 py-1 text-left text-[13px] hover:bg-soft', !on && 'opacity-40')}
                  >
                    <LinkSwatch kind={kind} />
                    <span className="flex-1">{label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex items-center justify-between text-[13px]">
          <span>Show completed</span>
          <Switch checked={p.showClosed} onChange={p.onShowClosed} />
        </section>
      </div>

      <div className="flex items-center justify-between border-t border-line p-3">
        <ThemeToggle />
        <a href="/api/auth/logout" className="text-xs text-muted hover:text-fg">
          Disconnect
        </a>
      </div>
    </aside>
  )
}

const LAYOUTS: { value: LayoutMode; label: string }[] = [
  { value: 'radial', label: 'Radial' },
  { value: 'force', label: 'Force' },
]

function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-md bg-soft p-0.5 text-xs">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded py-1 transition',
            option.value === value ? 'bg-panel font-medium shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function LinkSwatch({ kind }: { kind: LinkKind }) {
  const stroke = kind === 'blocks' ? '#d64545' : 'currentColor'
  return (
    <svg width="24" height="8" className="shrink-0 text-muted" aria-hidden="true">
      <line
        x1="1"
        y1="4"
        x2={kind === 'blocks' ? 17 : 23}
        y2="4"
        stroke={stroke}
        strokeWidth="1.25"
        strokeDasharray={kind === 'related' ? '4 3' : kind === 'duplicate' ? '1.5 3' : undefined}
      />
      {kind === 'blocks' && <path d="M16 1 L23 4 L16 7 Z" fill={stroke} />}
    </svg>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx('relative h-4 w-7 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}
    >
      <span className={cx('absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition', checked && 'translate-x-3')} />
    </button>
  )
}
