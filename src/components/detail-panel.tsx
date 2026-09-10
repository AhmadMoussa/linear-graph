'use client'

import { ExternalLink, X } from 'lucide-react'
import { useMemo } from 'react'
import { Markdown } from './markdown'
import { StatusIcon } from './status-icon'
import { cx } from '@/lib/cx'
import { PRIORITIES } from '@/lib/palette'
import type { Issue, IssueDetail, Team } from '@/lib/types'
import { useApi } from '@/lib/use-api'

export interface Stats {
  total: number
  open: number
  closed: number
  parents: number
}

interface Props {
  team: Team
  issue: Issue | null
  issues: Map<string, Issue>
  stats: Stats
  onSelect: (id: string) => void
  onClose: () => void
}

export function DetailPanel({ team, issue, issues, stats, onSelect, onClose }: Props) {
  const detail = useApi<IssueDetail>(issue ? `/api/issues/${issue.id}` : null, true)
  const related = useMemo(() => issue && collectRelated(issue, issues), [issue, issues])

  return (
    <aside
      className={cx(
        // The overview is only shown when there is room for it; a selected issue always is.
        'floating absolute top-4 right-4 bottom-4 z-10 w-[360px] max-w-[calc(100%-2rem)] flex-col',
        issue ? 'flex' : 'hidden lg:flex',
      )}
    >
      {issue && related ? (
        <>
          <header className="flex items-start gap-2 border-b border-line p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-mono">{issue.identifier}</span>
                <a href={issue.url} target="_blank" rel="noreferrer" title="Open in Linear" className="hover:text-fg">
                  <ExternalLink size={12} />
                </a>
              </div>
              <h2 className="mt-1 text-[15px] leading-snug font-semibold">{issue.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="icon-button -mt-1 -mr-1" aria-label="Close">
              <X size={15} />
            </button>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[13px]">
              <dt className="text-muted">Status</dt>
              <dd className="flex items-center gap-2">
                <StatusIcon state={issue.state} /> {issue.state.name}
              </dd>
              <dt className="text-muted">Priority</dt>
              <dd className="flex items-center gap-2">
                <Dot color={PRIORITIES[issue.priority].color} /> {PRIORITIES[issue.priority].label}
              </dd>
              {issue.assignee && (
                <>
                  <dt className="text-muted">Assignee</dt>
                  <dd className="flex items-center gap-2">
                    {issue.assignee.avatarUrl ? (
                      <img src={issue.assignee.avatarUrl} alt="" className="h-4 w-4 rounded-full" />
                    ) : (
                      <Dot color="var(--muted)" />
                    )}
                    {issue.assignee.name}
                  </dd>
                </>
              )}
              {issue.project && (
                <>
                  <dt className="text-muted">Project</dt>
                  <dd className="flex items-center gap-2">
                    <Dot color={issue.project.color} /> {issue.project.name}
                  </dd>
                </>
              )}
              {issue.estimate !== null && (
                <>
                  <dt className="text-muted">Estimate</dt>
                  <dd>{issue.estimate}</dd>
                </>
              )}
              {issue.labels.length > 0 && (
                <>
                  <dt className="text-muted">Labels</dt>
                  <dd className="flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                      <span key={label.id} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs">
                        <Dot color={label.color} size={6} /> {label.name}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>

            <section>
              <h3 className="section-title">Description</h3>
              {detail.loading ? (
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-soft" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-soft" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-soft" />
                </div>
              ) : detail.error ? (
                <p className="text-[13px] text-red-500">{detail.error}</p>
              ) : detail.data?.description ? (
                <Markdown>{detail.data.description}</Markdown>
              ) : (
                <p className="text-[13px] text-muted">No description</p>
              )}
            </section>

            {related.parent && <IssueList title="Parent" issues={[related.parent]} onSelect={onSelect} />}
            <IssueList title="Sub-issues" issues={related.children} onSelect={onSelect} />
            <IssueList title="Blocks" issues={related.blocks} onSelect={onSelect} />
            <IssueList title="Blocked by" issues={related.blockedBy} onSelect={onSelect} />
            <IssueList title="Related" issues={related.related} onSelect={onSelect} />
            <IssueList title="Duplicates" issues={related.duplicates} onSelect={onSelect} />

            <p className="text-xs text-muted">
              Created {formatDate(issue.createdAt)} · Updated {formatDate(issue.updatedAt)}
            </p>
          </div>
        </>
      ) : (
        <Overview team={team} stats={stats} />
      )}
    </aside>
  )
}

function collectRelated(issue: Issue, issues: Map<string, Issue>) {
  const all = [...issues.values()]
  const outgoing = (...types: string[]) =>
    issue.relations.filter((r) => types.includes(r.type)).flatMap((r) => issues.get(r.issueId) ?? [])
  const incoming = (...types: string[]) =>
    all.filter((i) => i.relations.some((r) => types.includes(r.type) && r.issueId === issue.id))
  return {
    parent: issue.parentId ? (issues.get(issue.parentId) ?? null) : null,
    children: all.filter((i) => i.parentId === issue.id),
    blocks: outgoing('blocks'),
    blockedBy: incoming('blocks'),
    related: [...outgoing('related', 'similar'), ...incoming('related', 'similar')],
    duplicates: [...outgoing('duplicate'), ...incoming('duplicate')],
  }
}

function IssueList({ title, issues, onSelect }: { title: string; issues: Issue[]; onSelect: (id: string) => void }) {
  if (issues.length === 0) return null
  return (
    <section>
      <h3 className="section-title">
        {title}
        {issues.length > 1 && <span className="ml-1.5 text-muted/70">{issues.length}</span>}
      </h3>
      <ul className="-mx-2">
        {issues.map((issue) => (
          <li key={issue.id}>
            <button
              type="button"
              onClick={() => onSelect(issue.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-soft"
            >
              <StatusIcon state={issue.state} size={12} />
              <span className="shrink-0 font-mono text-xs text-muted">{issue.identifier}</span>
              <span className="truncate text-[13px]">{issue.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Overview({ team, stats }: { team: Team; stats: Stats }) {
  const rows: [string, number][] = [
    ['Issues', stats.total],
    ['Open', stats.open],
    ['Closed', stats.closed],
    ['With sub-issues', stats.parents],
  ]
  return (
    <div className="flex flex-1 flex-col p-5">
      <h2 className="text-sm font-semibold">{team.name}</h2>
      <p className="text-xs text-muted">{team.key} · team overview</p>
      <dl className="mt-4 space-y-2 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-muted">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 space-y-2 text-xs leading-relaxed text-muted">
        <p>Click a node to explore it. A ring marks an issue with sub-issues. Color by status to see Linear&apos;s status icons on the graph.</p>
        <p>Drag the canvas to pan, scroll to zoom, drag a node to move it.</p>
      </div>
    </div>
  )
}

function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
