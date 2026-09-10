import { NextResponse, type NextRequest } from 'next/server'
import { revoke } from '@/lib/linear'
import { SESSION_COOKIE, appUrl, readSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await readSession()
  if (session) await revoke(session.accessToken)
  const res = NextResponse.redirect(`${appUrl(req)}/`)
  res.cookies.delete(SESSION_COOKIE)
  return res
}
