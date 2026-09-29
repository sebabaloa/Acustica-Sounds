import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('provider-factory', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.VIDEO_PROVIDER
    process.env.NODE_ENV = 'test'
    delete process.env.MUX_SIGNING_KEY_ID
    delete process.env.MUX_SIGNING_KEY_SECRET
  })

  it('resolves mux provider by default', async () => {
    vi.mock('./mux-provider', () => ({
      MuxProvider: vi.fn().mockImplementation(() => ({ name: 'mux' })),
    }))

    const { getVideoProvider } = await import('./provider-factory')
    const provider = getVideoProvider()
    expect(provider.name).toBe('mux')
  })

  it('validates configuration outside test env', async () => {
    process.env.NODE_ENV = 'development'
    vi.mock('./mux-provider', () => ({
      MuxProvider: vi.fn().mockImplementation(() => {
        throw new Error('config error')
      }),
    }))

    await expect(import('./provider-factory')).rejects.toThrowError('config error')
  })
})
