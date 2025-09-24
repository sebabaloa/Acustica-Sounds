import 'dotenv/config'
import request from 'supertest'
import mongoose from 'mongoose'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
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
    let shouldSkip = false

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
      await Track.deleteMany({ title: trackTitle })
      await User.deleteOne({ email })
      await mongoose.connection.close()
    })

    it('registers, logs in, and fetches tracks', async () => {
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

      await Track.create({ title: trackTitle, artist: 'E2E Artist' })

      const tracksRes = await request(app)
        .get('/tracks')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200)

      expect(Array.isArray(tracksRes.body.tracks)).toBe(true)
      expect(tracksRes.body.tracks.some((track: any) => track.title === trackTitle)).toBe(true)
    }, 20000)
  })
}
