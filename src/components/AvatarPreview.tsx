'use client'
import dynamic from 'next/dynamic'
import { HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKIN_TONES } from '@/game/content'
import type { Appearance } from '@/game/types'
import { useUI } from '@/game/ui'

const Preview3D = dynamic(() => import('./three/Preview3D'), { ssr: false, loading: () => <div className="avatar-loading" /> })

function AvatarSvg({ a }: { a: Appearance }) {
  const skin = SKIN_TONES[a.skin]
  const hair = HAIR_COLORS[a.hairColor]
  const main = OUTFIT_COLORS[a.outfitColor]
  const bottom = OUTFITS[a.outfit].bottom
  return (
    <svg viewBox="0 0 100 140" role="img" aria-label="Character preview" className="avatar-svg">
      <rect x="30" y="80" width="14" height="46" rx="4" fill={bottom} />
      <rect x="56" y="80" width="14" height="46" rx="4" fill={bottom} />
      <rect x="26" y="46" width="48" height="42" rx="8" fill={main} />
      <rect x="14" y="48" width="12" height="36" rx="6" fill={main} />
      <rect x="74" y="48" width="12" height="36" rx="6" fill={main} />
      <circle cx="50" cy="30" r="20" fill={skin} />
      {a.hair === 1 && <circle cx="50" cy="22" r="26" fill={hair} />}
      {a.hair !== 3 && a.hair !== 1 && <path d="M30 28 A20 20 0 0 1 70 28 L70 22 A20 20 0 0 0 30 22Z" fill={hair} />}
      {a.hair === 4 && <circle cx="50" cy="6" r="8" fill={hair} />}
      <circle cx="43" cy="32" r="2.4" fill="#1d1512" />
      <circle cx="57" cy="32" r="2.4" fill="#1d1512" />
      <path d="M44 40 Q50 45 56 40" stroke="#1d1512" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function AvatarPreview({ appearance, size = 220 }: { appearance: Appearance; size?: number }) {
  const webgl = useUI((s) => s.webgl)
  const flat = webgl === 'failed'
  return (
    <div className="avatar" style={{ width: size, height: size * 1.15 }}>
      {flat ? <AvatarSvg a={appearance} /> : <Preview3D appearance={appearance} />}
    </div>
  )
}
