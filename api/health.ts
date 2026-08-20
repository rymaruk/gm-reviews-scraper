import { healthPayload } from '../server/env.ts'

export function GET() {
  return Response.json(healthPayload())
}
