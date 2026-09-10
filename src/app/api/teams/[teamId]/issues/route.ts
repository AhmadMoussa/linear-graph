import { handle } from '@/lib/api'
import { fetchTeamIssues } from '@/lib/linear'

export async function GET(_: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  return handle(() => fetchTeamIssues(teamId))
}
