'use client'
import { useFrame } from '@react-three/fiber'
import { useCallback, useRef, useState } from 'react'
import type * as THREE from 'three'
import { MAX_VISIBLE_REMOTES, remotes, sampleRemote, useRemoteIds } from '@/game/net/remotes'
import { openPlayer, useSocial } from '@/game/net/social'
import { DEFAULT_APPEARANCE } from '@/game/content'
import { Character, type Motion } from './Character'
import { Label } from './Label'
import { viewCenter } from './shared'

/**
 * Other online players. Draws at most MAX_VISIBLE_REMOTES (nearest first) with lite
 * characters and interpolated movement, so a busy server cannot overload the scene.
 * With the default offline adapter there are no remotes and nothing renders.
 */
export function RemotePlayers() {
  const ids = useRemoteIds((s) => s.ids)
  if (!ids.length) return null
  return <RemotePool />
}

function RemotePool() {
  const slots = useRef<(THREE.Group | null)[]>([])
  const assigned = useRef<(string | null)[]>(Array(MAX_VISIBLE_REMOTES).fill(null))
  const motions = useRef<Motion[]>(Array.from({ length: MAX_VISIBLE_REMOTES }, () => ({ moving: false, speed: 3 })))
  const timer = useRef(0)
  const [version, setVersion] = useState(0)
  const tmp = { x: 0, z: 0, rot: 0, moving: false }
  useFrame((_, dt) => {
    timer.current += dt
    if (timer.current > 0.5) {
      timer.current = 0
      const near = [...remotes.entries()]
        .filter(([, r]) => r.state.view === 'world')
        .map(([id, r]) => ({ id, d: Math.hypot(r.state.x - viewCenter.x, r.state.z - viewCenter.z) }))
        .filter((e) => e.d < 60)
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_VISIBLE_REMOTES)
        .map((e) => e.id)
      const next = Array.from({ length: MAX_VISIBLE_REMOTES }, (_, i) => near[i] ?? null)
      if (next.some((v, i) => v !== assigned.current[i])) {
        assigned.current = next
        setVersion((v) => v + 1)
      }
    }
    for (let i = 0; i < MAX_VISIBLE_REMOTES; i++) {
      const g = slots.current[i]
      const id = assigned.current[i]
      if (!g) continue
      if (!id || !sampleRemote(id, tmp)) { g.visible = false; continue }
      g.visible = true
      g.position.set(tmp.x, 0.12, tmp.z)
      g.rotation.y = tmp.rot
      motions.current[i].moving = tmp.moving
    }
  })
  return (
    <>
      {Array.from({ length: MAX_VISIBLE_REMOTES }).map((_, i) => (
        <group key={i} ref={(el) => { slots.current[i] = el }} visible={false}>
          <SlotBody key={`${version}-${assigned.current[i]}`} index={i} assigned={assigned} motion={motions.current[i]} />
        </group>
      ))}
    </>
  )
}

function SlotBody({ index, assigned, motion }: { index: number; assigned: React.RefObject<(string | null)[]>; motion: Motion }) {
  const id = assigned.current?.[index]
  const st = id ? remotes.get(id)?.state : undefined
  const bubble = useSocial((s) => (id ? s.bubbles[id] ?? '' : ''))
  const tap = useCallback(() => { if (id) openPlayer(id) }, [id])
  return (
    <>
      <Character appearance={st?.appearance ?? DEFAULT_APPEARANCE} getMotion={() => motion} />
      <Label id={`remote-${index}`} y={1.8} cls="remote-tag" text={st ? `🌐 ${st.name}` : ''} range={30} onTap={st ? tap : undefined} />
      <Label id={`remote-bubble-${index}`} y={2.35} cls="chat-bubble" text={bubble} range={30} />
    </>
  )
}
