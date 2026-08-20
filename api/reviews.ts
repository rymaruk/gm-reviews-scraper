import { handleReviews, readJsonBody } from '../server/handlers.js'
import { jsonResult, methodNotAllowed, webHandler } from '../server/runtime.js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return jsonResult(await handleReviews(await readJsonBody(request)))
}

export default webHandler((request) => {
  if (request.method === 'POST') return POST(request)
  return methodNotAllowed()
})
