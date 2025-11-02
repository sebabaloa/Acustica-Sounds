import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { JWT } from 'next-auth/jwt'
import { getApiBaseUrl } from '@/lib/api'

interface Credentials {
  email?: string
  password?: string
}

interface BackendLoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: string
  }
}

interface BackendRefreshResponse {
  accessToken: string
  refreshToken: string
}

interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  accessToken: string
  refreshToken: string
  accessTokenExpires: number
}

type AuthToken = JWT & {
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

function decodeJwtExpiration(token: string): number {
  try {
    const payload = token.split('.')[1]
    if (!payload) return Date.now()
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as { exp?: number }
    return (decoded.exp ?? Math.floor(Date.now() / 1000)) * 1000
  } catch {
    return Date.now()
  }
}

async function refreshAccessToken(token: AuthToken): Promise<AuthToken> {
  try {
    const baseUrl = getApiBaseUrl()
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    })

    if (!res.ok) throw new Error(`Failed to refresh token: ${res.status}`)
    const data = (await res.json()) as BackendRefreshResponse
    if (!data.accessToken || !data.refreshToken) throw new Error('Invalid refresh payload')

    const expires = decodeJwtExpiration(data.accessToken)

    return {
      ...token,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpires: expires,
      error: undefined,
    }
  } catch (error) {
    console.error('[nextauth] refreshAccessToken error', error)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: Credentials | undefined) {
        if (!credentials?.email || !credentials?.password) return null
        const baseUrl = getApiBaseUrl()

        try {
          const res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          })

          if (!res.ok) {
            console.warn('[nextauth] authorize login failed', res.status)
            return null
          }

          const data = (await res.json()) as BackendLoginResponse
          if (!data.accessToken || !data.refreshToken || !data.user) return null

          const expires = decodeJwtExpiration(data.accessToken)

          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.email,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accessTokenExpires: expires,
          }

          return user
        } catch (error) {
          console.error('[nextauth] authorize error', error)
          return null
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      const authToken = token as AuthToken

      if (user) {
        const authUser = user as AuthUser
        return {
          ...authToken,
          accessToken: authUser.accessToken,
          refreshToken: authUser.refreshToken,
          accessTokenExpires: authUser.accessTokenExpires,
          user: {
            id: authUser.id,
            email: authUser.email,
            name: authUser.name,
            role: authUser.role,
          },
          error: undefined,
        }
      }

      if (typeof authToken.accessTokenExpires === 'number' && Date.now() < authToken.accessTokenExpires - 60_000) {
        return authToken
      }

      if (!authToken.refreshToken) {
        return { ...authToken, error: 'MissingRefreshToken' }
      }

      return refreshAccessToken(authToken)
    },
    async session({ session, token }) {
      const authToken = token as AuthToken

      if (session.user) {
        const sessionUser = session.user as typeof session.user & { role?: string }
        sessionUser.id = authToken.user?.id
        sessionUser.email = authToken.user?.email ?? sessionUser.email
        sessionUser.name = authToken.user?.name ?? sessionUser.name
        sessionUser.role = authToken.user?.role
      }

      session.accessToken = authToken.accessToken
      session.error = authToken.error

      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST, authOptions }
