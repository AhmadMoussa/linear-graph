import { NextResponse, type NextRequest } from 'next/server'
import { authorizeUrl } from '@/lib/linear'
import { STATE_COOKIE, appUrl, cookieOptions } from '@/lib/session'

export function GET(req: NextRequest) {
  if (!process.env.LINEAR_CLIENT_ID || !process.env.LINEAR_CLIENT_SECRET) {
    return NextResponse.redirect(`${appUrl(req)}/?error=config`)
  }
  const state = crypto.randomUUID()
  const res = NextResponse.redirect(authorizeUrl(`${appUrl(req)}/api/auth/callback`, state))
  res.cookies.set(STATE_COOKIE, state, { ...cookieOptions, maxAge: 600 })
  return res
}
