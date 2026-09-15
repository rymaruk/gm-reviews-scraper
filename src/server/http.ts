import type { ApiResult } from '@/server/handlers'

export function jsonResult(result: ApiResult, init?: ResponseInit): Response {
  return Response.json(result.body, { ...init, status: result.status })
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
