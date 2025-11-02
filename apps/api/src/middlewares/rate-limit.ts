import type { Request, Response, NextFunction } from 'express'
import { createAppError } from '../errors/app-error'

interface RateLimitOptions {
  windowMs: number
  max: number
}

interface Entry {
  count: number
  expiresAt: number
}

export function createInMemoryRateLimit(options: RateLimitOptions) {
  const store = new Map<string, Entry>()

  function cleanup() {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) store.delete(key)
    }
  }

  const interval = setInterval(cleanup, options.windowMs)
  interval.unref?.()

  return function rateLimit(req: Request, _res: Response, next: NextFunction) {
    if (req.method && req.method.toUpperCase() === 'OPTIONS') {
      next()
      return
    }
    const key = (req.ip || req.headers['x-forwarded-for'] || 'unknown').toString()
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.expiresAt <= now) {
      store.set(key, { count: 1, expiresAt: now + options.windowMs })
      next()
      return
    }

    if (entry.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000))
      next(
        createAppError({
          code: 'TOO_MANY_REQUESTS',
          status: 429,
          message: 'Too many requests. Please try again later.',
          meta: {
            hints: { retryAfterSeconds },
          },
        })
      )
      return
    }

    entry.count += 1
    next()
  }
}
