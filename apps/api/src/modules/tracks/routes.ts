import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import { verifyJWT, requireRole } from '../../middlewares/auth'
import { TrackCreateSchema } from './schemas'
import { listTracks, createTrack } from './service'

export const tracksRouter: ExpressRouter = Router()

tracksRouter.use(verifyJWT)

tracksRouter.get('/', async (_req, res) => {
  const tracks = await listTracks()
  res.json({ tracks })
})

tracksRouter.post('/', requireRole('admin'), async (req, res) => {
  const parse = TrackCreateSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT' })

  const track = await createTrack(parse.data)
  res.status(201).json({ track })
})
