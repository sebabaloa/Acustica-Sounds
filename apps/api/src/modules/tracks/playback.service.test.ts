import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlaybackCredentials } from './providers/video-provider'
import { getTrackPlayback } from './playback.service'

const trackModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
}))

const providerFactoryMock = vi.hoisted(() => ({
  getVideoProvider: vi.fn(),
}))

vi.mock('./track.model', () => ({
  Track: { findById: trackModelMock.findById },
}))

vi.mock('./providers/provider-factory', () => ({
  getVideoProvider: providerFactoryMock.getVideoProvider,
}))

describe('getTrackPlayback', () => {
  beforeEach(() => {
    trackModelMock.findById.mockReset()
    providerFactoryMock.getVideoProvider.mockReset()
  })

  it('throws NOT_FOUND for invalid ObjectId', async () => {
    await expect(getTrackPlayback('invalid-id', 'user-1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws NOT_FOUND when track missing', async () => {
    trackModelMock.findById.mockResolvedValue(null)
    await expect(getTrackPlayback('507f1f77bcf86cd799439011', 'user-1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('returns public playback without token', async () => {
    trackModelMock.findById.mockResolvedValue({
      policy: 'public',
      provider: 'mux',
      playbackId: 'mux123',
      signedTtlSeconds: 60,
    })

    const playback = await getTrackPlayback('507f1f77bcf86cd799439011', 'user-1')

    expect(playback.provider).toBe('mux')
    expect(playback.url).toBe('https://stream.mux.com/mux123.m3u8')
    expect(playback.expiresAt).toBeNull()
    expect(playback.ttlSeconds).toBeNull()
    expect(playback.policy).toBe('public')
  })

  it('delegates to provider for signed policy', async () => {
    trackModelMock.findById.mockResolvedValue({
      policy: 'signed',
      provider: 'mux',
      playbackId: 'mux123',
      signedTtlSeconds: 90,
    })

    const credentials: PlaybackCredentials = {
      url: 'https://stream.mux.com/mux123.m3u8?token=abc',
      expiresAt: new Date('2025-01-01T00:00:00Z'),
      ttlSeconds: 90,
    }

    providerFactoryMock.getVideoProvider.mockReturnValue({
      name: 'mux',
      getPlaybackCredentials: vi.fn().mockResolvedValue(credentials),
    })

    const playback = await getTrackPlayback('507f1f77bcf86cd799439011', 'user-1')

    expect(providerFactoryMock.getVideoProvider).toHaveBeenCalledWith('mux')
    expect(playback.url).toBe(credentials.url)
    expect(playback.expiresAt?.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(playback.ttlSeconds).toBe(90)
    expect(playback.policy).toBe('signed')
  })

  it('uses global TTL when track does not define one', async () => {
    trackModelMock.findById.mockResolvedValue({
      policy: 'signed',
      provider: 'mux',
      playbackId: 'mux123',
      signedTtlSeconds: undefined,
    })

    process.env.MUX_SIGNED_TTL = '75'

    const credentials: PlaybackCredentials = {
      url: 'https://stream.mux.com/mux123.m3u8?token=abc',
      expiresAt: new Date('2025-01-01T00:00:00Z'),
      ttlSeconds: 75,
    }

    providerFactoryMock.getVideoProvider.mockReturnValue({
      name: 'mux',
      getPlaybackCredentials: vi.fn().mockResolvedValue(credentials),
    })

    const playback = await getTrackPlayback('507f1f77bcf86cd799439011', 'user-1')

    expect(playback.ttlSeconds).toBe(75)
  })

  it('falls back to default TTL when neither track nor env define one', async () => {
    trackModelMock.findById.mockResolvedValue({
      policy: 'signed',
      provider: 'mux',
      playbackId: 'mux123',
      signedTtlSeconds: undefined,
    })

    delete process.env.MUX_SIGNED_TTL

    const credentials: PlaybackCredentials = {
      url: 'https://stream.mux.com/mux123.m3u8?token=abc',
      expiresAt: new Date('2025-01-01T00:00:00Z'),
      ttlSeconds: 120,
    }

    providerFactoryMock.getVideoProvider.mockReturnValue({
      name: 'mux',
      getPlaybackCredentials: vi.fn().mockResolvedValue(credentials),
    })

    const playback = await getTrackPlayback('507f1f77bcf86cd799439011', 'user-1')

    expect(playback.ttlSeconds).toBe(120)
  })

  it('propagates missing playback id error', async () => {
    trackModelMock.findById.mockResolvedValue({
      policy: 'signed',
      provider: 'mux',
      playbackId: undefined,
    })

    await expect(getTrackPlayback('507f1f77bcf86cd799439011', 'user-1')).rejects.toMatchObject({ code: 'MISSING_PLAYBACK_ID' })
  })
})
