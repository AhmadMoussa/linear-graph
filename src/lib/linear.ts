import { readSession, writeSession, type Session } from './session'
import type { Issue, IssueDetail, Me, Team, TeamData } from './types'

const API_URL = 'https://api.linear.app/graphql'
const OAUTH_URL = 'https://api.linear.app/oauth'

export class AuthError extends Error {}

function credentials() {
  const { LINEAR_CLIENT_ID: id, LINEAR_CLIENT_SECRET: secret } = process.env
  if (!id || !secret) throw new Error('LINEAR_CLIENT_ID and LINEAR_CLIENT_SECRET must be set')
  return { id, secret }
}

export function authorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: credentials().id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read',
    state,
  })
  return `https://linear.app/oauth/authorize?${params}`
}

async function requestToken(params: Record<string, string>): Promise<Session> {
  const { id, secret } = credentials()
  const res = await fetch(`${OAUTH_URL}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...params }),
  })
  if (!res.ok) throw new AuthError(`Linear token request failed (${res.status})`)
  const json = await res.json()
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + (json.expires_in ?? 86400) * 1000,
  }
}

export const exchangeCode = (code: string, redirectUri: string) =>
  requestToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })

export async function revoke(accessToken: string) {
  await fetch(`${OAUTH_URL}/revoke`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}` } }).catch(() => undefined)
}

/** Returns a valid access token, refreshing (and re-writing the cookie) when it is about to expire. */
async function accessToken() {
  const session = await readSession()
  if (!session) throw new AuthError('Not connected to Linear')
  if (session.expiresAt - Date.now() > 60_000 || !session.refreshToken) return session.accessToken
  const fresh = await requestToken({ grant_type: 'refresh_token', refresh_token: session.refreshToken })
  await writeSession(fresh)
  return fresh.accessToken
}

interface GraphQLError {
  message: string
  extensions?: { type?: string }
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify({ query, variables }),
  })
  if (res.status === 401) throw new AuthError('Linear session expired')
  const { data, errors } = (await res.json()) as { data: T; errors?: GraphQLError[] }
  if (errors?.length) {
    if (errors.some((e) => /authentication/i.test(e.extensions?.type ?? ''))) throw new AuthError('Linear session expired')
    throw new Error(errors[0].message)
  }
  return data
}

export async function fetchMe(): Promise<Me> {
  const data = await gql<{ viewer: Me['user']; organization: Me['organization']; teams: { nodes: Team[] } }>(`{
    viewer { name avatarUrl }
    organization { name }
    teams(first: 100) { nodes { id name key color } }
  }`)
  return { user: data.viewer, organization: data.organization, teams: data.teams.nodes }
}

// Linear caps a single query at 10,000 complexity points and nested connections
// multiply by their page size, so pages stay small and nested lists are bounded.
const TEAM_ISSUES = `query TeamIssues($teamId: String!, $after: String) {
  team(id: $teamId) {
    id name key color
    states(first: 50) { nodes { id type position } }
    issues(first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id identifier title priority estimate url createdAt updatedAt
        state { id name color type }
        assignee { id name avatarUrl }
        labels(first: 10) { nodes { id name color } }
        project { id name color }
        parent { id }
        relations(first: 15) { nodes { type relatedIssue { id } } }
      }
    }
  }
}`

type RawIssue = Omit<Issue, 'labels' | 'parentId' | 'relations'> & {
  labels: { nodes: Issue['labels'] }
  parent: { id: string } | null
  relations: { nodes: { type: string; relatedIssue: { id: string } }[] }
}

interface TeamIssuesPage {
  team: Team & {
    states: { nodes: { id: string; type: string; position: number }[] }
    issues: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RawIssue[] }
  }
}

const toIssue = ({ labels, parent, relations, ...issue }: RawIssue): Issue => ({
  ...issue,
  labels: labels.nodes,
  parentId: parent?.id ?? null,
  relations: relations.nodes.map((r) => ({ type: r.type, issueId: r.relatedIssue.id })),
})

export async function fetchTeamIssues(teamId: string): Promise<TeamData> {
  const issues: Issue[] = []
  let team: Team | undefined
  let progress = new Map<string, number>()
  let after: string | null = null
  do {
    const { team: page }: TeamIssuesPage = await gql(TEAM_ISSUES, { teamId, after })
    if (!team) {
      team = { id: page.id, name: page.name, key: page.key, color: page.color }
      progress = startedProgress(page.states.nodes)
    }
    issues.push(...page.issues.nodes.map(toIssue))
    after = page.issues.pageInfo.hasNextPage ? page.issues.pageInfo.endCursor : null
  } while (after)
  for (const issue of issues) {
    const p = progress.get(issue.state.id)
    if (p !== undefined) issue.state.progress = p
  }
  return { team: team!, issues }
}

/** Linear draws started states as a pie that fills as the state sits further along the workflow. */
function startedProgress(states: { id: string; type: string; position: number }[]) {
  const started = states.filter((s) => s.type === 'started').sort((a, b) => a.position - b.position)
  return new Map(started.map((s, i) => [s.id, (i + 1) / (started.length + 1)]))
}

export async function fetchIssueDetail(id: string): Promise<IssueDetail> {
  const data = await gql<{ issue: IssueDetail }>(`query Issue($id: String!) { issue(id: $id) { description } }`, { id })
  return data.issue
}
