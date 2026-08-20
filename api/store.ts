import { handleStore, toResponse } from '../server/handlers.ts'

export async function GET() {
  return toResponse(await handleStore())
}
