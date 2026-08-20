import { handleReviews, readJsonBody, toResponse } from '../server/handlers.ts'

export async function POST(request: Request) {
  return toResponse(await handleReviews(await readJsonBody(request)))
}
