import type { ApiResult } from './handlers.js'

export function jsonResult(result: ApiResult): Response {
  return Response.json(result.body, { status: result.status })
}

export function methodNotAllowed(): Response {
  return new Response('Method Not Allowed', { status: 405 })
}

export function webHandler(handle: (request: Request) => Response | Promise<Response>) {
  return {
    fetch(request: Request) {
      return handle(request)
    },
  }
}
