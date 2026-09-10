export const PRIORITIES: Record<number, { label: string; color: string }> = {
  1: { label: 'Urgent', color: '#d64545' },
  2: { label: 'High', color: '#e07a3f' },
  3: { label: 'Medium', color: '#e3b23c' },
  4: { label: 'Low', color: '#3b7dd8' },
  0: { label: 'No priority', color: '#9c9c99' },
}
export const PRIORITY_ORDER = [1, 2, 3, 4, 0]
export const NEUTRAL = '#9c9c99'
export const COMPLETED = '#3fa35b'

// Green is reserved for completed issues, so it is deliberately absent here.
export const CATEGORICAL = [
  '#3b7dd8', '#e07a3f', '#8e5fd6', '#d64545', '#e3b23c',
  '#2aa6a0', '#c4508a', '#6b7a8f', '#a67c52',
]

export const STATE_ORDER: Record<string, number> = {
  triage: 0, backlog: 1, unstarted: 2, started: 3, completed: 4, canceled: 5, duplicate: 6,
}

export const CANVAS = {
  light: {
    bg: '#f4f4f2',
    link: 'rgba(0,0,0,0.2)',
    blocks: 'rgba(214,69,69,0.6)',
    text: '#1b1b1b',
    muted: '#7a7a78',
    tooltip: 'rgba(255,255,255,0.96)',
  },
  dark: {
    bg: '#0f1012',
    link: 'rgba(255,255,255,0.22)',
    blocks: 'rgba(232,96,96,0.65)',
    text: '#ededed',
    muted: '#9a9a9a',
    tooltip: 'rgba(22,23,25,0.96)',
  },
}
export type CanvasPalette = typeof CANVAS.light
