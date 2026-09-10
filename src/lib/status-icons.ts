import type { WorkflowState } from './types'

// Path data taken from Linear's own 16×16 status icons (outer radius 7, centred on 8,8).
const RING = 'M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1m0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11'
const DISC = 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1'
const BACKLOG =
  'm14.94 8.914-1.982-.258a5 5 0 0 0 0-1.312l1.983-.258a7 7 0 0 1 0 1.828M14.47 5.32a7 7 0 0 0-.915-1.581l-1.586 1.218q.4.52.653 1.13zm-2.207-2.874-1.22 1.586a5 5 0 0 0-1.129-.653l.767-1.848c.569.236 1.1.545 1.582.915M8.914 1.06l-.258 1.983a5 5 0 0 0-1.312 0L7.086 1.06a7 7 0 0 1 1.828 0m-3.594.472.767 1.848a5 5 0 0 0-1.13.653L3.74 2.446a7 7 0 0 1 1.581-.915M2.446 3.74l1.586 1.218a5 5 0 0 0-.653 1.13L1.53 5.32a7 7 0 0 1 .915-1.581M1.06 7.086a7 7 0 0 0 0 1.828l1.983-.258a5 5 0 0 1 0-1.312zm.472 3.594 1.848-.767q.254.61.653 1.13l-1.586 1.219a7 7 0 0 1-.915-1.582m2.208 2.874 1.218-1.586q.52.4 1.13.653L5.32 14.47a7 7 0 0 1-1.581-.915m3.347 1.387.258-1.983a5 5 0 0 0 1.312 0l.258 1.983a7 7 0 0 1-1.828 0m3.594-.472-.767-1.848a5 5 0 0 0 1.13-.653l1.219 1.586a7 7 0 0 1-1.582.915m2.874-2.207-1.586-1.22c.265-.344.485-.723.653-1.129l1.848.767a7 7 0 0 1-.915 1.582'
const DONE = `${DISC}m4.101 5.101a.85.85 0 1 0-1.202-1.202L6.5 9.298 5.101 7.899a.85.85 0 1 0-1.202 1.202l2 2a.85.85 0 0 0 1.202 0z`
const TRIAGE =
  'M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14m1.013-4.492V8.982H6.987v1.526c0 .421-.51.647-.838.37L3.174 8.372a.482.482 0 0 1 0-.742L6.15 5.121c.328-.276.838-.05.838.371v1.526h2.026V5.492c0-.421.51-.647.838-.37l2.975 2.507a.48.48 0 0 1 0 .742L9.85 10.879c-.328.276-.838.05-.838-.371'
// Linear's sprite has no canceled icon; this mirrors the done icon with a cross cut out.
const CANCELED = `${DISC}M5.05 3.95 8 6.9l2.95-2.95 1.1 1.1L9.1 8l2.95 2.95-1.1 1.1L8 9.1l-2.95 2.95-1.1-1.1L6.9 8 3.95 5.05z`

/** Pie wedge of radius 4 starting at 12 o'clock, as in Linear's in-progress and in-review icons. */
const pie = (fraction: number) => {
  const f = Math.min(0.999, Math.max(0.01, fraction))
  const angle = Math.PI * 2 * f
  const x = (8 + 4 * Math.sin(angle)).toFixed(3)
  const y = (8 - 4 * Math.cos(angle)).toFixed(3)
  return `M8 8V4A4 4 0 ${f > 0.5 ? 1 : 0} 1 ${x} ${y}Z`
}

export interface IconPath {
  d: string
  rule: CanvasFillRule
}

export function statusPaths(state: Pick<WorkflowState, 'type' | 'progress'>): IconPath[] {
  switch (state.type) {
    case 'triage':
      return [{ d: TRIAGE, rule: 'evenodd' }]
    case 'backlog':
      return [{ d: BACKLOG, rule: 'nonzero' }]
    case 'unstarted':
      return [{ d: RING, rule: 'nonzero' }]
    case 'started':
      return [{ d: RING, rule: 'nonzero' }, { d: pie(state.progress ?? 0.5), rule: 'nonzero' }]
    case 'completed':
      return [{ d: DONE, rule: 'evenodd' }]
    case 'canceled':
    case 'duplicate':
      return [{ d: CANCELED, rule: 'evenodd' }]
    default:
      return [{ d: RING, rule: 'nonzero' }]
  }
}
