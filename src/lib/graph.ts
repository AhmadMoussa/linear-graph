import type { SimulationNodeDatum } from 'd3-force'
import { layoutRadial } from './layout'
import type { Issue, Team } from './types'

export type LayoutMode = 'radial' | 'force'

export type LinkKind = 'team' | 'child' | 'blocks' | 'related' | 'duplicate'

export const LINK_KINDS: { kind: LinkKind; label: string }[] = [
  { kind: 'team', label: 'Team' },
  { kind: 'child', label: 'Sub-issue' },
  { kind: 'blocks', label: 'Blocks' },
  { kind: 'related', label: 'Related' },
  { kind: 'duplicate', label: 'Duplicate' },
]

export const TEAM_NODE_ID = 'team'

export interface GraphNode extends SimulationNodeDatum {
  id: string
  /** null for the team hub at the centre */
  issue: Issue | null
  team: Team | null
  childCount: number
  radius: number
  /** layout anchor the simulation pulls the node towards */
  ax: number
  ay: number
}

export interface GraphLink {
  source: GraphNode
  target: GraphNode
  kind: LinkKind
}

export interface Graph {
  nodes: GraphNode[]
  links: GraphLink[]
}

export const EMPTY_GRAPH: Graph = { nodes: [], links: [] }

export const labelOf = (node: GraphNode) =>
  node.issue
    ? { identifier: node.issue.identifier, title: node.issue.title }
    : { identifier: node.team?.key ?? '', title: node.team?.name ?? '' }

const relationKind = (type: string): LinkKind =>
  type === 'blocks' ? 'blocks' : type === 'duplicate' ? 'duplicate' : 'related'

export function buildGraph(issues: Issue[], kinds: Set<LinkKind>, team: Team, layout: LayoutMode): Graph {
  const ids = new Set(issues.map((i) => i.id))
  const parentOf = (issue: Issue) => (issue.parentId && ids.has(issue.parentId) ? issue.parentId : null)
  const childCount = new Map<string, number>()
  for (const issue of issues) {
    const parent = parentOf(issue)
    if (parent) childCount.set(parent, (childCount.get(parent) ?? 0) + 1)
  }

  // The radial layout hangs top-level issues off a central team hub; the force layout has no hub.
  const root: GraphNode | null = layout === 'radial' ? { id: TEAM_NODE_ID, issue: null, team, childCount: 0, radius: 12, ax: 0, ay: 0 } : null
  const nodes = root ? [root] : []
  const byId = new Map<string, GraphNode>()
  for (const issue of issues) {
    const children = childCount.get(issue.id) ?? 0
    const node: GraphNode = { id: issue.id, issue, team: null, childCount: children, radius: 4 + Math.min(10, Math.sqrt(children) * 3), ax: 0, ay: 0 }
    nodes.push(node)
    byId.set(issue.id, node)
  }

  const links: GraphLink[] = []
  const seen = new Set<string>()
  const add = (source: GraphNode, target: GraphNode, kind: LinkKind) => {
    if (!kinds.has(kind) || source === target) return
    const key = kind === 'blocks' ? `${kind}:${source.id}>${target.id}` : `${kind}:${[source.id, target.id].sort().join('|')}`
    if (seen.has(key)) return
    seen.add(key)
    links.push({ source, target, kind })
  }
  for (const issue of issues) {
    const node = byId.get(issue.id)!
    const parent = parentOf(issue)
    if (parent) add(byId.get(parent)!, node, 'child')
    else if (root) {
      root.childCount++
      add(root, node, 'team')
    }
    for (const relation of issue.relations) {
      const other = byId.get(relation.issueId)
      if (other) add(node, other, relationKind(relation.type))
    }
  }

  if (root) layoutRadial(root, nodes)
  return { nodes, links }
}
