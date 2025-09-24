import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { authRouter } from './modules/auth/routes'
import { usersRouter } from './modules/users/routes'
import { tracksRouter } from './modules/tracks/routes'

import type { Application } from 'express'

export function createApp(): Application {
  const app = express()
  app.use(cors())
  app.use(express.json())
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))

  app.use('/auth', authRouter)
  app.use('/users', usersRouter)
  app.use('/tracks', tracksRouter)

  app.get('/health', (_req, res) => res.json({ ok: true }))

  return app
}

export const app = createApp()
