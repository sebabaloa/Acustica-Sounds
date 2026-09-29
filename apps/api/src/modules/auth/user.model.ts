import { Schema, model } from 'mongoose'

export type UserRole = 'user' | 'admin'
export interface UserDoc {
  email: string
  hash: string
  role: UserRole
  tokenVersion: number
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<UserDoc>({
  email: { type: String, required: true, unique: true, index: true },
  hash: { type: String, required: true },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true })

export const User = model<UserDoc>('User', UserSchema)
