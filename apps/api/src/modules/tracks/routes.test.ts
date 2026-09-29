import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tracksRouter } from './routes'

const serviceMocks = vi.hoisted(() => ({
  listTracks: vi.fn(),
  createTrack: vi.fn(),
}))

const playbackMocks = vi.hoisted(() => ({
  getTrackPlayback: vi.fn(),
  getPlaybackCorsOrigins: vi.fn(() => new Set<string>(['http://localhost:3000'])),
}))

const metricsMocks = vi.hoisted(() => ({
  recordPlaybackIssued: vi.fn(),
  recordPlaybackLatency: vi.fn(),
}))

vi.mock('./service', () => ({
  listTracks: serviceMocks.listTracks,
  createTrack: serviceMocks.createTrack,
}))

vi.mock('./playback.service', () => ({
  getTrackPlayback: playbackMocks.getTrackPlayback,
  getPlaybackCorsOrigins: playbackMocks.getPlaybackCorsOrigins,
}))

vi.mock('../../metrics/playback-metrics', () => ({
  recordPlaybackIssued: metricsMocks.recordPlaybackIssued,
  recordPlaybackLatency: metricsMocks.recordPlaybackLatency,
}))

vi.mock('../../middlewares/auth', () => ({
  verifyJWT: (req: any, _res: any, next: () => void) => {
    req.userId = 'user-123'
    next()
  },
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
}))

async function invoke(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: unknown; headers: Record<string, unknown> }>((resolve, reject) => {
    const req = { method, url: path, body, headers, ip: '127.0.0.1', requestId: 'test-req' }
    const res = {
      statusCode: 200,
      payload: undefined as unknown,
      headers: {} as Record<string, unknown>,
      status(code: number) {
        this.statusCode = code
        return this
      },
      setHeader(key: string, value: unknown) {
        this.headers[key.toLowerCase()] = value
      },
      json(payload: unknown) {
        this.payload = payload
        resolve({ status: this.statusCode, body: payload, headers: this.headers })
        return this
      },
      send(payload: unknown) {
        this.payload = payload
        resolve({ status: this.statusCode, body: payload, headers: this.headers })
        return this
      },
      end() {
        resolve({ status: this.statusCode, body: this.payload, headers: this.headers })
      },
    }

    ;(tracksRouter as any).handle(req as any, res as any, (err: unknown) => {
      if (err) reject(err)
      else resolve({ status: res.statusCode, body: (res as any).payload, headers: (res as any).headers })
    })
  })
}

describe('Tracks routes', () => {
  beforeEach(() => {
    serviceMocks.listTracks.mockReset()
    serviceMocks.createTrack.mockReset()
    playbackMocks.getTrackPlayback.mockReset()
    metricsMocks.recordPlaybackIssued.mockReset()
    metricsMocks.recordPlaybackLatency.mockReset()
  })

  it('returns tracks list', async () => {
    serviceMocks.listTracks.mockResolvedValue([{ id: 'track-1' }])
    const res = await invoke('GET', '/')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ tracks: [{ id: 'track-1' }] })
    expect(serviceMocks.listTracks).toHaveBeenCalled()
  })

  it('validates create payload', async () => {
    const res = await invoke('POST', '/', { title: '', artist: '' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'INVALID_INPUT' })
    expect(serviceMocks.createTrack).not.toHaveBeenCalled()
  })

  it('creates track when payload valid', async () => {
    serviceMocks.createTrack.mockResolvedValue({ id: 'track-2', title: 'Track' })
    const res = await invoke('POST', '/', { title: 'Track', artist: 'Artist' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ track: { id: 'track-2', title: 'Track' } })
    expect(serviceMocks.createTrack).toHaveBeenCalledWith({ title: 'Track', artist: 'Artist' })
  })

  it('returns playback credentials', async () => {
    playbackMocks.getTrackPlayback.mockResolvedValue({
      provider: 'mux',
      url: 'https://stream.mux.com/demo.m3u8?token=abc',
      expiresAt: new Date('2025-01-01T00:00:00Z'),
      ttlSeconds: 120,
      policy: 'signed',
    })

    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

    const res = await invoke('POST', '/track-1/playback-credentials')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      provider: 'mux',
      url: 'https://stream.mux.com/demo.m3u8?token=abc',
      expiresAt: '2025-01-01T00:00:00.000Z',
      hints: { policy: 'signed', ttlSeconds: 120 },
    })
    expect(res.body.expiresAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
    expect(playbackMocks.getTrackPlayback).toHaveBeenCalledWith('track-1', 'user-123')
    expect(metricsMocks.recordPlaybackIssued).toHaveBeenCalledWith('signed')
    expect(metricsMocks.recordPlaybackLatency).toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalled()
    expect(consoleInfo.mock.calls[0]?.[1]).toMatchObject({ policy: 'signed' })
    const logged = JSON.stringify(consoleInfo.mock.calls[0]?.[1] ?? {})
    expect(logged.includes('token=')).toBe(false)
    consoleInfo.mockRestore()
  })

  it('handles OPTIONS preflight without hitting the limiter', async () => {
    const res = await invoke('OPTIONS', '/track-1/playback-credentials')
    expect([200, 204]).toContain(res.status)
    expect(res.headers['retry-after']).toBeUndefined()
  })
})
