import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export interface Session {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export const SESSION_COOKIE = 'lg_session'
export const STATE_COOKIE = 'lg_oauth_state'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export const appUrl = (req: NextRequest) => (process.env.APP_URL ?? req.nextUrl.origin).replace(/\/$/, '')

let keyPromise: Promise<CryptoKey> | undefined

function key() {
  return (keyPromise ??= (async () => {
    const secret = process.env.SESSION_SECRET
    if (!secret || secret.length < 16) throw new Error('SESSION_SECRET is not set (needs 16+ characters)')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
    return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
  })())
}

/** Encrypts the session (AES-GCM) into a cookie-safe string. */
export async function seal(session: Session) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(session))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), plaintext)
  return Buffer.concat([Buffer.from(iv), Buffer.from(ciphertext)]).toString('base64url')
}

export async function unseal(value: string): Promise<Session | null> {
  try {
    const bytes = new Uint8Array(Buffer.from(value, 'base64url'))
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await key(), bytes.slice(12))
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    return null
  }
}

export async function readSession() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value
  return value ? unseal(value) : null
}

export async function writeSession(session: Session) {
  ;(await cookies()).set(SESSION_COOKIE, await seal(session), { ...cookieOptions, maxAge: SESSION_MAX_AGE })
}
