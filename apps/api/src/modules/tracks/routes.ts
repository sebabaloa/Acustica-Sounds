import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import cors from 'cors'
import { verifyJWT, requireRole } from '../../middlewares/auth'
import { TrackCreateSchema } from './schemas'
import { listTracks, createTrack } from './service'
import { createInMemoryRateLimit } from '../../middlewares/rate-limit'
import { getPlaybackCorsOrigins, getTrackPlayback } from './playback.service'
import { createAppError } from '../../errors/app-error'
import { recordPlaybackIssued, recordPlaybackLatency } from '../../metrics/playback-metrics'

export const tracksRouter: ExpressRouter = Router()

const playbackAllowedOrigins = getPlaybackCorsOrigins()
const playbackCors = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (playbackAllowedOrigins.has(origin)) return callback(null, true)
    return callback(null, false)
  },
  credentials: true,
})

const playbackRateLimitMaxRaw = Number(process.env.PLAYBACK_RATELIMIT_PER_MIN ?? '30')
const playbackRateLimit = createInMemoryRateLimit({
  windowMs: 60 * 1000,
  max: Number.isFinite(playbackRateLimitMaxRaw) && playbackRateLimitMaxRaw > 0 ? playbackRateLimitMaxRaw : 30,
})

tracksRouter.options('/:id/playback-credentials', playbackCors, (_req, res) => {
  res.status(204).end()
})

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

tracksRouter.post('/:id/playback-credentials', playbackCors, playbackRateLimit, async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw createAppError({ code: 'UNAUTHORIZED', status: 401, message: 'Authentication required.' })
    }
    const startedAt = Date.now()
    const playback = await getTrackPlayback(req.params.id, userId)
    console.info('[tracks] playback credentials issued', {
      requestId: req.requestId,
      userId,
      trackId: req.params.id,
      policy: playback.policy,
      expiresAt: playback.expiresAt ? playback.expiresAt.toISOString() : null,
    })
    recordPlaybackIssued(playback.policy)
    recordPlaybackLatency(Date.now() - startedAt)
    res.json({
      provider: playback.provider,
      url: playback.url,
      expiresAt: playback.expiresAt ? playback.expiresAt.toISOString() : null,
      hints: {
        policy: playback.policy,
        ttlSeconds: playback.ttlSeconds,
      },
    })
  } catch (error) {
    next(error)
  }
})
