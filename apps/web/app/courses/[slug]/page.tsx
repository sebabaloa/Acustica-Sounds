import React from 'react'
import axios from 'axios'
import Link from 'next/link'
import EnrollButtonClient from '../EnrollButtonClient'

type Lesson = {
  title: string
  duration?: number
  muxPlaybackId?: string
}

type Course = {
  title: string
  slug: string
  description?: string
  lessons: Lesson[]
}

async function getCourse(slug: string): Promise<Course> {
  const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/courses/${slug}`)
  return res.data.course as Course
}

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug)
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{course.title}</h1>
      <p className="mb-4">{course.description}</p>
      <h2 className="font-semibold">Lecciones</h2>
      <ul>
        {course.lessons.map((lesson: Lesson, idx: number) => (
          <li key={idx} className="py-2">
            <Link href={`/courses/${course.slug}/lesson/${idx}`} className="text-blue-600">{lesson.title}</Link>
          </li>
        ))}
      </ul>
      <EnrollButtonClient courseSlug={course.slug} />
    </div>
  )
}
