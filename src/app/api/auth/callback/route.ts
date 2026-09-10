import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCode } from '@/lib/linear'
import { SESSION_COOKIE, SESSION_MAX_AGE, STATE_COOKIE, appUrl, cookieOptions, seal } from '@/lib/session'

export async function GET(req: NextRequest) {
  const base = appUrl(req)
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const expectedState = req.cookies.get(STATE_COOKIE)?.value

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${base}/?error=state`)
  }
  try {
    const session = await exchangeCode(code, `${base}/api/auth/callback`)
    const res = NextResponse.redirect(`${base}/`)
    res.cookies.set(SESSION_COOKIE, await seal(session), { ...cookieOptions, maxAge: SESSION_MAX_AGE })
    res.cookies.delete(STATE_COOKIE)
    return res
  } catch (error) {
    console.error('OAuth callback failed:', error)
    const reason = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.redirect(`${base}/?error=token&reason=${encodeURIComponent(reason.slice(0, 160))}`)
  }
}
