import { handle } from '@/lib/api'
import { fetchIssueDetail } from '@/lib/linear'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handle(() => fetchIssueDetail(id))
}
