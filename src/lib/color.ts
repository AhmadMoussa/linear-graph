import { CATEGORICAL, COMPLETED, NEUTRAL, PRIORITIES, PRIORITY_ORDER, STATE_ORDER } from './palette'
import type { Issue, WorkflowState } from './types'

export type ColorMode = 'priority' | 'status' | 'project' | 'assignee'

export const COLOR_MODES: { mode: ColorMode; label: string }[] = [
  { mode: 'priority', label: 'Priority' },
  { mode: 'status', label: 'Status' },
  { mode: 'project', label: 'Project' },
  { mode: 'assignee', label: 'Assignee' },
]

export interface Category {
  key: string
  label: string
  color: string
  count: number
  /** Present when the category is a workflow state, so the legend can show its icon. */
  state?: WorkflowState
}

export interface Coloring {
  keyOf: (issue: Issue) => string
  colorOf: (issue: Issue) => string
  categories: Category[]
}

const MODE_KEY: Record<ColorMode, (issue: Issue) => string> = {
  priority: (i) => String(i.priority),
  status: (i) => i.state.id,
  project: (i) => i.project?.id ?? 'none',
  assignee: (i) => i.assignee?.id ?? 'none',
}

/** Closed issues keep the same color in every mode: green when completed, grey when canceled. */
const closedKey = (issue: Issue) => (CLOSED.some((s) => s.type === issue.state.type) ? issue.state.type : null)

const CLOSED: WorkflowState[] = [
  { id: 'completed', name: 'Completed', color: COMPLETED, type: 'completed' },
  { id: 'canceled', name: 'Canceled', color: NEUTRAL, type: 'canceled' },
  { id: 'duplicate', name: 'Duplicate', color: NEUTRAL, type: 'duplicate' },
]

export function colorize(issues: Issue[], mode: ColorMode): Coloring {
  const keyOf = (issue: Issue) => closedKey(issue) ?? MODE_KEY[mode](issue)
  const counts = new Map<string, number>()
  for (const issue of issues) counts.set(keyOf(issue), (counts.get(keyOf(issue)) ?? 0) + 1)
  const count = (key: string) => counts.get(key) ?? 0
  const open = issues.filter((i) => !closedKey(i))

  let categories: Category[]
  if (mode === 'priority') {
    categories = PRIORITY_ORDER.map((p) => ({ key: String(p), ...PRIORITIES[p], count: count(String(p)) }))
  } else if (mode === 'status') {
    const states = new Map(open.map((i) => [i.state.id, i.state]))
    categories = [...states.values()]
      .sort((a, b) => STATE_ORDER[a.type] - STATE_ORDER[b.type] || a.name.localeCompare(b.name))
      .map((s) => ({ key: s.id, label: s.name, color: s.color, count: count(s.id), state: s }))
  } else {
    const groups = new Map<string, { label: string; color: string | null }>()
    for (const i of open) {
      const entity = mode === 'project' ? i.project : i.assignee
      if (entity) groups.set(entity.id, { label: entity.name, color: 'color' in entity ? entity.color : null })
    }
    categories = [...groups]
      .sort(([a], [b]) => count(b) - count(a))
      .map(([key, group], index) => ({
        key,
        label: group.label,
        color: group.color ?? CATEGORICAL[index % CATEGORICAL.length],
        count: count(key),
      }))
    if (counts.has('none')) {
      categories.push({ key: 'none', label: mode === 'project' ? 'No project' : 'Unassigned', color: NEUTRAL, count: count('none') })
    }
  }
  for (const closed of CLOSED) if (counts.has(closed.id)) categories.push({ key: closed.id, label: closed.name, color: closed.color, count: count(closed.id), state: closed })

  const colors = new Map(categories.map((c) => [c.key, c.color]))
  return { keyOf, categories, colorOf: (issue) => colors.get(keyOf(issue)) ?? NEUTRAL }
}
