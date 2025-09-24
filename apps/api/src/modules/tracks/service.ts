import { Track } from './track.model'
import type { TrackCreateInput } from './schemas'

export async function listTracks() {
  const query = Track.find({}, 'title artist duration coverUrl audioUrl createdAt updatedAt')
  const tracks = await query.sort({ createdAt: -1 }).lean()
  return tracks.map((t) => ({
    id: (typeof t._id === 'string' ? t._id : t._id?.toString()) || '',
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    coverUrl: t.coverUrl,
    audioUrl: t.audioUrl,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))
}

export async function createTrack(input: TrackCreateInput) {
  const track = await Track.create(input)
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    coverUrl: track.coverUrl,
    audioUrl: track.audioUrl,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  }
}
