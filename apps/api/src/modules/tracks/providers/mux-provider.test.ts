import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { MuxProvider } from './mux-provider'
import type { PlaybackContext } from './video-provider'
import { AppError } from '../../../errors/app-error'

const base64Secret = Buffer.from('mux-secret', 'utf8').toString('base64')

describe('MuxProvider', () => {
  const envBackup = {
    MUX_SIGNING_KEY_ID: process.env.MUX_SIGNING_KEY_ID,
    MUX_SIGNING_KEY_SECRET: process.env.MUX_SIGNING_KEY_SECRET,
    MUX_PLAYBACK_BASE: process.env.MUX_PLAYBACK_BASE,
  }

  beforeEach(() => {
    process.env.MUX_SIGNING_KEY_ID = 'mux-key'
    process.env.MUX_SIGNING_KEY_SECRET = base64Secret
    process.env.MUX_PLAYBACK_BASE = 'https://stream.mux.com'
  })

  afterEach(() => {
    process.env.MUX_SIGNING_KEY_ID = envBackup.MUX_SIGNING_KEY_ID
    process.env.MUX_SIGNING_KEY_SECRET = envBackup.MUX_SIGNING_KEY_SECRET
    process.env.MUX_PLAYBACK_BASE = envBackup.MUX_PLAYBACK_BASE
  })

  it('issues signed playback credentials', async () => {
    const provider = new MuxProvider()
    const ctx: PlaybackContext = {
      track: {
        title: 'Demo',
        artist: 'Artist',
        provider: 'mux',
        policy: 'signed',
        playbackId: 'mux123',
        signedTtlSeconds: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      userId: 'user-1',
    }

    const credentials = await provider.getPlaybackCredentials(ctx, { ttlSeconds: 60 })

    expect(credentials.ttlSeconds).toBe(60)
    expect(credentials.url).toContain('https://stream.mux.com/mux123.m3u8?token=')
    expect(credentials.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(credentials.expiresAt.toISOString()).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)

    const token = credentials.url.split('token=')[1]
    const decoded = jwt.decode(token, { complete: true }) as any
    expect(decoded.payload.sub).toBe('mux123')
    expect(decoded.header.kid).toBe('mux-key')
    expect(decoded.header.alg).toBe('HS256')
  })

  it('throws when signing key secret is invalid base64', () => {
    process.env.MUX_SIGNING_KEY_SECRET = 'base64:not-base64'
    expect(() => new MuxProvider()).toThrowError(AppError)
  })

  it('throws when signing key id missing', () => {
    delete process.env.MUX_SIGNING_KEY_ID
    expect(() => new MuxProvider()).toThrowError(AppError)
  })

  it('accepts raw (non-base64) secrets', () => {
    process.env.MUX_SIGNING_KEY_SECRET = 'sk_live_raw'
    const provider = new MuxProvider()
    expect(provider.name).toBe('mux')
  })

  it('accepts base64 secrets with prefix', () => {
    process.env.MUX_SIGNING_KEY_SECRET = `base64:${base64Secret}`
    const provider = new MuxProvider()
    expect(provider.name).toBe('mux')
  })

  it('throws when track lacks playbackId', async () => {
    const provider = new MuxProvider()
    const ctx: PlaybackContext = {
      track: {
        title: 'Demo',
        artist: 'Artist',
        provider: 'mux',
        policy: 'signed',
        signedTtlSeconds: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      userId: 'user-1',
    }

    await expect(provider.getPlaybackCredentials(ctx, { ttlSeconds: 60 })).rejects.toBeInstanceOf(AppError)
  })
})
