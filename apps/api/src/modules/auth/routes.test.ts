import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authRouter } from './routes'

const serviceMocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('./service', () => ({
  register: serviceMocks.register,
  login: serviceMocks.login,
  refresh: serviceMocks.refresh,
  issueTokens: vi.fn(),
}))

type JsonResult = { status: number; body: unknown }

async function invoke(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<JsonResult> {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url: path,
      body,
      headers,
    }

    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(payload: unknown) {
        this.body = payload
        resolve({ status: this.statusCode, body: payload })
        return this
      },
    }

    ;(authRouter as any).handle(req as any, res as any, (err: unknown) => {
      if (err) reject(err)
      else resolve({ status: res.statusCode, body: res.body })
    })
  })
}

describe('Auth routes', () => {
  beforeEach(() => {
    serviceMocks.register.mockReset()
    serviceMocks.login.mockReset()
    serviceMocks.refresh.mockReset()
  })

  it('rejects invalid register payload', async () => {
    const res = await invoke('POST', '/register', { email: 'bad', password: 'short' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'INVALID_INPUT' })
    expect(serviceMocks.register).not.toHaveBeenCalled()
  })

  it('creates user on register', async () => {
    serviceMocks.register.mockResolvedValue({ userId: 'user-1' })
    const res = await invoke('POST', '/register', { email: 'user@test.com', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ userId: 'user-1' })
    expect(serviceMocks.register).toHaveBeenCalledWith('user@test.com', 'password123')
  })

  it('maps EMAIL_TAKEN to 409', async () => {
    serviceMocks.register.mockRejectedValue(new Error('EMAIL_TAKEN'))
    const res = await invoke('POST', '/register', { email: 'dup@test.com', password: 'password123' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'EMAIL_TAKEN' })
  })

  it('rejects invalid login payload', async () => {
    const res = await invoke('POST', '/login', { email: 'bad', password: 'short' })
    expect(res.status).toBe(400)
    expect(serviceMocks.login).not.toHaveBeenCalled()
  })

  it('returns tokens on login', async () => {
    serviceMocks.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'b', user: { id: 'user-1', email: 'user@test.com', role: 'user' } })
    const res = await invoke('POST', '/login', { email: 'user@test.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ accessToken: 'a', refreshToken: 'b', user: { id: 'user-1', email: 'user@test.com', role: 'user' } })
    expect(serviceMocks.login).toHaveBeenCalledWith('user@test.com', 'password123')
  })

  it('maps INVALID_CREDENTIALS to 401', async () => {
    serviceMocks.login.mockRejectedValue(new Error('INVALID_CREDENTIALS'))
    const res = await invoke('POST', '/login', { email: 'user@test.com', password: 'password123' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'INVALID_CREDENTIALS' })
  })

  it('rejects invalid refresh payload', async () => {
    const res = await invoke('POST', '/refresh', { refreshToken: 123 } as any)
    expect(res.status).toBe(400)
    expect(serviceMocks.refresh).not.toHaveBeenCalled()
  })

  it('returns access token on refresh', async () => {
    serviceMocks.refresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    const res = await invoke('POST', '/refresh', { refreshToken: 'refresh-token-valid' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    expect(serviceMocks.refresh).toHaveBeenCalledWith('refresh-token-valid')
  })

  it('maps INVALID_TOKEN to 401 on refresh', async () => {
    serviceMocks.refresh.mockRejectedValue(new Error('INVALID_TOKEN'))
    const res = await invoke('POST', '/refresh', { refreshToken: 'refresh-token-bad' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'INVALID_TOKEN' })
  })
})
