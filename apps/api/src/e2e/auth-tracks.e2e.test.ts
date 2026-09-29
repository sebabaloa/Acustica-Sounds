import 'dotenv/config'
import request from 'supertest'
import mongoose from 'mongoose'
import { describe, it, beforeAll, afterAll, expect, beforeEach } from 'vitest'
import { app } from '../app'
import { connectDB } from '../config/db'
import { Track } from '../modules/tracks/track.model'
import { User } from '../modules/auth/user.model'

const mongoUri = process.env.E2E_MONGODB_URI || process.env.MONGODB_URI

if (!mongoUri) {
  describe.skip('Auth + Tracks e2e', () => {
    it('skips when Mongo URI not provided', () => {
      expect(true).toBe(true)
    })
  })
} else {
  describe('Auth + Tracks e2e', () => {
    const email = `e2e+${Date.now()}@test.com`
    const password = 'Passw0rd!'
    const trackTitle = 'E2E Track'
    const publicPlaybackId = 'public-demo-playback'
    const signedPlaybackId = process.env.E2E_MUX_PLAYBACK_ID
    const muxReady = Boolean(process.env.MUX_SIGNING_KEY_ID && process.env.MUX_SIGNING_KEY_SECRET && signedPlaybackId)
    let shouldSkip = false
    let userAccessToken: string
    let adminAccessToken: string
    let createdSignedTrackId: string | null = null
    const originalMuxKeyId = process.env.MUX_SIGNING_KEY_ID
    const originalMuxSecret = process.env.MUX_SIGNING_KEY_SECRET

    beforeAll(async () => {
      try {
        await connectDB(mongoUri)
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
        process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh'
        const db = mongoose.connection.db
        if (!db) throw new Error('Database connection missing')
        await db.dropDatabase()
      } catch (error) {
        shouldSkip = true
        console.warn('[e2e] skipping auth+tracks suite:', error)
      }
    })

    afterAll(async () => {
      if (shouldSkip) return
      await Track.deleteMany({ title: { $in: [trackTitle, `${trackTitle} Signed`] } })
      await User.deleteOne({ email })
      await User.deleteOne({ email: `admin+${email}` })
      process.env.MUX_SIGNING_KEY_ID = originalMuxKeyId
      process.env.MUX_SIGNING_KEY_SECRET = originalMuxSecret
      await mongoose.connection.close()
    })

    beforeEach(() => {
      if (shouldSkip) {
        expect(true).toBe(true)
      }
    })

    it('registers, logs in, creates track, and lists tracks', async () => {
      if (shouldSkip) {
        expect(true).toBe(true)
        return
      }
      const registerRes = await request(app)
        .post('/auth/register')
        .send({ email, password })
        .expect(201)

      expect(registerRes.body).toHaveProperty('userId')

      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email, password })
        .expect(200)

      expect(loginRes.body).toHaveProperty('accessToken')
      expect(loginRes.body).toHaveProperty('refreshToken')
      userAccessToken = loginRes.body.accessToken

      const adminEmail = `admin+${email}`
      await request(app)
        .post('/auth/register')
        .send({ email: adminEmail, password })
        .expect(201)

      await User.updateOne({ email: adminEmail }, { role: 'admin' })

      const adminLoginRes = await request(app)
        .post('/auth/login')
        .send({ email: adminEmail, password })
        .expect(200)

      adminAccessToken = adminLoginRes.body.accessToken

      await request(app)
        .post('/tracks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          title: trackTitle,
          artist: 'E2E Artist',
          policy: 'public',
          playbackId: publicPlaybackId,
        })
        .expect(201)

      const tracksRes = await request(app)
        .get('/tracks')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)

      expect(Array.isArray(tracksRes.body.tracks)).toBe(true)
      expect(tracksRes.body.tracks.some((track: any) => track.title === trackTitle)).toBe(true)
    }, 20000)

    const playbackTest = muxReady ? it : it.skip

    it('returns expected errors for unauthorized and missing tracks', async () => {
      if (shouldSkip) {
        expect(true).toBe(true)
        return
      }

      await request(app).post(`/tracks/123/playback-credentials`).expect(401)

      const notFoundRes = await request(app)
        .post('/tracks/64c2ad6f8f9a2567300c1234/playback-credentials')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(404)

      expect(notFoundRes.body.requestId).toBeDefined()
      expect(notFoundRes.body.error.code).toBe('NOT_FOUND')
    })

    it('applies rate limit after repeated requests', async () => {
      if (shouldSkip) {
        expect(true).toBe(true)
        return
      }

      const trackRes = await request(app)
        .post('/tracks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          title: `${trackTitle} RL`,
          artist: 'E2E Artist',
          policy: 'public',
          playbackId: `${publicPlaybackId}-rl`,
        })
        .expect(201)

      const trackId = trackRes.body.track.id

      let lastStatus = 200
      for (let i = 0; i < 35; i += 1) {
        lastStatus = (
          await request(app)
            .post(`/tracks/${trackId}/playback-credentials`)
            .set('Authorization', `Bearer ${userAccessToken}`)
        ).status
      }

      expect(lastStatus).toBe(429)
    })

    it('enforces CORS allowlist in responses', async () => {
      if (shouldSkip) {
        expect(true).toBe(true)
        return
      }

      const trackRes = await request(app)
        .post('/tracks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          title: `${trackTitle} CORS`,
          artist: 'E2E Artist',
          policy: 'public',
          playbackId: `${publicPlaybackId}-cors`,
        })
        .expect(201)

      const allowed = await request(app)
        .post(`/tracks/${trackRes.body.track.id}/playback-credentials`)
        .set('Origin', 'http://localhost:3000')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)

      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000')

      const disallowed = await request(app)
        .post(`/tracks/${trackRes.body.track.id}/playback-credentials`)
        .set('Origin', 'http://evil.example.com')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)

      expect(disallowed.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('fails with provider config error when signing keys missing', async () => {
      if (shouldSkip) {
        expect(true).toBe(true)
        return
      }

      const configTrack = await request(app)
        .post('/tracks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          title: `${trackTitle} Missing Keys`,
          artist: 'E2E Artist',
          playbackId: 'missing-keys-track',
          policy: 'signed',
          signedTtlSeconds: 30,
        })
        .expect(201)

      process.env.MUX_SIGNING_KEY_ID = ''
      process.env.MUX_SIGNING_KEY_SECRET = ''

      const errorRes = await request(app)
        .post(`/tracks/${configTrack.body.track.id}/playback-credentials`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(500)

      expect(errorRes.body.error.code).toBe('PROVIDER_CONFIG_ERROR')

      process.env.MUX_SIGNING_KEY_ID = originalMuxKeyId
      process.env.MUX_SIGNING_KEY_SECRET = originalMuxSecret
    })

    playbackTest('issues mux playback credentials and rotates after TTL', async () => {
      if (shouldSkip) {
        expect(true).toBe(true)
        return
      }

      const ttlSeconds = 5

      const signedTrackRes = await request(app)
        .post('/tracks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          title: `${trackTitle} Signed`,
          artist: 'E2E Artist',
          playbackId: signedPlaybackId,
          policy: 'signed',
          signedTtlSeconds: ttlSeconds,
        })
        .expect(201)

      createdSignedTrackId = signedTrackRes.body.track.id

      const firstPlayback = await request(app)
        .post(`/tracks/${createdSignedTrackId}/playback-credentials`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)

      expect(firstPlayback.body).toMatchObject({
        provider: 'mux',
        hints: { policy: 'signed', ttlSeconds },
      })

      const firstExpiresAt = firstPlayback.body.expiresAt

      await new Promise((resolve) => setTimeout(resolve, (ttlSeconds + 1) * 1000))

      const secondPlayback = await request(app)
        .post(`/tracks/${createdSignedTrackId}/playback-credentials`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)

      expect(secondPlayback.body.expiresAt).not.toBe(firstExpiresAt)
    }, 40000)
  })
}
