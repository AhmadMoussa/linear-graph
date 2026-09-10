'use client'

import { useTheme } from 'next-themes'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { createGraphView, type GraphView, type ViewProps } from './graph-view'
import { CANVAS } from '@/lib/palette'

export interface GraphHandle {
  fit: () => void
  focusNode: (id: string) => void
}

export function GraphCanvas({ ref, ...props }: ViewProps & { ref?: Ref<GraphHandle> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<GraphView | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const view = createGraphView(canvasRef.current!, () => propsRef.current)
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    viewRef.current?.setData(props.nodes, props.links)
  }, [props.nodes, props.links])

  useEffect(() => {
    viewRef.current?.setPalette(resolvedTheme === 'dark' ? CANVAS.dark : CANVAS.light)
  }, [resolvedTheme])

  useEffect(() => {
    viewRef.current?.redraw()
  }, [props.colorOf, props.selectedId, props.focus, props.statusIcons])

  useEffect(() => {
    viewRef.current?.refit()
  }, [props.insets])

  useImperativeHandle(ref, () => ({
    fit: () => viewRef.current?.fit(),
    focusNode: (id) => viewRef.current?.focusNode(id),
  }), [])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none select-none" />
}
