import { createAppError } from '../../../errors/app-error'
import type { VideoProvider } from './video-provider'
import { MuxProvider } from './mux-provider'

const providers = new Map<string, VideoProvider>()

function instantiate(name: string): VideoProvider {
  switch (name) {
    case 'mux':
      return new MuxProvider()
    default:
      throw createAppError({
        code: 'PROVIDER_CONFIG_ERROR',
        status: 500,
        message: `Video provider '${name}' is not configured.`,
      })
  }
}

export function getVideoProvider(name?: string): VideoProvider {
  const resolved = (name || '').trim().toLowerCase() || (process.env.VIDEO_PROVIDER || 'mux').toLowerCase()
  if (!providers.has(resolved)) {
    providers.set(resolved, instantiate(resolved))
  }
  return providers.get(resolved)!
}

const defaultProvider = (process.env.VIDEO_PROVIDER || 'mux').toLowerCase()
if (process.env.NODE_ENV !== 'test' && defaultProvider === 'mux') {
  try {
    if (!providers.has(defaultProvider)) {
      providers.set(defaultProvider, instantiate(defaultProvider))
    }
  } catch (error) {
    console.error('[provider] mux config validation failed', {
      message: error instanceof Error ? error.message : error,
    })
    throw error
  }
}
