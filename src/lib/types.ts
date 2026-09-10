export type StateType = 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' | 'duplicate'

export interface WorkflowState {
  id: string
  name: string
  color: string
  type: StateType
  /** For started states: how far along the workflow this state sits, 0-1. Drives the pie icon. */
  progress?: number
}

export interface Issue {
  id: string
  identifier: string
  title: string
  /** 0 = none, 1 = urgent, 2 = high, 3 = medium, 4 = low */
  priority: number
  estimate: number | null
  url: string
  createdAt: string
  updatedAt: string
  state: WorkflowState
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  labels: { id: string; name: string; color: string }[]
  project: { id: string; name: string; color: string } | null
  parentId: string | null
  relations: { type: string; issueId: string }[]
}

export interface IssueDetail {
  description: string | null
}

export interface Team {
  id: string
  name: string
  key: string
  color: string | null
}

export interface TeamData {
  team: Team
  issues: Issue[]
}

export interface Me {
  user: { name: string; avatarUrl: string | null }
  organization: { name: string }
  teams: Team[]
}

export const isCanceled = (issue: Issue) => issue.state.type === 'canceled' || issue.state.type === 'duplicate'
export const isClosed = (issue: Issue) => issue.state.type === 'completed' || isCanceled(issue)
