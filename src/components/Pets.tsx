'use client'
import { useState } from 'react'
import { resolve } from '@/game/activities'
import { sfx } from '@/game/audio'
import { formatMoney } from '@/game/config'
import { PETS, PET_ACTIVITIES, PET_NAMES, PET_TYPES } from '@/game/content'
import { useGame } from '@/game/store'
import type { PetType } from '@/game/types'
import { ActivityList } from './BuildingPanel'
import { Btn, Meter } from './kit'

/** Pet shop tab at Makola Market. */
export function PetShop() {
  const s = useGame()
  const [names, setNames] = useState<Partial<Record<PetType, string>>>({})
  if (s.pet) {
    const def = PETS[s.pet.type]
    return <p className="blurb">{def.emoji} You already have {s.pet.name}. One pet at a time: look after them from the Home tab.</p>
  }
  const here = s.view === 'inside' ? s.insideDest : s.nearDest
  return (
    <div className="pet-shop">
      {PET_TYPES.map((t) => {
        const def = PETS[t]
        const placeholder = PET_NAMES[(t.length * 7) % PET_NAMES.length]
        return (
          <div key={t} className="card-inner pet-offer">
            <div className="row between">
              <b><span className="pet-emoji">{def.emoji}</span> {def.name}</b>
              <b className="pet-price">{formatMoney(def.price)}</b>
            </div>
            <small className="muted">{def.blurb} {def.perk}{def.walk ? ' Needs walks.' : ''}</small>
            <div className="row">
              <input className="text-input pet-name" value={names[t] ?? ''} maxLength={14} placeholder={`Name (e.g. ${placeholder})`} onChange={(e) => setNames({ ...names, [t]: e.target.value })} aria-label={`Name your ${def.name}`} />
              <Btn small disabled={s.money < def.price || here !== 'market'} onClick={() => { sfx('success'); useGame.getState().buyPet(t, names[t] ?? '') }}>Adopt</Btn>
            </div>
          </div>
        )
      })}
      <small className="muted">Pets need food, play and baths every day. A neglected pet gets sick and runs away.</small>
    </div>
  )
}

/** Your pet's needs and care actions (Home tab). */
export function PetCard() {
  const s = useGame()
  const [rename, setRename] = useState<string | null>(null)
  const [bye, setBye] = useState(false)
  const p = s.pet
  if (!p) return null
  const def = PETS[p.type]
  const tone = (v: number) => (v < 25 ? 'red' : v < 55 ? 'gold' : 'green') as 'red' | 'gold' | 'green'
  const acts = PET_ACTIVITIES.filter((a) => a.require !== 'petwalk' || def.walk).map((a) => resolve(a, { pet: true }, s))
  return (
    <div className="card-inner pet-card">
      <div className="pet-head">
        <span className="pet-avatar">{def.emoji}</span>
        {rename !== null ? (
          <span className="row">
            <input className="text-input pet-name" value={rename} maxLength={14} onChange={(e) => setRename(e.target.value)} aria-label="Pet name" autoFocus />
            <Btn small onClick={() => { useGame.getState().renamePet(rename); setRename(null) }}>Save</Btn>
          </span>
        ) : (
          <button className="pet-title" onClick={() => setRename(p.name)} title="Rename">
            <b>{p.name}</b>
            <small>{def.name} · tap to rename</small>
          </button>
        )}
      </div>
      <div className="pet-bars">
        {([['🍖', 'Food', p.hunger], ['😊', 'Happy', p.happy], ['🛁', 'Clean', p.clean], ['❤️', 'Health', p.health]] as const).map(([e, l, v]) => (
          <div key={l} className="pet-bar"><span>{e} {l}</span><Meter value={v} tone={tone(v)} label={l} /></div>
        ))}
      </div>
      <ActivityList list={acts} />
      {bye ? (
        <div className="row">
          <small className="muted">Give {p.name} to a new family? This cannot be undone.</small>
          <Btn small kind="danger" onClick={() => { useGame.getState().rehomePet(); setBye(false) }}>Rehome</Btn>
          <Btn small kind="ghost" onClick={() => setBye(false)}>Keep</Btn>
        </div>
      ) : (
        <button className="pet-rehome" onClick={() => setBye(true)}>Find {p.name} a new home</button>
      )}
    </div>
  )
}
