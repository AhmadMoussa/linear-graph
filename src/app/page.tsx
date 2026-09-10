import { Landing } from '@/components/landing'
import { TeamPicker } from '@/components/team-picker'
import { readSession } from '@/lib/session'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [session, { error }] = await Promise.all([readSession(), searchParams])
  if (session) return <TeamPicker />
  const configured = Boolean(process.env.LINEAR_CLIENT_ID && process.env.LINEAR_CLIENT_SECRET)
  return <Landing error={error} configured={configured} />
}
