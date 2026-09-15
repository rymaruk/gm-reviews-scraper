import { handlePatchCampaign } from '@/server/handlers'
import { jsonResult, readJsonBody } from '@/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  const body = (await readJsonBody(request)) as { id?: unknown }
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  return jsonResult(await handlePatchCampaign(id, body))
}
