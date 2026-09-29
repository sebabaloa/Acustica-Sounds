import 'express'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: import("../modules/auth/user.model").UserRole
      requestId?: string
    }
  }
}

export {}
