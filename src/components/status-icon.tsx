import { statusPaths } from '@/lib/status-icons'
import type { WorkflowState } from '@/lib/types'

/** Linear's workflow status icon, drawn in the state's color. */
export function StatusIcon({ state, size = 14 }: { state: Pick<WorkflowState, 'type' | 'progress' | 'color'>; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill={state.color} className="shrink-0" aria-hidden="true">
      {statusPaths(state).map((p, i) => (
        <path key={i} d={p.d} fillRule={p.rule} />
      ))}
    </svg>
  )
}
