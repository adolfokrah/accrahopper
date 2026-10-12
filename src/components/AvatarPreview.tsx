'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { ACCESSORIES, HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKIN_TONES } from '@/game/content'
import type { Appearance } from '@/game/types'
import { useUI } from '@/game/ui'

const Preview3D = dynamic(() => import('./three/Preview3D'), { ssr: false, loading: () => <div className="avatar-loading" /> })

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`
}

/** Flat front-view avatar for phones: same options as the 3D model. */
function AvatarSvg({ a }: { a: Appearance }) {
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[0]
  const hair = HAIR_COLORS[a.hairColor] ?? '#1c1a1a'
  const main = OUTFIT_COLORS[a.outfitColor] ?? '#2e86de'
  const outfit = OUTFITS[a.outfit] ?? OUTFITS[0]
  const st = outfit.style
  const acc = ACCESSORIES[a.accessory] ?? 'None'
  const fem = (a.sex ?? 0) === 1
  const bw = ([0.88, 1, 1.16][a.body ?? 1] ?? 1) * (fem ? 0.9 : 1)
  const W = (v: number) => 50 + (v - 50) * bw // widen around the centre line
  const bottom = st === 'jersey' ? '#f4f4f4' : outfit.bottom
  const shoe = st === 'sport' || st === 'jersey' ? '#f4f4f4' : '#2a2320'
  const longSleeve = st === 'smart' || st === 'sport' || st === 'hoodie' || st === 'kaftan'
  const hat = acc === 'Beanie' || acc === 'Kufi cap'
  const h = a.hair
  return (
    <svg viewBox="0 0 100 150" role="img" aria-label="Character preview" className="avatar-svg">
      <defs>
        <radialGradient id="av-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff8ec" />
          <stop offset="100%" stopColor="#f1e4cc" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="150" rx="14" fill="url(#av-bg)" />
      <ellipse cx="50" cy="143" rx="26" ry="4" fill="#000" opacity="0.12" />
      {/* back hair (dreads, braids) */}
      {!hat && (h === 6 || h === 2) && [34, 40, 46, 54, 60, 66].map((x) => <rect key={x} x={x - 2} y="22" width="4" height="34" rx="2" fill={hair} />)}
      {acc === 'Backpack' && <rect x={W(28)} y="54" width={44 * bw} height="34" rx="6" fill="#8a5a2b" />}
      {/* legs */}
      {(st === 'dress' || st === 'ankara' || st === 'jersey') ? (
        <>
          <rect x={W(36)} y="96" width="11" height="40" rx="4" fill={skin} />
          <rect x={W(53)} y="96" width="11" height="40" rx="4" fill={skin} />
          {st === 'jersey' && <><rect x={W(36)} y="118" width="11" height="16" rx="3" fill={main} /><rect x={W(53)} y="118" width="11" height="16" rx="3" fill={main} /></>}
        </>
      ) : (
        <>
          <rect x={W(35)} y="88" width={13 * bw} height="48" rx="4" fill={bottom} />
          <rect x={W(52)} y="88" width={13 * bw} height="48" rx="4" fill={bottom} />
          {st === 'sport' && <><rect x={W(35)} y="88" width="2" height="48" fill="#fff" /><rect x={W(63)} y="88" width="2" height="48" fill="#fff" /></>}
        </>
      )}
      <rect x={W(33)} y="133" width="16" height="7" rx="3.5" fill={shoe} />
      <rect x={W(51)} y="133" width="16" height="7" rx="3.5" fill={shoe} />
      {/* skirts and robes */}
      {st === 'jersey' && <rect x={W(33)} y="86" width={34 * bw} height="18" rx="4" fill="#f4f4f4" />}
      {st === 'dress' && <path d={`M${W(32)} 80 L${W(68)} 80 L${W(74)} 114 L${W(26)} 114 Z`} fill={main} />}
      {st === 'kaftan' && <path d={`M${W(30)} 78 L${W(70)} 78 L${W(72)} 112 L${W(28)} 112 Z`} fill={main} />}
      {st === 'ankara' && (
        <>
          <path d={`M${W(32)} 80 L${W(68)} 80 L${W(73)} 112 L${W(27)} 112 Z`} fill={outfit.bottom} />
          {[88, 98, 108].map((y, i) => <rect key={y} x={W(30)} y={y} width={40 * bw} height="3" fill={i % 2 ? '#2fa866' : '#ce1126'} />)}
        </>
      )}
      {/* arms */}
      {[-1, 1].map((sd) => {
        const x = sd < 0 ? W(14) : W(74)
        return (
          <g key={sd}>
            <rect x={x} y="50" width={12 * bw} height="38" rx="6" fill={longSleeve ? main : skin} />
            {!longSleeve && <rect x={x} y="50" width={12 * bw} height="14" rx="6" fill={main} />}
            {st === 'sport' && <rect x={x + 5 * bw} y="50" width="2" height="34" fill="#fff" />}
            <circle cx={x + 6 * bw} cy="90" r="5.5" fill={skin} />
            {acc === 'Wristwatch' && sd < 0 && <rect x={x - 0.5} y="80" width={13 * bw} height="4" rx="1.5" fill="#1b1b1b" />}
          </g>
        )
      })}
      {/* torso: hourglass for a female body */}
      {fem ? (
        <path d={`M${W(28)} 48 Q50 44 ${W(72)} 48 Q${W(70)} 58 ${W(66)} 68 Q${W(72)} 80 ${W(72)} 90 L${W(28)} 90 Q${W(28)} 80 ${W(34)} 68 Q${W(30)} 58 ${W(28)} 48 Z`} fill={main} />
      ) : (
        <rect x={W(26)} y="46" width={48 * bw} height="44" rx="9" fill={main} />
      )}
      {fem && <path d={`M${W(36)} 58 Q${W(42)} 64 50 60 Q${W(58)} 64 ${W(64)} 58`} stroke={shade(main, 0.75)} strokeWidth="1.4" fill="none" />}
      {st === 'smart' && (
        <>
          <path d="M44 46 L50 62 L56 46 Z" fill="#f4f4f4" />
          <rect x="48.5" y="50" width="3" height="22" rx="1" fill="#a52a2a" />
          <path d={`M44 46 L50 66 L${W(34)} 52 Z`} fill={shade(main, 0.8)} />
          <path d={`M56 46 L50 66 L${W(66)} 52 Z`} fill={shade(main, 0.8)} />
        </>
      )}
      {st === 'tee' && <rect x="42" y="62" width="16" height="9" rx="2" fill="#ffffff" />}
      {st === 'sport' && <rect x="49" y="46" width="2" height="44" fill="#f0ede6" />}
      {st === 'jersey' && (
        <>
          <rect x={W(26)} y="66" width={48 * bw} height="3" fill="#fcd116" />
          <rect x={W(26)} y="69" width={48 * bw} height="3" fill="#006b3f" />
          <path d="M60 54 l1.4 3 3.2 .3 -2.4 2.1 .8 3.1 -3 -1.7 -3 1.7 .8 -3.1 -2.4 -2.1 3.2 -.3z" fill="#111" />
        </>
      )}
      {st === 'hoodie' && (
        <>
          <rect x="38" y="70" width="24" height="12" rx="4" fill={shade(main, 0.85)} />
          <rect x="46" y="48" width="1.5" height="12" fill="#f4f4f4" />
          <rect x="52.5" y="48" width="1.5" height="12" fill="#f4f4f4" />
        </>
      )}
      {st === 'kaftan' && <rect x="48" y="47" width="4" height="22" fill="#d4af37" />}
      {st === 'ankara' && [54, 64, 74].map((y, i) => <rect key={y} x={W(26)} y={y} width={48 * bw} height="4" fill={i % 2 ? '#2fa866' : '#fcd116'} />)}
      {(st === 'tee' || st === 'smart' || st === 'hoodie') && <rect x={W(26)} y="86" width={48 * bw} height="4" fill="#2a1d14" />}
      {acc === 'Gold chain' && <path d="M40 48 Q50 62 60 48" stroke="#f4c430" strokeWidth="2" fill="none" />}
      {/* neck and head */}
      <rect x="45" y="40" width="10" height="9" fill={skin} />
      <circle cx="29.5" cy="30" r="3.4" fill={skin} />
      <circle cx="70.5" cy="30" r="3.4" fill={skin} />
      {acc === 'Earrings' && <><circle cx="29.5" cy="35" r="1.8" fill="none" stroke="#d4af37" strokeWidth="1" /><circle cx="70.5" cy="35" r="1.8" fill="none" stroke="#d4af37" strokeWidth="1" /></>}
      <ellipse cx="50" cy="29" rx="20" ry="21" fill={skin} />
      {/* hair */}
      {!hat && h === 1 && <circle cx="50" cy="20" r="26" fill={hair} />}
      {!hat && h === 8 && <circle cx="50" cy="4" r="15" fill={hair} />}
      {!hat && h === 4 && <circle cx="50" cy="4" r="8" fill={hair} />}
      {!hat && h === 9 && [34, 40, 46, 52, 58, 64].map((x) => <rect key={x} x={x - 2} y="2" width="4" height="12" rx="2" fill={hair} />)}
      {!hat && h === 5 && <path d="M28 24 Q50 -8 72 24 L72 18 Q50 -2 28 18 Z" fill={main} />}
      {!hat && h === 5 && <path d="M30 20 Q50 -10 70 20 Q50 4 30 20Z" fill={main} />}
      {!hat && h !== 3 && h !== 1 && h !== 5 && <path d={h === 10 ? 'M31 22 A20 20 0 0 1 69 22 L69 19 A20 20 0 0 0 31 19Z' : 'M29 28 A21 21 0 0 1 71 28 L71 20 A21 21 0 0 0 29 20Z'} fill={hair} />}
      {!hat && h === 7 && [40, 46, 52, 58].map((x) => <line key={x} x1={x} y1="10" x2={x} y2="22" stroke={shade(hair === '#1c1a1a' ? '#555555' : hair, 0.6)} strokeWidth="1" />)}
      {acc === 'Beanie' && <><path d="M29 24 A21 22 0 0 1 71 24 Z" fill={main} /><rect x="28" y="20" width="44" height="6" rx="3" fill="#f0ede6" /></>}
      {acc === 'Kufi cap' && <rect x="32" y="6" width="36" height="14" rx="4" fill="#f4f1ea" stroke="#d4af37" strokeWidth="1.2" />}
      {acc === 'Cap' && <><path d="M29 22 A21 21 0 0 1 71 22 Z" fill={main === '#f0ede6' ? '#2e86de' : '#f0ede6'} /><rect x="44" y="19" width="30" height="4" rx="2" fill="#2b2b2b" /></>}
      {/* face */}
      <path d="M41 26 l6 -1" stroke={hair} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M53 25 l6 1" stroke={hair} strokeWidth="1.6" strokeLinecap="round" />
      {acc === 'Sunglasses' ? (
        <><rect x="38" y="28" width="10" height="6" rx="2" fill="#0d0d0f" /><rect x="52" y="28" width="10" height="6" rx="2" fill="#0d0d0f" /><rect x="48" y="29.5" width="4" height="1.2" fill="#d4af37" /></>
      ) : (
        <>
          <ellipse cx="43.5" cy="31" rx="3.2" ry="2.4" fill="#fbf8f2" />
          <ellipse cx="56.5" cy="31" rx="3.2" ry="2.4" fill="#fbf8f2" />
          <circle cx="43.5" cy="31.2" r="1.7" fill="#2a1a10" />
          <circle cx="56.5" cy="31.2" r="1.7" fill="#2a1a10" />
          <circle cx="44.1" cy="30.6" r="0.5" fill="#fff" />
          <circle cx="57.1" cy="30.6" r="0.5" fill="#fff" />
        </>
      )}
      {acc === 'Glasses' && <><circle cx="43.5" cy="31" r="4.6" fill="none" stroke="#1b1b1b" strokeWidth="1.2" /><circle cx="56.5" cy="31" r="4.6" fill="none" stroke="#1b1b1b" strokeWidth="1.2" /><line x1="48" y1="31" x2="52" y2="31" stroke="#1b1b1b" strokeWidth="1.2" /></>}
      <path d="M49 33 Q50 38 47.5 38.5 M50.5 38.5 Q53 38 51 33" stroke={shade(skin, 0.72)} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M45 42 Q50 45.5 55 42" stroke={shade(skin, 0.6)} strokeWidth="2" fill="none" strokeLinecap="round" />
      {fem && <><path d="M40 29.5 l-1.5 -1.3 M47 29.5 l1.4 -1.3" stroke="#14100e" strokeWidth="1" strokeLinecap="round" /><path d="M53 29.5 l-1.4 -1.3 M60 29.5 l1.5 -1.3" stroke="#14100e" strokeWidth="1" strokeLinecap="round" /></>}
      {!fem && (a.beard ?? 0) === 1 && <path d="M31 34 Q50 58 69 34 Q66 46 50 50 Q34 46 31 34Z" fill={hair} opacity="0.35" />}
      {!fem && (a.beard ?? 0) === 2 && <><path d="M45 40.5 Q50 39 55 40.5" stroke={hair} strokeWidth="1.8" fill="none" /><ellipse cx="50" cy="48" rx="4" ry="3.5" fill={hair} /></>}
      {!fem && (a.beard ?? 0) === 3 && <path d="M31 32 Q32 52 50 54 Q68 52 69 32 Q64 44 56 44 Q50 46 44 44 Q36 44 31 32Z" fill={hair} />}
      {acc === 'Headphones' && <><path d="M29 28 A21 23 0 0 1 71 28" stroke="#1c1a1a" strokeWidth="3" fill="none" /><rect x="25" y="26" width="7" height="11" rx="3" fill="#e0524a" /><rect x="68" y="26" width="7" height="11" rx="3" fill="#e0524a" /></>}
    </svg>
  )
}

/** Phones get the flat avatar: a second 3D view is slow to start there. Desktops load the 3D one just after the screen shows. */
export function AvatarPreview({ appearance, size = 220 }: { appearance: Appearance; size?: number }) {
  const webgl = useUI((s) => s.webgl)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches
    if (phone) return
    const t = setTimeout(() => setReady(true), 250)
    return () => clearTimeout(t)
  }, [])
  const flat = webgl === 'failed' || !ready
  return (
    <div className="avatar" style={{ width: size, height: size * 1.15 }}>
      {flat ? <AvatarSvg a={appearance} /> : <Preview3D appearance={appearance} />}
    </div>
  )
}
