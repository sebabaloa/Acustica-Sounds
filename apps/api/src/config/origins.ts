function parse(source: string): string[] {
  return source
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getApiAllowedOrigins(): string[] {
  const raw = process.env.API_ALLOWED_ORIGINS || 'http://localhost:3000'
  return parse(raw)
}

export function getPlaybackAllowedOrigins(): string[] {
  const raw = process.env.PLAYBACK_ALLOWED_ORIGINS || process.env.API_ALLOWED_ORIGINS || 'http://localhost:3000'
  return parse(raw)
}
