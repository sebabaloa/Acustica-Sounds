import { z } from 'zod'

export const TrackCreateSchema = z.object({
  title: z.string().min(1).max(160),
  artist: z.string().min(1).max(160),
  duration: z.number().int().positive().max(60 * 60).optional(),
  coverUrl: z.string().url().max(512).optional(),
  audioUrl: z.string().url().max(512).optional(),
})

export type TrackCreateInput = z.infer<typeof TrackCreateSchema>
