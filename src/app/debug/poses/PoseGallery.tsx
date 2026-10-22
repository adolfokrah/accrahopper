'use client'
import dynamic from 'next/dynamic'

const Gallery = dynamic(() => import('./GalleryCanvas'), { ssr: false })

export default function PoseGallery() {
  return <div style={{ position: 'fixed', inset: 0, background: '#dfe6ee' }}><Gallery /></div>
}
