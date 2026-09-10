'use client'

import { Loader2, Maximize2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DetailPanel } from './detail-panel'
import { GraphCanvas, type GraphHandle } from './graph-canvas'
import { Sidebar } from './sidebar'
import { colorize, type ColorMode } from '@/lib/color'
import { EMPTY_GRAPH, LINK_KINDS, TEAM_NODE_ID, buildGraph, type GraphNode, type LayoutMode, type LinkKind } from '@/lib/graph'
import { NEUTRAL } from '@/lib/palette'
import { type Issue, type TeamData, isClosed } from '@/lib/types'
import { useApi } from '@/lib/use-api'

const NO_ISSUES: Issue[] = []

// Floating panel geometry; the widths mirror the Tailwind classes on the panels.
const SIDEBAR_WIDTH = 256
const PANEL_WIDTH = 360
const MARGIN = 16

/** True when the viewport is wide enough to show the overview panel without a selection. */
function useWideViewport() {
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

export function Explorer({ teamId }: { teamId: string }) {
  const { data, error, loading, reload } = useApi<TeamData>(`/api/teams/${teamId}/issues`)
  const [layout, setLayout] = useState<LayoutMode>('radial')
  const [mode, setMode] = useState<ColorMode>('priority')
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [linkKinds, setLinkKinds] = useState<Set<LinkKind>>(() => new Set(LINK_KINDS.map((k) => k.kind)))
  const [showClosed, setShowClosed] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const canvas = useRef<GraphHandle>(null)
  const wide = useWideViewport()

  const issues = data?.issues ?? NO_ISSUES
  const team = data?.team
  const shown = useMemo(() => (showClosed ? issues : issues.filter((i) => !isClosed(i))), [issues, showClosed])
  const coloring = useMemo(() => colorize(shown, mode), [shown, mode])
  const visible = useMemo(
    () => (hidden.size ? shown.filter((i) => !hidden.has(coloring.keyOf(i))) : shown),
    [shown, hidden, coloring],
  )
  const graph = useMemo(() => (team ? buildGraph(visible, linkKinds, team, layout) : EMPTY_GRAPH), [visible, linkKinds, team, layout])
  const colorOf = useCallback((n: GraphNode) => (n.issue ? coloring.colorOf(n.issue) : NEUTRAL), [coloring])
  const byId = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues])
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null
  const panelVisible = wide || selected !== null
  const insets = useMemo(
    () => ({ left: SIDEBAR_WIDTH + MARGIN * 2, right: panelVisible ? PANEL_WIDTH + MARGIN * 2 : MARGIN }),
    [panelVisible],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return shown.filter((i) => i.identifier.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))
  }, [shown, query])

  // Neighbourhood of the selection, or the search hits; everything else is dimmed.
  const focus = useMemo(() => {
    if (selectedId) {
      const ids = new Set([selectedId])
      for (const link of graph.links) {
        if (link.source.id === selectedId) ids.add(link.target.id)
        if (link.target.id === selectedId) ids.add(link.source.id)
      }
      return ids
    }
    return matches ? new Set(matches.map((i) => i.id)) : null
  }, [selectedId, matches, graph])

  const stats = useMemo(() => {
    const parents = new Set(issues.flatMap((i) => (i.parentId ? [i.parentId] : [])))
    const closed = issues.filter(isClosed).length
    return { total: issues.length, open: issues.length - closed, closed, parents: parents.size }
  }, [issues])

  const select = useCallback((id: string | null, fly = false) => {
    setSelectedId(id)
    if (id && fly) canvas.current?.focusNode(id)
  }, [])

  const changeLayout = (next: LayoutMode) => {
    setLayout(next)
    if (selectedId === TEAM_NODE_ID) setSelectedId(null)
  }
  const changeMode = (next: ColorMode) => {
    setMode(next)
    setHidden(new Set())
  }
  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set)
    if (!next.delete(value)) next.add(value)
    return next
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelectedId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!data || !team) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted">
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-fg">Couldn&apos;t load issues.</p>
            <p>{error}</p>
            <button type="button" onClick={reload} className="button mt-2">
              Retry
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin" /> Fetching issues from Linear…
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative h-dvh overflow-hidden">
      <GraphCanvas
        ref={canvas}
        nodes={graph.nodes}
        links={graph.links}
        layout={layout}
        insets={insets}
        statusIcons={mode === 'status'}
        colorOf={colorOf}
        selectedId={selectedId}
        focus={focus}
        onSelect={select}
      />
      <Sidebar
        team={team}
        total={issues.length}
        layout={layout}
        onLayout={changeLayout}
        mode={mode}
        onMode={changeMode}
        categories={coloring.categories}
        hidden={hidden}
        onToggleCategory={(key) => setHidden((set) => toggle(set, key))}
        linkKinds={linkKinds}
        onToggleKind={(kind) => setLinkKinds((set) => toggle(set, kind))}
        showClosed={showClosed}
        onShowClosed={setShowClosed}
        query={query}
        onQuery={setQuery}
        matches={matches}
        onPick={(id) => {
          select(id, true)
          setQuery('')
        }}
      />

      <div
        className="pointer-events-none absolute bottom-4 z-10 flex items-center justify-between"
        style={{ left: insets.left, right: insets.right }}
      >
        <p className="text-xs text-muted">
          {visible.length} of {issues.length} issues
          {error && <span className="text-red-500"> · refresh failed: {error}</span>}
        </p>
        <div className="pointer-events-auto flex gap-1">
          <button type="button" onClick={() => canvas.current?.fit()} className="icon-button" title="Fit to view">
            <Maximize2 size={15} />
          </button>
          <button type="button" onClick={reload} className="icon-button" title="Refresh from Linear">
            <RefreshCw size={15} className={loading ? 'animate-spin' : undefined} />
          </button>
        </div>
      </div>

      <DetailPanel
        team={team}
        issue={selected}
        issues={byId}
        stats={stats}
        onSelect={(id) => select(id, true)}
        onClose={() => select(null)}
      />
    </div>
  )
}
