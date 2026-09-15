import { handleUpdateCampaignWeights } from '@/server/handlers'
import { jsonResult, readJsonBody } from '@/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  return jsonResult(await handleUpdateCampaignWeights(await readJsonBody(request)))
}
