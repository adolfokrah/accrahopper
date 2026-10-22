import { notFound } from 'next/navigation'
import PoseGallery from './PoseGallery'

/** Dev-only: every pose on the realistic people, side by side, for tuning. */
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <PoseGallery />
}
