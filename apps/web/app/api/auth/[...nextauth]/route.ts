import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

type Credentials = {
  email?: string
  password?: string
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: Credentials | undefined) {
        if (!credentials || !credentials.email || !credentials.password) return null
        try {
          const url = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/login'
          console.log('[nextauth] Authorize: calling backend', url)
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          })
          const data = await res.json()
          console.log('[nextauth] backend response:', data)
          if (data && data.user) {
            return { id: data.user.id, name: data.user.name, email: data.user.email }
          }
          return null
        } catch (err) {
          console.error('[nextauth] authorize error', err)
          return null
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  debug: true,
  useSecureCookies: false,
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; name?: string; email?: string }
        // return a new token object that includes user fields
        return { ...token, id: u.id, name: u.name, email: u.email }
      }
      return token
    },
    async session({ session, token }) {
      type SessionUser = { id?: string; name?: string | null; email?: string | null }
      const t = token as unknown as Partial<SessionUser>
      session.user = session.user || {}
      const su = session.user as SessionUser
      su.id = t.id
      su.name = (t.name as string) || su.name
      su.email = (t.email as string) || su.email
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST, authOptions }
