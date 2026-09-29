import jwt from 'jsonwebtoken'
import { createAppError } from '../../../errors/app-error'
import type { PlaybackContext, PlaybackCredentials, PlaybackOptions, VideoProvider } from './video-provider'

interface MuxConfig {
  signingKeyId: string
  signingKeySecret: string
  baseUrl: string
  secretBuffer: Buffer
}

function parseSigningSecret(rawSecret: string): { secret: string; buffer: Buffer } {
  const trimmed = rawSecret.trim()
  if (!trimmed) {
    throw createAppError({
      code: 'PROVIDER_CONFIG_ERROR',
      status: 500,
      message: 'MUX_SIGNING_KEY_SECRET is empty.',
    })
  }

  if (trimmed.startsWith('base64:')) {
    const base64Value = trimmed.slice('base64:'.length)
    try {
      const buffer = Buffer.from(base64Value, 'base64')
      if (buffer.length === 0) throw new Error('empty decoded')
      return { secret: trimmed, buffer }
    } catch (error) {
      throw createAppError({
        code: 'PROVIDER_CONFIG_ERROR',
        status: 500,
        message: 'Invalid base64 value for MUX_SIGNING_KEY_SECRET.',
        cause: error,
      })
    }
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64')
    if (decoded.length > 0 && decoded.toString('base64') === trimmed) {
      return { secret: trimmed, buffer: decoded }
    }
  } catch {
    // fallthrough to raw
  }

  return { secret: trimmed, buffer: Buffer.from(trimmed, 'utf8') }
}

function buildMuxConfig(): MuxConfig {
  const signingKeyId = process.env.MUX_SIGNING_KEY_ID?.trim()
  const signingKeySecret = process.env.MUX_SIGNING_KEY_SECRET?.trim()
  if (!signingKeyId) {
    throw createAppError({
      code: 'PROVIDER_CONFIG_ERROR',
      status: 500,
      message: 'MUX_SIGNING_KEY_ID is required when using the mux provider.',
    })
  }
  if (!signingKeySecret) {
    throw createAppError({
      code: 'PROVIDER_CONFIG_ERROR',
      status: 500,
      message: 'MUX_SIGNING_KEY_SECRET is required when using the mux provider.',
    })
  }

  const parsedSecret = parseSigningSecret(signingKeySecret)

  const baseUrl = (process.env.MUX_PLAYBACK_BASE || 'https://stream.mux.com').replace(/\/$/, '')
  return { signingKeyId, signingKeySecret: parsedSecret.secret, baseUrl, secretBuffer: parsedSecret.buffer }
}

export class MuxProvider implements VideoProvider {
  readonly name = 'mux'

  private readonly config: MuxConfig
  constructor() {
    this.config = buildMuxConfig()
  }

  async getPlaybackCredentials(ctx: PlaybackContext, options: PlaybackOptions): Promise<PlaybackCredentials> {
    const { track } = ctx
    const ttl = options.ttlSeconds
    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw createAppError({
        code: 'PROVIDER_CONFIG_ERROR',
        status: 500,
        message: 'Invalid TTL for mux playback token.',
      })
    }

    if (!track.playbackId) {
      throw createAppError({
        code: 'MISSING_PLAYBACK_ID',
        status: 409,
        message: "Track lacks a playbackId for policy 'signed'.",
        meta: {
          hints: {
            recover: 'Asigna un playbackId al track o cambia policy a "public" temporalmente.',
          },
        },
      })
    }

    const expiresAt = new Date(Date.now() + ttl * 1000)

    const token = jwt.sign(
      { sub: track.playbackId },
      this.config.secretBuffer,
      {
        algorithm: 'HS256',
        expiresIn: ttl,
        header: {
          alg: 'HS256',
          kid: this.config.signingKeyId,
          typ: 'JWT',
        },
      }
    )

    const url = `${this.config.baseUrl}/${track.playbackId}.m3u8?token=${token}`
    return { url, expiresAt, ttlSeconds: ttl }
  }
}
