function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export function getSerpapiKey(): string | undefined {
  return firstEnv('SERPAPI_KEY', 'SERP_API_KEY')
}

export function getSupabaseUrl(): string | undefined {
  return firstEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL')
}

export function getSupabaseKey(): string | undefined {
  return firstEnv(
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
  )
}

export function isSerpapiConfigured(): boolean {
  return Boolean(getSerpapiKey())
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey())
}

export function missingEnvNames(): string[] {
  const missing: string[] = []
  if (!isSerpapiConfigured()) missing.push('SERPAPI_KEY')
  if (!getSupabaseUrl()) missing.push('SUPABASE_URL')
  if (!getSupabaseKey()) missing.push('SUPABASE_PUBLISHABLE_KEY')
  return missing
}

export function healthPayload() {
  return {
    ok: true,
    configured: isSerpapiConfigured(),
    supabase: isSupabaseConfigured(),
    missing: missingEnvNames(),
  }
}
