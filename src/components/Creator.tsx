'use client'
import { useState } from 'react'
import { sfx } from '@/game/audio'
import { ACCESSORIES, DEFAULT_APPEARANCE, HAIRSTYLES, HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKIN_TONES, TRAITS, TRAIT_IDS } from '@/game/content'
import { GAME_CONFIG, formatMoney, BALANCE } from '@/game/config'
import { saveNow } from '@/game/save'
import { useGame } from '@/game/store'
import type { Appearance, TraitId } from '@/game/types'
import { AvatarPreview } from './AvatarPreview'
import { Pills, Swatches } from './CharacterPanel'
import { Btn } from './kit'

const NAMES = ['Ada', 'Tobi', 'Zainab', 'Emeka', 'Kemi', 'Sade', 'Dayo', 'Ife', 'Nneka', 'Yusuf']

export function Creator() {
  const [name, setName] = useState('')
  const [a, setA] = useState<Appearance>({ ...DEFAULT_APPEARANCE })
  const [traits, setTraits] = useState<TraitId[]>([])
  const set = (p: Partial<Appearance>) => setA((x) => ({ ...x, ...p }))
  const toggle = (t: TraitId) => setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 2 ? cur : [...cur, t]))
  const ok = name.trim().length >= 2 && traits.length === 2
  const rand = (n: number) => Math.floor(Math.random() * n)
  const start = () => {
    if (!ok) return
    useGame.getState().startNewGame({ name: name.trim().slice(0, 16), appearance: a, traits: [traits[0], traits[1]] })
    sfx('start')
    saveNow()
  }
  return (
    <div className="creator">
      <div className="creator-card">
        <header className="creator-head">
          <button className="btn ghost small" onClick={() => useGame.setState({ screen: 'menu' })}>← Back</button>
          <h1>Create your character</h1>
          <p>Welcome to {GAME_CONFIG.cityName}. You start with {formatMoney(BALANCE.startMoney)} and a rented room.</p>
        </header>
        <div className="creator-grid">
          <div className="creator-preview">
            <AvatarPreview appearance={a} size={230} />
            <Btn small kind="soft" onClick={() => {
              setA({ skin: rand(SKIN_TONES.length), hair: rand(HAIRSTYLES.length), hairColor: rand(HAIR_COLORS.length), outfit: rand(OUTFITS.length), outfitColor: rand(OUTFIT_COLORS.length), accessory: rand(ACCESSORIES.length) })
              if (!name) setName(NAMES[rand(NAMES.length)])
            }}>🎲 Surprise me</Btn>
          </div>
          <div className="creator-form">
            <label className="lbl" htmlFor="cname">Name</label>
            <input id="cname" className="text-input" value={name} maxLength={16} placeholder="Your name" onChange={(e) => setName(e.target.value)} autoComplete="off" />
            <label className="lbl">Skin tone</label><Swatches colors={SKIN_TONES} value={a.skin} onChange={(skin) => set({ skin })} label="Skin tone" />
            <label className="lbl">Hairstyle</label><Pills items={HAIRSTYLES} value={a.hair} onChange={(hair) => set({ hair })} label="Hairstyle" />
            <label className="lbl">Hair colour</label><Swatches colors={HAIR_COLORS} value={a.hairColor} onChange={(hairColor) => set({ hairColor })} label="Hair colour" />
            <label className="lbl">Outfit</label><Pills items={OUTFITS.map((o) => o.name)} value={a.outfit} onChange={(outfit) => set({ outfit })} label="Outfit" />
            <label className="lbl">Outfit colour</label><Swatches colors={OUTFIT_COLORS} value={a.outfitColor} onChange={(outfitColor) => set({ outfitColor })} label="Outfit colour" />
            <label className="lbl">Accessory</label><Pills items={ACCESSORIES} value={a.accessory} onChange={(accessory) => set({ accessory })} label="Accessory" />
          </div>
        </div>
        <div className="traits">
          <label className="lbl">Pick two personality traits <span className="muted">({traits.length}/2)</span></label>
          <div className="trait-grid">
            {TRAIT_IDS.map((t) => {
              const on = traits.includes(t)
              return (
                <button key={t} className={`trait ${on ? 'on' : ''}`} onClick={() => toggle(t)} disabled={!on && traits.length >= 2} aria-pressed={on}>
                  <span className="trait-emoji">{TRAITS[t].emoji}</span>
                  <b>{TRAITS[t].name}</b>
                  <small>{TRAITS[t].blurb}</small>
                </button>
              )
            })}
          </div>
        </div>
        <footer className="creator-foot">
          <Btn onClick={start} disabled={!ok}>Start my story →</Btn>
          {!ok && <small className="muted">{name.trim().length < 2 ? 'Enter a name (2+ letters). ' : ''}{traits.length < 2 ? 'Choose two traits.' : ''}</small>}
        </footer>
      </div>
    </div>
  )
}
