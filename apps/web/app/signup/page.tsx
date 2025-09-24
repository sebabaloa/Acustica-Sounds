"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.status === 409) {
        setError('El correo ya está registrado')
        setLoading(false)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'No se pudo crear la cuenta')
        setLoading(false)
        return
      }

      router.push('/login?registered=1')
    } catch (error) {
      console.error('[signup] register error', error)
      setError('Hubo un error al procesar tu solicitud')
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="max-w-md">
        <label className="block mb-2">
          <span className="text-sm">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            type="email"
            required
            className="block w-full border p-2 rounded"
          />
        </label>
        <label className="block mb-4">
          <span className="text-sm">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            name="password"
            type="password"
            required
            minLength={8}
            className="block w-full border p-2 rounded"
          />
        </label>
        {error ? <div className="text-red-600 mb-4">{error}</div> : null}
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={loading}>
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  )
}
