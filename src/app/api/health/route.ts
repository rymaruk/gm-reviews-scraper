import { healthPayload } from '@/server/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export function GET() {
  return Response.json(healthPayload())
}
