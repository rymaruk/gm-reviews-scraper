import {
  handleDeleteCampaign,
  handlePatchCampaign,
  readJsonBody,
} from '../../server/handlers.js'
import { jsonResult, methodNotAllowed, webHandler } from '../../server/runtime.js'

export const runtime = 'nodejs'

function campaignId(request: Request): string {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  return decodeURIComponent(parts.at(-1) ?? '')
}

export async function DELETE(request: Request) {
  return jsonResult(await handleDeleteCampaign(campaignId(request)))
}

export async function PATCH(request: Request) {
  return jsonResult(await handlePatchCampaign(campaignId(request), await readJsonBody(request)))
}

export default webHandler((request) => {
  if (request.method === 'DELETE') return DELETE(request)
  if (request.method === 'PATCH') return PATCH(request)
  return methodNotAllowed()
})
