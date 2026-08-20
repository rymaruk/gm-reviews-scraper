function healthBody() {
  const serpapi = Boolean(process.env.SERPAPI_KEY?.trim() || process.env.SERP_API_KEY?.trim())
  const url = Boolean(
    process.env.SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      process.env.VITE_SUPABASE_URL?.trim(),
  )
  const key = Boolean(
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.VITE_SUPABASE_ANON_KEY?.trim(),
  )
  const missing: string[] = []
  if (!serpapi) missing.push('SERPAPI_KEY')
  if (!url) missing.push('SUPABASE_URL')
  if (!key) missing.push('SUPABASE_PUBLISHABLE_KEY')

  return {
    ok: true,
    configured: serpapi,
    supabase: Boolean(url && key),
    missing,
  }
}

export function GET() {
  return Response.json(healthBody())
}

export default {
  fetch() {
    return GET()
  },
}
