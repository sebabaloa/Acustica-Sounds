import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { createInMemoryRateLimit } from './rate-limit'

describe('rate-limit middleware', () => {
  it('limits after defined threshold', () => {
    const middleware = createInMemoryRateLimit({ windowMs: 1000, max: 2 })
    const req = { ip: '127.0.0.1' } as Request
    const res = {} as Response
    const next = vi.fn()

    middleware(req, res, next)
    middleware(req, res, next)
    expect(next).toHaveBeenCalledTimes(2)

    middleware(req, res, next)
    const error = next.mock.calls[2][0]
    expect(error.code).toBe('TOO_MANY_REQUESTS')
    expect(error.meta?.hints?.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('ignores OPTIONS requests', () => {
    const middleware = createInMemoryRateLimit({ windowMs: 1000, max: 1 })
    const req = { ip: '127.0.0.1', method: 'OPTIONS' } as Request
    const res = {} as Response
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })
})
