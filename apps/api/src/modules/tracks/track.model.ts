import { Schema, model } from 'mongoose'

export interface TrackDoc {
  title: string
  artist: string
  duration?: number
  coverUrl?: string
  audioUrl?: string
  createdAt: Date
  updatedAt: Date
}

const TrackSchema = new Schema<TrackDoc>(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    artist: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    duration: { type: Number, min: 1, max: 60 * 60 },
    coverUrl: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
  },
  { timestamps: true }
)

export const Track = model<TrackDoc>('Track', TrackSchema)
