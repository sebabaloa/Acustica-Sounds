import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { randomUUID } from 'crypto'
import { authRouter } from './modules/auth/routes'
import { usersRouter } from './modules/users/routes'
import { tracksRouter } from './modules/tracks/routes'
import { errorHandler } from './middlewares/error-handler'
import { getApiAllowedOrigins } from './config/origins'

import type { Application } from 'express'

export function createApp(): Application {
  const app = express()
  const allowedOrigins = new Set(getApiAllowedOrigins())

  app.use((req, res, next) => {
    const incoming = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined
    const requestId = incoming || randomUUID()
    req.requestId = requestId
    res.setHeader('X-Request-Id', requestId)
    next()
  })

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true)
        if (allowedOrigins.has(origin)) return callback(null, true)
        return callback(null, false)
      },
      credentials: true,
    })
  )
  app.use(express.json())
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))

  app.use('/auth', authRouter)
  app.use('/users', usersRouter)
  app.use('/tracks', tracksRouter)

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use(errorHandler)

  return app
}

export const app = createApp()
