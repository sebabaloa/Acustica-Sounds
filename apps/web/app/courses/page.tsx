"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type Course = {
  title: string
  slug: string
  description?: string
  price?: number
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    fetch(`${apiUrl}/courses`).then(async (res) => {
      if (!mounted) return
      if (!res.ok) {
        setError('Failed to load courses')
        setLoading(false)
        return
      }
      const data = await res.json()
      setCourses(data.courses || [])
      setLoading(false)
    }).catch((err) => {
      if (!mounted) return
      setError(String(err))
      setLoading(false)
    })

    return () => { mounted = false }
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cursos</h1>
      {loading ? (
        <div className="text-gray-500">Cargando cursos...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <ul>
          {courses.map((c: Course) => (
            <li key={c.slug} className="mb-3">
              <Link href={`/courses/${c.slug}`} className="text-blue-600">{c.title}</Link>
              <p className="text-sm text-muted">{c.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
