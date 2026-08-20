import {
  handleDeleteCampaign,
  handlePatchCampaign,
  readJsonBody,
  routeParam,
  toResponse,
} from '../../server/handlers.ts'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  return toResponse(await handleDeleteCampaign(await routeParam(context)))
}

export async function PATCH(request: Request, context: RouteContext) {
  return toResponse(
    await handlePatchCampaign(await routeParam(context), await readJsonBody(request)),
  )
}
