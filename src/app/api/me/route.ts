import { handle } from '@/lib/api'
import { fetchMe } from '@/lib/linear'

export const GET = () => handle(fetchMe)
