import { Router } from 'express'
import { RegisterSchema, LoginSchema, RefreshSchema } from './schemas'
import { register, login, refresh } from './service'

export const authRouter: Router = Router()

authRouter.post('/register', async (req, res) => {
  const parse = RegisterSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT' })
  try {
    const out = await register(parse.data.email, parse.data.password)
    res.status(201).json(out)
  } catch (e: any) {
    if (e.message === 'EMAIL_TAKEN') return res.status(409).json({ error: 'EMAIL_TAKEN' })
    res.status(500).json({ error: 'INTERNAL' })
  }
})

authRouter.post('/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT' })
  try {
    const out = await login(parse.data.email, parse.data.password)
    res.json(out)
  } catch (e: any) {
    if (e.message === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    res.status(500).json({ error: 'INTERNAL' })
  }
})

authRouter.post('/refresh', async (req, res) => {
  const parse = RefreshSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT' })
  try {
    const out = await refresh(parse.data.refreshToken)
    res.json(out)
  } catch {
    res.status(401).json({ error: 'INVALID_TOKEN' })
  }
})
