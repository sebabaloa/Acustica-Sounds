import { z } from 'zod'

export const TrackCreateSchema = z.object({
  title: z.string().min(1).max(160),
  artist: z.string().min(1).max(160),
  duration: z.number().int().positive().max(60 * 60).optional(),
  coverUrl: z.string().url().max(512).optional(),
  audioUrl: z.string().url().max(512).optional(),
  provider: z.enum(['mux', 'public', 'drm']).optional(),
  policy: z.enum(['signed', 'public']).optional(),
  playbackId: z.string().min(5).max(256).optional(),
  signedTtlSeconds: z.number().int().min(5).max(60 * 60).optional(),
})

export type TrackCreateInput = z.infer<typeof TrackCreateSchema>
