import { handleStore } from '../server/handlers.js'
import { jsonResult, webHandler } from '../server/runtime.js'

export const runtime = 'nodejs'

export async function GET() {
  return jsonResult(await handleStore())
}

export default webHandler(GET)
