import { handleDeleteCampaign, readJsonBody } from '../../server/handlers.js'
import { jsonResult, methodNotAllowed, webHandler } from '../../server/runtime.js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = (await readJsonBody(request)) as { id?: unknown }
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id) {
    return jsonResult({ status: 400, body: { error: 'Campaign id is required.' } })
  }
  return jsonResult(await handleDeleteCampaign(id))
}

export default webHandler((request) => {
  if (request.method === 'POST') return POST(request)
  return methodNotAllowed()
})
