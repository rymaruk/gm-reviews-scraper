import { handleCampaigns } from '@/server/handlers'
import { jsonResult } from '@/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  return jsonResult(await handleCampaigns(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
