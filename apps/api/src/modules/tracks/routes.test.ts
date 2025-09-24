import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tracksRouter } from './routes'

const serviceMocks = vi.hoisted(() => ({
  listTracks: vi.fn(),
  createTrack: vi.fn(),
}))

vi.mock('./service', () => ({
  listTracks: serviceMocks.listTracks,
  createTrack: serviceMocks.createTrack,
}))

vi.mock('../../middlewares/auth', () => ({
  verifyJWT: (req: any, _res: any, next: () => void) => {
    req.userId = 'user-123'
    next()
  },
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
}))

async function invoke(method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const req = { method, url: path, body, headers: {} }
    const res = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(payload: unknown) {
        this.payload = payload
        resolve({ status: this.statusCode, body: payload })
        return this
      },
    }

    ;(tracksRouter as any).handle(req as any, res as any, (err: unknown) => {
      if (err) reject(err)
      else resolve({ status: res.statusCode, body: (res as any).payload })
    })
  })
}

describe('Tracks routes', () => {
  beforeEach(() => {
    serviceMocks.listTracks.mockReset()
    serviceMocks.createTrack.mockReset()
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
})
