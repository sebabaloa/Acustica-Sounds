import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listTracks, createTrack } from './service'

const trackModelMocks = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
}))

vi.mock('./track.model', () => ({
  Track: {
    find: trackModelMocks.find,
    create: trackModelMocks.create,
  },
}))

describe('Tracks service', () => {
  beforeEach(() => {
    trackModelMocks.find.mockReset()
    trackModelMocks.create.mockReset()
  })

  it('listTracks maps lean documents', async () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const lean = vi.fn().mockResolvedValue([
      {
        _id: { toString: () => 'track-1' },
        title: 'Track 1',
        artist: 'Artist 1',
        duration: 120,
        coverUrl: 'https://example.com/cover.jpg',
        audioUrl: 'https://example.com/audio.mp3',
        createdAt: now,
        updatedAt: now,
      },
    ])
    const sort = vi.fn().mockReturnValue({ lean })
    trackModelMocks.find.mockReturnValue({ sort })

    const tracks = await listTracks()

    expect(trackModelMocks.find).toHaveBeenCalledWith({}, 'title artist duration coverUrl audioUrl createdAt updatedAt')
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 })
    expect(lean).toHaveBeenCalled()
    expect(tracks).toEqual([
      {
        id: 'track-1',
        title: 'Track 1',
        artist: 'Artist 1',
        duration: 120,
        coverUrl: 'https://example.com/cover.jpg',
        audioUrl: 'https://example.com/audio.mp3',
        createdAt: now,
        updatedAt: now,
      },
    ])
  })

  it('createTrack returns new track shape', async () => {
    const now = new Date('2024-01-01T00:00:00Z')
    trackModelMocks.create.mockResolvedValue({
      id: 'track-123',
      title: 'Track',
      artist: 'Artist',
      duration: 180,
      coverUrl: undefined,
      audioUrl: 'https://example.com/audio.mp3',
      createdAt: now,
      updatedAt: now,
    })

    const track = await createTrack({ title: 'Track', artist: 'Artist', duration: 180, audioUrl: 'https://example.com/audio.mp3' })

    expect(trackModelMocks.create).toHaveBeenCalledWith({ title: 'Track', artist: 'Artist', duration: 180, audioUrl: 'https://example.com/audio.mp3' })
    expect(track).toEqual({
      id: 'track-123',
      title: 'Track',
      artist: 'Artist',
      duration: 180,
      coverUrl: undefined,
      audioUrl: 'https://example.com/audio.mp3',
      createdAt: now,
      updatedAt: now,
    })
  })
})
