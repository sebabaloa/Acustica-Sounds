import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError, createAppError, isAppError } from '../errors/app-error'
import { recordPlaybackError } from '../metrics/playback-metrics'

const isProduction = process.env.NODE_ENV === 'production'

function serializeError(error: Error): string {
  if (isProduction) return error.message
  return error.stack ?? error.message
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId || 'unknown'

  if (isAppError(err)) {
    recordPlaybackError(err.code)
    const payload: Record<string, unknown> = {
      error: { code: err.code, message: err.message },
      requestId,
    }
    if (err.meta) Object.assign(payload, err.meta)
    if (!isProduction) payload.debug = { stack: err.stack }
    res.status(err.status).json(payload)
    return
  }

  if (err instanceof ZodError) {
    const appErr = createAppError({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'Invalid input',
      meta: { issues: err.issues },
    })
    const payload: Record<string, unknown> = {
      error: { code: appErr.code, message: appErr.message },
      requestId,
      issues: err.issues,
    }
    if (!isProduction) payload.debug = { stack: err.stack }
    res.status(appErr.status).json(payload)
    return
  }

  const unexpected = err instanceof Error ? err : new Error('Unknown error')
  console.error('[errorHandler] unexpected', {
    requestId,
    name: unexpected.name,
    message: unexpected.message,
    stack: serializeError(unexpected),
  })

  const payload: Record<string, unknown> = {
    error: { code: 'UPSTREAM_ERROR', message: 'Internal server error' },
    requestId,
  }
  if (!isProduction) payload.debug = { reason: serializeError(unexpected) }
  res.status(502).json(payload)
}
