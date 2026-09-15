'use client'

import dynamic from 'next/dynamic'

const ReviewsApp = dynamic(
  () => import('@/components/reviews-app').then((mod) => mod.ReviewsApp),
  { ssr: false },
)

export default function HomePage() {
  return <ReviewsApp />
}
