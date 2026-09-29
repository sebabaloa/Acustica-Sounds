import { Types } from 'mongoose'
import { createAppError } from '../../errors/app-error'
import { Track } from './track.model'
import { getVideoProvider } from './providers/provider-factory'
import { getPlaybackAllowedOrigins } from '../../config/origins'

export interface PlaybackResponse {
  provider: string
  url: string
  expiresAt: Date | null
  ttlSeconds: number | null
  policy: 'signed' | 'public'
}

export function resolveProviderName(trackProvider?: string): string {
  if (trackProvider) return trackProvider
  if (process.env.VIDEO_PROVIDER) return process.env.VIDEO_PROVIDER
  return 'mux'
}

function getDefaultTtlSeconds(): number {
  const raw = process.env.MUX_SIGNED_TTL
  const parsed = raw ? Number(raw) : 120
  if (!Number.isFinite(parsed) || parsed <= 0) return 120
  return parsed
}

export async function getTrackPlayback(trackId: string, userId: string): Promise<PlaybackResponse> {
  if (!Types.ObjectId.isValid(trackId)) {
    throw createAppError({ code: 'NOT_FOUND', status: 404, message: 'Track not found.' })
  }

  const track = await Track.findById(trackId)
  if (!track) {
    throw createAppError({ code: 'NOT_FOUND', status: 404, message: 'Track not found.' })
  }

  const policy = track.policy || 'signed'
  const playbackId = track.playbackId?.trim()

  if (!playbackId) {
    throw createAppError({
      code: 'MISSING_PLAYBACK_ID',
      status: 409,
      message: `Track lacks a playbackId for policy '${policy}'.`,
      meta: {
        hints: {
          recover: 'Asigna un playbackId al track o cambia policy a "public" temporalmente.',
        },
      },
    })
  }

  if (policy === 'public') {
    const providerName = resolveProviderName(track.provider)
    const baseUrl = (process.env.MUX_PLAYBACK_BASE || 'https://stream.mux.com').replace(/\/$/, '')
    const url = `${baseUrl}/${playbackId}.m3u8`
    return {
      provider: providerName,
      url,
      expiresAt: null,
      ttlSeconds: null,
      policy,
    }
  }

  const providerName = resolveProviderName(track.provider)
  const provider = getVideoProvider(providerName)
  const ttlSeconds = track.signedTtlSeconds ?? getDefaultTtlSeconds()
  if (ttlSeconds < 60 || ttlSeconds > 3600) {
    console.warn('[tracks] playback TTL out of recommended range', {
      trackId: trackId,
      userId,
      ttlSeconds,
    })
  }
  const credentials = await provider.getPlaybackCredentials({ track, userId }, { ttlSeconds })
  return {
    provider: provider.name,
    url: credentials.url,
    expiresAt: credentials.expiresAt,
    ttlSeconds: credentials.ttlSeconds,
    policy,
  }
}

export function getPlaybackCorsOrigins() {
  return new Set(getPlaybackAllowedOrigins())
}
