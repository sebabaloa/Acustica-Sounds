export type AppErrorCode =
  | 'NOT_FOUND'
  | 'MISSING_PLAYBACK_ID'
  | 'PROVIDER_CONFIG_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UPSTREAM_ERROR'

interface AppErrorOptions {
  code: AppErrorCode
  status: number
  message: string
  meta?: Record<string, unknown>
  cause?: unknown
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly meta?: Record<string, unknown>

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.status = options.status
    this.meta = options.meta
    if (options.cause !== undefined) {
      ;(this as any).cause = options.cause
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function createAppError(options: AppErrorOptions): AppError {
  return new AppError(options)
}
