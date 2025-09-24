import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { User } from '../auth/user.model'

export const usersRouter: ExpressRouter = Router()

usersRouter.get('/me', verifyJWT, async (req, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'INVALID_TOKEN' })

  const query = User.findById(userId, 'email role tokenVersion createdAt updatedAt')
  const user = await query.lean()
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' })

  const id = (typeof user._id === 'string' ? user._id : user._id?.toString?.()) || userId
  res.json({
    id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
})
