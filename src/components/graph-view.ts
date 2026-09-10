import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import { labelOf, type GraphLink, type GraphNode, type LayoutMode } from '@/lib/graph'
import { CANVAS, type CanvasPalette } from '@/lib/palette'
import { statusPaths } from '@/lib/status-icons'
import { isCanceled, type WorkflowState } from '@/lib/types'

export interface ViewProps {
  nodes: GraphNode[]
  links: GraphLink[]
  layout: LayoutMode
  /** Horizontal space covered by floating panels, so fitting centres on what is actually visible. */
  insets: { left: number; right: number }
  /** Draw nodes as Linear status icons instead of dots. */
  statusIcons: boolean
  colorOf: (node: GraphNode) => string
  selectedId: string | null
  focus: Set<string> | null
  onSelect: (id: string | null) => void
}

export interface GraphView {
  setData(nodes: GraphNode[], links: GraphLink[]): void
  setPalette(palette: CanvasPalette): void
  redraw(): void
  fit(animate?: boolean): void
  /** Re-fit after the visible area changed, unless the user has taken over the camera. */
  refit(): void
  focusNode(id: string): void
  destroy(): void
}

interface Transform {
  x: number
  y: number
  k: number
}

interface Drag {
  node: GraphNode | null
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8
const BEND = 0.4 // how far relation curves bow towards the centre
const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k))
const jitter = () => (Math.random() - 0.5) * 8
const isHierarchy = (kind: GraphLink['kind']) => kind === 'team' || kind === 'child'

const iconCache = new Map<string, { path: Path2D; rule: CanvasFillRule }[]>()
const statusIcon = (state: WorkflowState) => {
  const key = `${state.type}:${state.progress ?? ''}`
  let icon = iconCache.get(key)
  if (!icon) {
    icon = statusPaths(state).map((p) => ({ path: new Path2D(p.d), rule: p.rule }))
    iconCache.set(key, icon)
  }
  return icon
}

/**
 * Owns the simulation, the canvas rendering and all pointer interaction. In the radial layout
 * nodes are pulled towards their anchors and kept apart by collision; in the force layout links,
 * charge and a weak centre pull do the work. React feeds it data and reads back selections
 * through `getProps().onSelect`.
 */
export function createGraphView(canvas: HTMLCanvasElement, getProps: () => ViewProps): GraphView {
  const ctx = canvas.getContext('2d')!
  const font = getComputedStyle(canvas).fontFamily
  let palette: CanvasPalette = CANVAS.light
  let width = 0
  let height = 0
  let dpr = 1
  let transform: Transform = { x: 0, y: 0, k: 1 }
  let nodes: GraphNode[] = []
  let links: GraphLink[] = []
  let hovered: GraphNode | null = null
  let drag: Drag | null = null
  let dirty = true
  let fresh = true
  let layout: LayoutMode = 'radial'
  let autoFit = true // keep the whole graph framed until the user moves the camera
  let animation = 0
  const positions = new Map<string, { x: number; y: number }>()

  const linkForce = forceLink<GraphNode, GraphLink>()
    .distance((l) => (l.kind === 'child' ? 14 + l.source.radius + l.target.radius : 80))
    .strength((l) => (l.kind === 'child' ? 0.8 : 0.08))

  const simulation = forceSimulation<GraphNode>()
    .on('tick', () => {
      dirty = true
      if (autoFit) fit(false)
    })
    .stop()

  const applyLayout = () => {
    if (layout === 'radial') {
      simulation
        .force('link', null)
        .force('charge', null)
        .force('x', forceX<GraphNode>((n) => n.ax).strength(0.4))
        .force('y', forceY<GraphNode>((n) => n.ay).strength(0.4))
        .force('collide', forceCollide<GraphNode>((n) => n.radius + 2).strength(1))
    } else {
      simulation
        .force('link', linkForce.links(links))
        .force('charge', forceManyBody<GraphNode>().strength((n) => -20 - n.radius * 4).distanceMax(400))
        .force('x', forceX<GraphNode>(0).strength(0.05))
        .force('y', forceY<GraphNode>(0).strength(0.05))
        .force('collide', forceCollide<GraphNode>((n) => n.radius + 1.5).strength(0.8))
    }
  }

  // --- geometry -------------------------------------------------------------

  const toWorld = (sx: number, sy: number) => ({ x: (sx - transform.x) / transform.k, y: (sy - transform.y) / transform.k })
  const project = (x: number, y: number) => ({ x: x * transform.k + transform.x, y: y * transform.k + transform.y })
  const toScreen = (n: GraphNode) => ({ ...project(n.x ?? 0, n.y ?? 0), r: Math.max(1.5, n.radius * transform.k) })
  const offscreen = (x: number, y: number) => x < -40 || y < -40 || x > width + 40 || y > height + 40

  const pointer = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const nodeAt = (sx: number, sy: number) => {
    const p = toWorld(sx, sy)
    const n = simulation.find(p.x, p.y, 24 / transform.k)
    return n && Math.hypot((n.x ?? 0) - p.x, (n.y ?? 0) - p.y) <= n.radius + 4 / transform.k ? n : null
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    dpr = window.devicePixelRatio || 1
    width = rect.width
    height = rect.height
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    if (autoFit) fit(false)
    dirty = true
  }

  // --- camera ---------------------------------------------------------------

  const animateTo = (target: Transform, duration = 450) => {
    autoFit = false
    const from = { ...transform }
    const start = performance.now()
    cancelAnimationFrame(animation)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const e = 1 - (1 - t) ** 3
      transform = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        k: from.k + (target.k - from.k) * e,
      }
      dirty = true
      if (t < 1) animation = requestAnimationFrame(step)
    }
    animation = requestAnimationFrame(step)
  }

  const viewport = () => {
    const { insets } = getProps()
    const w = Math.max(1, width - insets.left - insets.right)
    return { w, h: height, cx: insets.left + w / 2, cy: height / 2 }
  }

  const fit = (animate = true) => {
    autoFit = true
    if (!width || !height || !nodes.length) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, (n.x ?? 0) - n.radius)
      maxX = Math.max(maxX, (n.x ?? 0) + n.radius)
      minY = Math.min(minY, (n.y ?? 0) - n.radius)
      maxY = Math.max(maxY, (n.y ?? 0) + n.radius)
    }
    const pad = 40
    const view = viewport()
    const k = clampZoom(Math.min((view.w - pad * 2) / Math.max(1, maxX - minX), (view.h - pad * 2) / Math.max(1, maxY - minY), 2.5))
    const target = { k, x: view.cx - ((minX + maxX) / 2) * k, y: view.cy - ((minY + maxY) / 2) * k }
    if (animate) {
      animateTo(target)
      autoFit = true
    } else {
      transform = target
      dirty = true
    }
  }

  const focusNode = (id: string) => {
    const n = nodes.find((node) => node.id === id)
    if (!n) return
    const k = Math.max(transform.k, 1.5)
    const view = viewport()
    animateTo({ k, x: view.cx - (n.x ?? 0) * k, y: view.cy - (n.y ?? 0) * k })
  }

  // --- data -----------------------------------------------------------------

  const placeFresh = (n: GraphNode, byId: Map<string, GraphNode>) => {
    if (layout === 'radial') {
      n.x = n.ax + jitter()
      n.y = n.ay + jitter()
      return
    }
    // Start next to the parent when it is already placed; otherwise d3 spreads the node out.
    const parent = n.issue?.parentId ? byId.get(n.issue.parentId) : undefined
    n.x = parent?.x !== undefined ? parent.x + jitter() * 3 : undefined
    n.y = parent?.y !== undefined ? parent.y + jitter() * 3 : undefined
  }

  const setData = (nextNodes: GraphNode[], nextLinks: GraphLink[]) => {
    const switched = layout !== getProps().layout
    layout = getProps().layout
    for (const n of nodes) if (n.x !== undefined && n.y !== undefined) positions.set(n.id, { x: n.x, y: n.y })
    const byId = new Map(nextNodes.map((n) => [n.id, n]))
    for (const n of nextNodes) {
      const p = positions.get(n.id)
      if (p) {
        n.x = p.x
        n.y = p.y
      } else {
        placeFresh(n, byId)
      }
    }
    nodes = nextNodes
    links = nextLinks
    hovered = null
    simulation.nodes(nodes)
    applyLayout()
    if (fresh && nodes.length) {
      fresh = false
      simulation.alpha(1).tick(layout === 'force' ? 180 : 60)
      fit(false)
      simulation.restart()
    } else if (switched) {
      // The physics carries nodes from one layout into the other; the camera follows along.
      autoFit = true
      simulation.alpha(1).restart()
    } else {
      simulation.alpha(0.5).restart()
    }
    dirty = true
  }

  // --- drawing --------------------------------------------------------------

  const circle = (x: number, y: number, r: number) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }

  const drawArrow = (x1: number, y1: number, x2: number, y2: number, offset: number) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const tipX = x2 - ux * offset
    const tipY = y2 - uy * offset
    const size = Math.min(6, len / 3)
    ctx.fillStyle = palette.blocks
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(tipX - ux * size - uy * size * 0.5, tipY - uy * size + ux * size * 0.5)
    ctx.lineTo(tipX - ux * size + uy * size * 0.5, tipY - uy * size - ux * size * 0.5)
    ctx.closePath()
    ctx.fill()
  }

  const drawLink = (l: GraphLink, dim: boolean) => {
    const s = toScreen(l.source)
    const t = toScreen(l.target)
    if (offscreen(s.x, s.y) && offscreen(t.x, t.y)) return
    ctx.globalAlpha = dim ? 0.12 : l.kind === 'team' ? 0.4 : 1
    ctx.strokeStyle = l.kind === 'blocks' ? palette.blocks : palette.link
    ctx.setLineDash(l.kind === 'related' ? [4, 4] : l.kind === 'duplicate' ? [1.5, 3] : [])
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    let tail = s
    if (isHierarchy(l.kind) || layout === 'force') {
      ctx.lineTo(t.x, t.y)
    } else {
      // In the radial layout relation links bow towards the centre so they arc over clusters instead of cutting through them.
      const mx = ((l.source.x ?? 0) + (l.target.x ?? 0)) / 2
      const my = ((l.source.y ?? 0) + (l.target.y ?? 0)) / 2
      const control = project(mx * (1 - BEND), my * (1 - BEND))
      ctx.quadraticCurveTo(control.x, control.y, t.x, t.y)
      tail = { ...control, r: 0 }
    }
    ctx.stroke()
    if (l.kind === 'blocks') drawArrow(tail.x, tail.y, t.x, t.y, t.r + 3)
  }

  const drawNode = (n: GraphNode, dim: boolean, selected: boolean) => {
    const { x, y, r } = toScreen(n)
    if (offscreen(x, y)) return
    const color = n.issue ? getProps().colorOf(n) : palette.text
    ctx.globalAlpha = dim ? 0.18 : 1
    ctx.lineWidth = 1.25
    if (n.issue && getProps().statusIcons) {
      // Linear's icons are drawn in a 16-unit box with an outer radius of 7.
      const s = r / 7
      ctx.save()
      ctx.translate(x - 8 * s, y - 8 * s)
      ctx.scale(s, s)
      ctx.fillStyle = color
      for (const { path, rule } of statusIcon(n.issue.state)) ctx.fill(path, rule)
      ctx.restore()
    } else {
      circle(x, y, r)
      if (n.issue && isCanceled(n.issue)) {
        ctx.strokeStyle = color
        ctx.stroke()
      } else {
        ctx.fillStyle = color
        ctx.fill()
      }
    }
    if (n.childCount > 0) {
      circle(x, y, r + 3)
      ctx.strokeStyle = color
      ctx.stroke()
    }
    if (selected || n === hovered) {
      circle(x, y, r + (n.childCount ? 6.5 : 3.5))
      ctx.strokeStyle = palette.text
      ctx.lineWidth = selected ? 1.5 : 1
      ctx.globalAlpha = selected ? 1 : 0.45
      ctx.stroke()
    }
  }

  const drawTooltip = (n: GraphNode) => {
    const { x, y, r } = toScreen(n)
    if (offscreen(x, y)) return
    const label = labelOf(n)
    const title = label.title.length > 56 ? `${label.title.slice(0, 55)}…` : label.title
    ctx.font = `600 12px ${font}`
    const idWidth = ctx.measureText(label.identifier).width
    ctx.font = `400 12px ${font}`
    const titleWidth = ctx.measureText(title).width
    const padX = 8
    const h = 26
    const w = idWidth + 6 + titleWidth + padX * 2
    const gap = r + (n.childCount ? 3 : 0) + 10
    const bx = x + gap + w > width - 8 ? x - gap - w : x + gap
    const by = y - h / 2
    ctx.globalAlpha = 1
    ctx.fillStyle = palette.tooltip
    ctx.strokeStyle = palette.link
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(bx, by, w, h, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = palette.muted
    ctx.font = `600 12px ${font}`
    ctx.fillText(label.identifier, bx + padX, y)
    ctx.fillStyle = palette.text
    ctx.font = `400 12px ${font}`
    ctx.fillText(title, bx + padX + idWidth + 6, y)
  }

  const draw = () => {
    const { selectedId, focus } = getProps()
    const dimmed = (id: string) => focus !== null && !focus.has(id)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, width, height)

    // Dimmed elements first so the focused neighbourhood renders on top.
    ctx.lineWidth = 1
    for (const dimPass of [true, false]) {
      for (const l of links) {
        const dim = dimmed(l.source.id) || dimmed(l.target.id)
        if (dim === dimPass) drawLink(l, dim)
      }
    }
    ctx.setLineDash([])
    for (const dimPass of [true, false]) {
      for (const n of nodes) {
        const dim = dimmed(n.id)
        if (dim === dimPass) drawNode(n, dim, n.id === selectedId)
      }
    }

    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
    const labelAll = transform.k >= 2.5
    const hot: GraphNode[] = []
    for (const n of nodes) {
      if (n.id === selectedId || n === hovered) {
        hot.push(n)
        continue
      }
      if ((!labelAll && n.childCount < 2) || dimmed(n.id)) continue
      const { x, y, r } = toScreen(n)
      if (offscreen(x, y)) continue
      const hub = !n.issue
      ctx.font = hub ? `600 12px ${font}` : `500 11px ${font}`
      ctx.fillStyle = hub ? palette.text : palette.muted
      ctx.fillText(hub ? labelOf(n).title : labelOf(n).identifier, x + r + 3 + 6, y)
    }
    for (const n of hot) drawTooltip(n)
    ctx.globalAlpha = 1
  }

  // --- interaction ----------------------------------------------------------

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    canvas.setPointerCapture(e.pointerId)
    const p = pointer(e)
    const node = nodeAt(p.x, p.y)
    drag = { node, startX: p.x, startY: p.y, originX: transform.x, originY: transform.y, moved: false }
    if (node) {
      node.fx = node.x
      node.fy = node.y
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    const p = pointer(e)
    if (!drag) {
      const n = nodeAt(p.x, p.y)
      if (n !== hovered) {
        hovered = n
        canvas.style.cursor = n ? 'pointer' : 'grab'
        dirty = true
      }
      return
    }
    if (!drag.moved) {
      if (Math.hypot(p.x - drag.startX, p.y - drag.startY) < 3) return
      drag.moved = true
      canvas.style.cursor = 'grabbing'
      if (drag.node) {
        autoFit = false
        simulation.alphaTarget(0.3).restart()
      }
    }
    if (drag.node) {
      const w = toWorld(p.x, p.y)
      drag.node.fx = w.x
      drag.node.fy = w.y
    } else {
      autoFit = false
      transform = { ...transform, x: drag.originX + (p.x - drag.startX), y: drag.originY + (p.y - drag.startY) }
    }
    dirty = true
  }

  const onPointerUp = () => {
    if (!drag) return
    const { node, moved } = drag
    drag = null
    if (node) {
      node.fx = null
      node.fy = null
      if (moved) {
        // In the radial layout a dragged node stays where it was dropped.
        node.ax = node.x ?? node.ax
        node.ay = node.y ?? node.ay
        simulation.nodes(nodes).alphaTarget(0)
      }
    }
    if (!moved) getProps().onSelect(node ? node.id : null)
    canvas.style.cursor = node ? 'pointer' : 'grab'
    dirty = true
  }

  const onPointerLeave = () => {
    if (drag || !hovered) return
    hovered = null
    dirty = true
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const p = pointer(e)
    const delta = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * (e.ctrlKey ? 0.01 : 0.0015)
    const k = clampZoom(transform.k * Math.exp(-delta))
    const ratio = k / transform.k
    autoFit = false
    transform = { k, x: p.x - (p.x - transform.x) * ratio, y: p.y - (p.y - transform.y) * ratio }
    dirty = true
  }

  // --- lifecycle ------------------------------------------------------------

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()
  canvas.style.cursor = 'grab'
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  let frame = requestAnimationFrame(function loop() {
    if (dirty) {
      dirty = false
      draw()
    }
    frame = requestAnimationFrame(loop)
  })

  return {
    setData,
    setPalette: (next) => {
      palette = next
      dirty = true
    },
    redraw: () => {
      dirty = true
    },
    fit,
    refit: () => {
      if (autoFit) fit(false)
    },
    focusNode,
    destroy: () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(animation)
      observer.disconnect()
      simulation.stop()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
    },
  }
}
