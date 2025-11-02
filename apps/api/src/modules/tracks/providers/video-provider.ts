import type { TrackDoc } from '../track.model'

export interface PlaybackContext {
  track: TrackDoc
  userId: string
}

export interface PlaybackOptions {
  ttlSeconds: number
}

export interface PlaybackCredentials {
  url: string
  expiresAt: Date
  ttlSeconds: number
}

export interface VideoProvider {
  readonly name: string
  getPlaybackCredentials(ctx: PlaybackContext, options: PlaybackOptions): Promise<PlaybackCredentials>
}
