import { handleResolvePlace, readJsonBody, toResponse } from '../../server/handlers.ts'

export async function POST(request: Request) {
  return toResponse(await handleResolvePlace(await readJsonBody(request)))
}
