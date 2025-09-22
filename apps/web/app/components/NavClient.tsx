"use client"
import React from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'

export default function NavClient() {
  const { data: session, status } = useSession()

  const loading = status === 'loading'

  const doSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="container mx-auto flex items-center justify-between">
      <Link href="/" className="font-bold">Acustica</Link>
      <nav className="space-x-4">
        <Link href="/courses" className="text-sm text-gray-700">Cursos</Link>
        {loading ? (
          <span className="text-sm text-gray-500">Cargando...</span>
        ) : session?.user ? (
          <>
            <span className="text-sm text-gray-700">{session.user.name || session.user.email}</span>
            <button onClick={doSignOut} className="text-sm text-gray-700">Sign out</button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-700">Login</Link>
            <Link href="/signup" className="text-sm text-gray-700">Signup</Link>
          </>
        )}
      </nav>
    </div>
  )
}
