import { NextResponse } from 'next/server'
import { AuthError } from './linear'

/** Runs a Linear-backed handler and maps failures to JSON responses. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn())
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: 401 })
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Linear request failed' }, { status: 502 })
  }
}
