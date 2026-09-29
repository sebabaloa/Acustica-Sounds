import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
    user?: {
      id?: string
      email?: string | null
      name?: string | null
      role?: string
    }
  }

  interface User {
    id?: string
    email?: string
    name?: string
    role?: string
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    user?: {
      id?: string
      email?: string
      name?: string | null
      role?: string
    }
    error?: string
  }
}
