import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { usersRouter } from './routes'

const userModelMocks = vi.hoisted(() => ({
  findById: vi.fn(),
}))

vi.mock('../auth/user.model', () => ({
  User: {
    findById: userModelMocks.findById,
  },
}))

interface InvokeOptions {
  method: string
  path: string
  headers?: Record<string, string>
  body?: unknown
}

async function invoke({ method, path, headers = {}, body }: InvokeOptions) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const req = { method, url: path, headers, body }
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

    ;(usersRouter as any).handle(req as any, res as any, (err: unknown) => {
      if (err) reject(err)
      else resolve({ status: res.statusCode, body: (res as any).payload })
    })
  })
}

describe('Users routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret'
    userModelMocks.findById.mockReset()
  })

  it('returns 401 when no token provided', async () => {
    const res = await invoke({ method: 'GET', path: '/me' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'NO_TOKEN' })
    expect(userModelMocks.findById).not.toHaveBeenCalled()
  })

  it('returns 401 for invalid token', async () => {
    const res = await invoke({
      method: 'GET',
      path: '/me',
      headers: { authorization: 'Bearer invalid' },
    })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'INVALID_TOKEN' })
    expect(userModelMocks.findById).not.toHaveBeenCalled()
  })

  it('returns 404 when user does not exist', async () => {
    const lean = vi.fn().mockResolvedValue(null)
    userModelMocks.findById.mockReturnValue({ lean })

    const token = jwt.sign({ sub: 'user-404' }, process.env.JWT_SECRET!, { expiresIn: '15m' })
    const res = await invoke({
      method: 'GET',
      path: '/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(userModelMocks.findById).toHaveBeenCalledWith('user-404', 'email role tokenVersion createdAt updatedAt')
    expect(lean).toHaveBeenCalled()
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'NOT_FOUND' })
  })

  it('returns user profile for valid token', async () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const lean = vi.fn().mockResolvedValue({
      _id: { toString: () => 'user-123' },
      email: 'user@test.com',
      role: 'user',
      tokenVersion: 5,
      createdAt: now,
      updatedAt: now,
    })
    userModelMocks.findById.mockReturnValue({ lean })

    const token = jwt.sign({ sub: 'user-123' }, process.env.JWT_SECRET!, { expiresIn: '15m' })
    const res = await invoke({
      method: 'GET',
      path: '/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: 'user-123',
      email: 'user@test.com',
      role: 'user',
      tokenVersion: 5,
      createdAt: now,
      updatedAt: now,
    })
  })
})
