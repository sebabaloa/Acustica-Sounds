import { describe, it, expect, vi, beforeEach } from 'vitest'
import { register, login, issueTokens, refresh } from './service'

const userModelMocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
}))

vi.mock('./user.model', () => ({
  User: {
    findOne: userModelMocks.findOne,
    create: userModelMocks.create,
    findOneAndUpdate: userModelMocks.findOneAndUpdate,
  },
}))

const bcryptMocks = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: bcryptMocks.hash,
    compare: bcryptMocks.compare,
  },
}))

const jwtMocks = vi.hoisted(() => ({
  sign: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: jwtMocks.sign,
    verify: jwtMocks.verify,
  },
}))

describe('Auth service', () => {
  beforeEach(() => {
    userModelMocks.findOne.mockReset()
    userModelMocks.create.mockReset()
    userModelMocks.findOneAndUpdate.mockReset()
    bcryptMocks.hash.mockReset()
    bcryptMocks.compare.mockReset()
    jwtMocks.sign.mockReset()
    jwtMocks.verify.mockReset()
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_REFRESH_SECRET = 'refresh-secret'
    process.env.JWT_EXPIRES_IN = '15m'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'
  })

  it('register throws when email already exists', async () => {
    userModelMocks.findOne.mockResolvedValue({ id: 'existing' })
    await expect(register('dup@test.com', 'password123')).rejects.toThrowError('EMAIL_TAKEN')
    expect(userModelMocks.create).not.toHaveBeenCalled()
    expect(userModelMocks.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('register hashes password and creates user', async () => {
    userModelMocks.findOne.mockResolvedValue(null)
    bcryptMocks.hash.mockResolvedValue('hashed-pass')
    userModelMocks.create.mockResolvedValue({ id: 'user-123' })

    const result = await register('new@test.com', 'password123')

    expect(bcryptMocks.hash).toHaveBeenCalledWith('password123', 10)
    expect(userModelMocks.create).toHaveBeenCalledWith({ email: 'new@test.com', hash: 'hashed-pass', role: 'user', tokenVersion: 0 })
    expect(result).toEqual({ userId: 'user-123' })
  })

  it('login throws when user not found', async () => {
    userModelMocks.findOne.mockResolvedValue(null)
    await expect(login('missing@test.com', 'password123')).rejects.toThrowError('INVALID_CREDENTIALS')
  })

  it('login throws when password mismatch', async () => {
    userModelMocks.findOne.mockResolvedValue({ id: 'user-1', hash: 'stored' })
    bcryptMocks.compare.mockResolvedValue(false)

    await expect(login('user@test.com', 'wrong')).rejects.toThrowError('INVALID_CREDENTIALS')
    expect(userModelMocks.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('login returns tokens when credentials ok', async () => {
    userModelMocks.findOne.mockResolvedValue({ id: 'user-1', hash: 'stored', _id: 'mongo-id', email: 'user@test.com', role: 'user' })
    bcryptMocks.compare.mockResolvedValue(true)
    userModelMocks.findOneAndUpdate.mockResolvedValue({ tokenVersion: 5 })
    jwtMocks.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    const result = await login('user@test.com', 'secret')

    expect(userModelMocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-1' },
      { $inc: { tokenVersion: 1 } },
      { new: true, projection: { tokenVersion: 1 } }
    )
    expect(jwtMocks.sign).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'user@test.com', role: 'user' },
    })
  })

  it('issueTokens signs access and refresh tokens', () => {
    jwtMocks.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    const tokens = issueTokens('user-xyz', 3)

    expect(jwtMocks.sign).toHaveBeenNthCalledWith(1, { sub: 'user-xyz' }, 'test-secret', { expiresIn: '15m' })
    expect(jwtMocks.sign).toHaveBeenNthCalledWith(2, { sub: 'user-xyz', typ: 'refresh', ver: 3 }, 'refresh-secret', { expiresIn: '7d' })
    expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' })
  })

  it('refresh returns new tokens when refresh token is valid', async () => {
    jwtMocks.verify.mockReturnValue({ sub: 'user-1', typ: 'refresh', ver: 2 })
    userModelMocks.findOneAndUpdate.mockResolvedValue({ tokenVersion: 3 })
    jwtMocks.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh')

    const result = await refresh('refresh-token')

    expect(jwtMocks.verify).toHaveBeenCalledWith('refresh-token', 'refresh-secret')
    expect(userModelMocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-1', tokenVersion: 2 },
      { $inc: { tokenVersion: 1 } },
      { new: true, projection: { tokenVersion: 1 } }
    )
    expect(jwtMocks.sign).toHaveBeenNthCalledWith(1, { sub: 'user-1' }, 'test-secret', { expiresIn: '15m' })
    expect(jwtMocks.sign).toHaveBeenNthCalledWith(2, { sub: 'user-1', typ: 'refresh', ver: 3 }, 'refresh-secret', { expiresIn: '7d' })
    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' })
  })

  it('refresh throws INVALID_TOKEN on verify error', async () => {
    jwtMocks.verify.mockImplementation(() => { throw new Error('bad token') })
    await expect(refresh('invalid')).rejects.toThrowError('INVALID_TOKEN')
  })

  it('refresh throws INVALID_TOKEN when payload missing sub', async () => {
    jwtMocks.verify.mockReturnValue({ typ: 'refresh', ver: 1 })
    await expect(refresh('invalid')).rejects.toThrowError('INVALID_TOKEN')
  })

  it('refresh throws INVALID_TOKEN when typ is wrong', async () => {
    jwtMocks.verify.mockReturnValue({ sub: 'user-1', typ: 'access', ver: 1 })
    await expect(refresh('invalid')).rejects.toThrowError('INVALID_TOKEN')
  })

  it('refresh throws INVALID_TOKEN when version mismatch', async () => {
    jwtMocks.verify.mockReturnValue({ sub: 'user-1', typ: 'refresh', ver: 2 })
    userModelMocks.findOneAndUpdate.mockResolvedValue(null)
    await expect(refresh('invalid')).rejects.toThrowError('INVALID_TOKEN')
  })
})
