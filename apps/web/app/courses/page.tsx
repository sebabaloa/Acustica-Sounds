"use client"
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Track {
  id: string
  title: string
  artist: string
  duration?: number
  coverUrl?: string
}

export default function TracksPage() {
  const { data: session, status } = useSession()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    if (status === 'loading') return

    if (status === 'unauthenticated') {
      setError('Necesitas iniciar sesión para ver los cursos')
      setLoading(false)
      return
    }

    if (!session?.accessToken) {
      setError('Sesión inválida, intenta iniciar sesión de nuevo')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchTracks = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${baseUrl}/tracks`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          signal: controller.signal,
        })

        if (!res.ok) {
          if (res.status === 401) {
            setError('Tu sesión expiró, vuelve a iniciar sesión')
          } else {
            setError('No se pudieron cargar los cursos')
          }
          setLoading(false)
          return
        }

        const data = await res.json()
        setTracks(data.tracks || [])
        setLoading(false)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(String(err))
        setLoading(false)
      }
    }

    fetchTracks()

    return () => {
      controller.abort()
    }
  }, [session?.accessToken, status])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Cursos</h1>
        <p className="text-gray-500">Cargando cursos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Cursos</h1>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cursos</h1>
      {tracks.length === 0 ? (
        <p className="text-gray-500">Aún no hay cursos disponibles.</p>
      ) : (
        <ul>
          {tracks.map((track) => (
            <li key={track.id} className="mb-3">
              <div className="font-semibold">{track.title}</div>
              <div className="text-sm text-gray-600">{track.artist}</div>
              {track.duration ? <div className="text-xs text-gray-500">Duración: {Math.round(track.duration / 60)} min</div> : null}
              {track.coverUrl ? (
                <Link href={track.coverUrl} className="text-sm text-blue-600" target="_blank" rel="noopener noreferrer">
                  Ver portada
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
