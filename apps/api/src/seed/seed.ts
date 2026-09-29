import mongoose from 'mongoose'
import 'dotenv/config'
import { connectDB } from '../config/db'
import { Track } from '../modules/tracks/track.model'

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }

  await connectDB(uri)

  await Track.deleteMany({ title: /Demo Track/i })

  const track = await Track.create({
    title: 'Demo Track',
    artist: 'AcusticaSounds',
    duration: 180,
    coverUrl: 'https://example.com/demo-cover.jpg',
    audioUrl: 'https://example.com/demo-audio.mp3',
  })

  console.log(`Seeded track ${track.id}`)
  await mongoose.connection.close()
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
