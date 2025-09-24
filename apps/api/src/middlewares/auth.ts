import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../modules/auth/user.model'
import type { UserRole } from '../modules/auth/user.model'

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'NO_TOKEN' })
  const token = h.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) return res.status(500).json({ error: 'SERVER_CONFIG' })
  try {
    const payload = jwt.verify(token, secret) as any
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' })
  }
}

export function requireRole(role: UserRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'NO_TOKEN' })
    try {
      const user = await User.findById(userId, 'role').lean()
      if (!user || user.role !== role) return res.status(403).json({ error: 'FORBIDDEN' })
      req.userRole = user.role
      next()
    } catch (error) {
      next(error)
    }
  }
}
