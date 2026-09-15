import { handleReviews } from '@/server/handlers'
import { jsonResult, readJsonBody } from '@/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  return jsonResult(await handleReviews(await readJsonBody(request)))
}
