import { Track } from './track.model'
import type { TrackCreateInput } from './schemas'

export async function listTracks() {
  const query = Track.find({}, 'title artist duration coverUrl audioUrl provider policy playbackId signedTtlSeconds createdAt updatedAt')
  const tracks = await query.sort({ createdAt: -1 }).lean()
  return tracks.map((t) => ({
    id: (typeof t._id === 'string' ? t._id : t._id?.toString()) || '',
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    coverUrl: t.coverUrl,
    audioUrl: t.audioUrl,
    provider: t.provider,
    policy: t.policy,
    playbackId: t.playbackId,
    signedTtlSeconds: typeof t.signedTtlSeconds === 'number' ? t.signedTtlSeconds : undefined,
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
    provider: track.provider,
    policy: track.policy,
    playbackId: track.playbackId,
    signedTtlSeconds: track.signedTtlSeconds,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  }
}
