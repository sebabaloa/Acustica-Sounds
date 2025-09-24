"use client"
import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === '1'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const res = (await signIn('credentials', {
      redirect: false,
      email,
      password,
    })) as unknown as { error?: string } | null

    if (res && res.error) {
      setError(res.error === 'CredentialsSignin' ? 'Credenciales inválidas' : res.error || 'Login failed')
      return
    }

    // successful sign in
    router.push('/courses')
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Iniciar sesión</h1>
      {registered ? <div className="mb-4 text-green-600">Cuenta creada con éxito. Ahora puedes iniciar sesión.</div> : null}
      <form onSubmit={onSubmit} className="max-w-md">
        <label className="block mb-2">
          <span className="text-sm">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} name="email" type="email" required className="block w-full border p-2 rounded" />
        </label>
        <label className="block mb-4">
          <span className="text-sm">Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} name="password" type="password" required className="block w-full border p-2 rounded" />
        </label>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Entrar</button>
      </form>
    </div>
  )
}
