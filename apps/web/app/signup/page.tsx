import React from 'react'

async function createUser(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  await fetch(`${apiUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
}

export default function SignupPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>
      <form action={createUser} className="max-w-md">
        <label className="block mb-2">
          <span className="text-sm">Nombre</span>
          <input name="name" type="text" required className="block w-full border p-2 rounded" />
        </label>
        <label className="block mb-2">
          <span className="text-sm">Email</span>
          <input name="email" type="email" required className="block w-full border p-2 rounded" />
        </label>
        <label className="block mb-4">
          <span className="text-sm">Password</span>
          <input name="password" type="password" required className="block w-full border p-2 rounded" />
        </label>
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Crear cuenta</button>
      </form>
    </div>
  )
}
