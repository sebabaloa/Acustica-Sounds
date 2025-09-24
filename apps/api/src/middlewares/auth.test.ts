import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireRole } from './auth'

const findByIdMock = vi.hoisted(() => vi.fn())

vi.mock('../modules/auth/user.model', () => ({
  User: {
    findById: findByIdMock,
  },
}))

function createRes() {
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.payload = payload
      return this
    },
  }
  return res as Response & { statusCode: number; payload: unknown }
}

describe('requireRole middleware', () => {
  beforeEach(() => {
    findByIdMock.mockReset()
  })

  it('returns 401 when userId missing', async () => {
    const middleware = requireRole('admin')
    const req = { userId: undefined } as unknown as Request
    const res = createRes()
    const next = vi.fn()

    await middleware(req, res, next as unknown as NextFunction)

    expect(res.statusCode).toBe(401)
    expect(res.payload).toEqual({ error: 'NO_TOKEN' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when user not found', async () => {
    const middleware = requireRole('admin')
    const req = { userId: 'user-1' } as unknown as Request
    const res = createRes()
    const next = vi.fn()

    findByIdMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

    await middleware(req, res, next as unknown as NextFunction)

    expect(res.statusCode).toBe(403)
    expect(res.payload).toEqual({ error: 'FORBIDDEN' })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next when role matches', async () => {
    const middleware = requireRole('admin')
    const req = { userId: 'user-1' } as unknown as Request
    const res = createRes()
    const next = vi.fn()

    findByIdMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'admin' }),
    })

    await middleware(req, res, next as unknown as NextFunction)

    expect(res.statusCode).toBe(200)
    expect(next).toHaveBeenCalled()
    expect(req.userRole).toBe('admin')
  })

  it('returns 403 when role mismatch', async () => {
    const middleware = requireRole('admin')
    const req = { userId: 'user-1' } as unknown as Request
    const res = createRes()
    const next = vi.fn()

    findByIdMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'user' }),
    })

    await middleware(req, res, next as unknown as NextFunction)

    expect(res.statusCode).toBe(403)
    expect(res.payload).toEqual({ error: 'FORBIDDEN' })
    expect(next).not.toHaveBeenCalled()
  })
})
