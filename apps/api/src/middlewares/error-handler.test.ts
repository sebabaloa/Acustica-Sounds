import { describe, expect, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { errorHandler } from './error-handler'
import { createAppError } from '../errors/app-error'

function createRes() {
  const json = vi.fn()
  const res = {
    status: vi.fn().mockImplementation(() => res as unknown as Response),
    json,
  }
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

describe('errorHandler', () => {
  it('handles AppError', () => {
    const req = { requestId: 'req-1' } as Request
    const res = createRes()
    const err = createAppError({ code: 'NOT_FOUND', status: 404, message: 'missing' })

    errorHandler(err, req, res, (() => {}) as NextFunction)

    expect(res.status.mock.calls[0][0]).toBe(404)
    const jsonPayload = res.json.mock.calls[0][0]
    expect(jsonPayload.requestId).toBe('req-1')
    expect(jsonPayload.error.code).toBe('NOT_FOUND')
  })

  it('handles Zod errors', () => {
    const req = { requestId: 'req-2' } as Request
    const res = createRes()
    const schema = z.object({ foo: z.string() })
    let zErr: unknown
    try {
      schema.parse({ foo: 123 })
    } catch (error) {
      zErr = error
    }

    errorHandler(zErr, req, res, (() => {}) as NextFunction)

    expect(res.status.mock.calls[0][0]).toBe(400)
  })
})
