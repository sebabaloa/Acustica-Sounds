"use client"
import React, { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function EnrollButtonClient({ courseSlug }: { courseSlug: string }) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const enroll = async () => {
    const user = session?.user as unknown as { id?: string; name?: string; email?: string } | undefined
    if (!user?.id) {
      setMessage('Necesitas iniciar sesión')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user.id, courseSlug }),
      })
      const data = await res.json()
      if (res.ok) setMessage('Inscripción completada')
      else setMessage(data?.error || 'Error al inscribirse')
    } catch {
      setMessage('Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) return <p className="text-sm">Inicia sesión para inscribirte.</p>

  return (
    <div className="mt-4">
      <button onClick={enroll} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded">
        {loading ? 'Inscribiendo...' : 'Inscribirse gratis'}
      </button>
      {message && <div className="mt-2 text-sm">{message}</div>}
    </div>
  )
}
