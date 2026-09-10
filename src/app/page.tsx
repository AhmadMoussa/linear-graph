import { Landing } from '@/components/landing'
import { TeamPicker } from '@/components/team-picker'
import { readSession } from '@/lib/session'

const REQUIRED_ENV = ['LINEAR_CLIENT_ID', 'LINEAR_CLIENT_SECRET', 'SESSION_SECRET']

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string; reason?: string }> }) {
  const [session, { error, reason }] = await Promise.all([readSession(), searchParams])
  if (session) return <TeamPicker />
  const missing = REQUIRED_ENV.filter((name) => !process.env[name])
  return <Landing error={error} reason={reason} missing={missing} />
}
