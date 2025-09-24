import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { SignOptions, Secret, JwtPayload } from 'jsonwebtoken'
import { User } from './user.model'

const ACCESS_EXPIRES = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn']
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn']

function requireSecret(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): Secret {
  const value = process.env[key]
  if (!value) throw new Error(`${key}_MISSING`)
  return value as Secret
}

export async function register(email: string, password: string) {
  const exists = await User.findOne({ email })
  if (exists) throw new Error('EMAIL_TAKEN')
  const hash = await bcrypt.hash(password, 10)
  const user = await User.create({ email, hash, role: 'user', tokenVersion: 0 })
  return { userId: user.id }
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email })
  if (!user) throw new Error('INVALID_CREDENTIALS')
  const ok = await bcrypt.compare(password, user.hash)
  if (!ok) throw new Error('INVALID_CREDENTIALS')
  const updated = await User.findOneAndUpdate(
    { _id: user.id },
    { $inc: { tokenVersion: 1 } },
    { new: true, projection: { tokenVersion: 1 } }
  )
  if (!updated) throw new Error('INVALID_CREDENTIALS')
  const tokens = issueTokens(user.id, updated.tokenVersion)
  return {
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role },
  }
}

export function issueTokens(userId: string, tokenVersion: number) {
  const accessToken = jwt.sign({ sub: userId }, requireSecret('JWT_SECRET'), { expiresIn: ACCESS_EXPIRES })
  const refreshToken = jwt.sign({ sub: userId, typ: 'refresh', ver: tokenVersion }, requireSecret('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_EXPIRES })
  return { accessToken, refreshToken }
}

export async function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, requireSecret('JWT_REFRESH_SECRET')) as JwtPayload & { typ?: string; ver?: number }
    if (payload.typ !== 'refresh') throw new Error('INVALID_TOKEN')
    const subject = payload.sub
    if (typeof subject !== 'string') throw new Error('INVALID_TOKEN')
    if (typeof payload.ver !== 'number') throw new Error('INVALID_TOKEN')
    const updated = await User.findOneAndUpdate(
      { _id: subject, tokenVersion: payload.ver },
      { $inc: { tokenVersion: 1 } },
      { new: true, projection: { tokenVersion: 1 } }
    )
    if (!updated) throw new Error('INVALID_TOKEN')
    return issueTokens(subject, updated.tokenVersion)
  } catch {
    throw new Error('INVALID_TOKEN')
  }
}
