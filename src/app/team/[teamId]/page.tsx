import { redirect } from 'next/navigation'
import { Explorer } from '@/components/explorer'
import { readSession } from '@/lib/session'

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const [session, { teamId }] = await Promise.all([readSession(), params])
  if (!session) redirect('/')
  return <Explorer teamId={teamId} />
}
