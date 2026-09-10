import type { GraphNode } from './graph'

const GAP = 6 // space between neighbouring clusters, in world units
const MIN_ORBIT = 14 // minimum distance between a parent and its children
const FAN = Math.PI * 1.15 // arc that sub-issues occupy around their parent, facing away from the centre

interface Subtree {
  node: GraphNode
  children: Subtree[]
  orbit: number // distance from this node to its children
  extent: number // radius of the circle enclosing this node's whole cluster
}

const projectName = (n: GraphNode) => n.issue?.project?.name ?? '￿'
const priorityRank = (n: GraphNode) => n.issue?.priority || 5
const identifier = (n: GraphNode) => n.issue?.identifier ?? ''
const compare = (a: GraphNode, b: GraphNode) =>
  projectName(a).localeCompare(projectName(b)) ||
  priorityRank(a) - priorityRank(b) ||
  identifier(a).localeCompare(identifier(b), undefined, { numeric: true })

/**
 * Radial cluster layout. The team hub sits at the origin, top-level issues on a ring around it,
 * and each issue's sub-issues fan out on the side facing away from the centre. Siblings are
 * spaced by the measured size of their clusters, so hierarchy links never cross. Writes the
 * result into each node's `ax`/`ay` anchor.
 */
export function layoutRadial(root: GraphNode, nodes: GraphNode[]) {
  const ids = new Set(nodes.map((n) => n.id))
  const childrenOf = new Map<string, GraphNode[]>()
  for (const n of nodes) {
    if (n === root) continue
    const parentId = n.issue?.parentId && ids.has(n.issue.parentId) ? n.issue.parentId : root.id
    const siblings = childrenOf.get(parentId)
    if (siblings) siblings.push(n)
    else childrenOf.set(parentId, [n])
  }

  const width = (t: Subtree) => 2 * t.extent + GAP

  const measure = (node: GraphNode, span: number): Subtree => {
    const children = (childrenOf.get(node.id) ?? []).sort(compare).map((c) => measure(c, FAN))
    if (!children.length) return { node, children, orbit: 0, extent: node.radius }
    const arc = children.reduce((sum, c) => sum + width(c), 0)
    const orbit = Math.max(MIN_ORBIT + node.radius, arc / span)
    return { node, children, orbit, extent: orbit + Math.max(...children.map((c) => c.extent)) }
  }

  const place = (tree: Subtree, x: number, y: number, heading: number, span: number) => {
    tree.node.ax = x
    tree.node.ay = y
    const total = tree.children.reduce((sum, c) => sum + width(c), 0)
    let angle = heading - span / 2
    for (const child of tree.children) {
      const slice = (span * width(child)) / total
      const direction = angle + slice / 2
      place(child, x + Math.cos(direction) * tree.orbit, y + Math.sin(direction) * tree.orbit, direction, FAN)
      angle += slice
    }
  }

  place(measure(root, Math.PI * 2), 0, 0, -Math.PI / 2, Math.PI * 2)
}
