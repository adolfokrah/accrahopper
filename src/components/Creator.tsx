'use client'
import { useRef, useState } from 'react'
import { sfx } from '@/game/audio'
import { ACCESSORIES, AREA_BY_ID, BEARDS, BODY_TYPES, DEFAULT_APPEARANCE, PRONOUNS, SEXES, HAIRSTYLES, HAIR_COLORS, LIFESTYLES, OUTFITS, OUTFIT_COLORS, ROOM_HOMES, SKIN_TONES, START_AREAS, TRAITS, TRAIT_IDS, type Lifestyle } from '@/game/content'
import { GAME_CONFIG } from '@/game/config'
import { AMBITIONS } from '@/game/life'
import { saveNow, setSaveOwner } from '@/game/save'
import { useAccount } from '@/game/net/account'
import { useGame } from '@/game/store'
import type { Appearance, Pronouns, TraitId } from '@/game/types'
import { AvatarPreview } from './AvatarPreview'
import { Pills, Swatches } from './CharacterPanel'
import { Btn } from './kit'

const NAMES = ['Ada', 'Tobi', 'Zainab', 'Emeka', 'Kemi', 'Sade', 'Dayo', 'Ife', 'Nneka', 'Yusuf']
const NAME_MAX = 16

/** Problem with a character name, or null when it is fine. */
export function nameError(raw: string): string | null {
  const n = raw.trim().replace(/\s+/g, ' ')
  if (!n) return 'Enter a name for your character.'
  if (n.length > NAME_MAX) return `Keep it to ${NAME_MAX} characters or fewer.`
  if (!/^\p{L}[\p{L}\p{M} '’.-]*$/u.test(n)) return 'Use letters only (spaces, hyphens and apostrophes are fine). It must start with a letter.'
  if ((n.match(/\p{L}/gu) ?? []).length < 2) return 'Use at least 2 letters.'
  return null
}

export function Creator() {
  const [name, setName] = useState('')
  const [a, setA] = useState<Appearance>({ ...DEFAULT_APPEARANCE })
  const [traits, setTraits] = useState<TraitId[]>([])
  const [pronouns, setPronouns] = useState<Pronouns>('he')
  const [dream, setDream] = useState<string | null>(null)
  const dreamRef = useRef<HTMLDivElement>(null)
  // picking a body sets sensible defaults; every option stays open to both
  const setSex = (sex: number) => {
    set({ sex, ...(sex === 1 ? { beard: 0 } : {}) })
    setPronouns((p) => (p === 'they' ? p : sex === 1 ? 'she' : 'he'))
  }
  const [life, setLife] = useState<Lifestyle>('worker')
  const areas = START_AREAS.filter((id) => ROOM_HOMES[id])
  // a different neighbourhood each new game unless the player picks one
  const [area, setArea] = useState<string>(() => areas[Math.floor(Math.random() * areas.length)] ?? 'nima')
  const set = (p: Partial<Appearance>) => setA((x) => ({ ...x, ...p }))
  const toggle = (t: TraitId) => setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 2 ? cur : [...cur, t]))
  // validation: errors show once a field has been touched or after the first Start attempt
  const [touched, setTouched] = useState({ name: false, submit: false })
  const nameRef = useRef<HTMLInputElement>(null)
  const traitsRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const errors = {
    name: nameError(name),
    traits: traits.length === 2 ? null : `Pick ${2 - traits.length} more trait${2 - traits.length === 1 ? '' : 's'} (${traits.length}/2).`,
    area: life === 'dadaba' || (areas as readonly string[]).includes(area) ? null : 'Choose where you live.',
    dream: dream ? null : 'Choose your dream in life.',
  }
  const ok = !errors.name && !errors.traits && !errors.area && !errors.dream
  const showName = (touched.name || touched.submit) && errors.name
  const rand = (n: number) => Math.floor(Math.random() * n)
  const start = () => {
    if (!ok) {
      setTouched((t) => ({ ...t, submit: true }))
      sfx('error')
      // take the player to the first problem
      if (errors.name) { nameRef.current?.focus(); nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
      else if (errors.traits) traitsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      else if (errors.dream) dreamRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      else areaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSaveOwner(useAccount.getState().user?.id ?? null)
    useGame.getState().startNewGame({ name: name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX), appearance: a, traits: [traits[0], traits[1]], pronouns, dream: dream ?? undefined }, { lifestyle: life, area })
    sfx('start')
    saveNow()
  }
  return (
    <div className="creator">
      <div className="creator-card">
        <header className="creator-head">
          <button className="btn ghost small" onClick={() => useGame.setState({ screen: 'menu' })}>← Back</button>
          <h1>Create your character</h1>
          <p>Welcome to {GAME_CONFIG.cityName}. Choose who you are and where your story starts.</p>
        </header>
        <div className="creator-grid">
          <div className="creator-preview">
            <AvatarPreview appearance={a} size={230} />
            <Btn small kind="soft" onClick={() => {
              setA({ skin: rand(SKIN_TONES.length), hair: rand(HAIRSTYLES.length), hairColor: rand(HAIR_COLORS.length), outfit: rand(OUTFITS.length), outfitColor: rand(OUTFIT_COLORS.length), accessory: rand(ACCESSORIES.length), body: rand(BODY_TYPES.length), beard: (a.sex ?? 0) === 1 ? 0 : rand(BEARDS.length), sex: a.sex ?? 0 })
              if (!name) setName(NAMES[rand(NAMES.length)])
              setArea(areas[rand(areas.length)])
            }}>🎲 Surprise me</Btn>
          </div>
          <div className="creator-form">
            <label className="lbl" htmlFor="cname">Name</label>
            <input
              id="cname"
              ref={nameRef}
              className={`text-input ${showName ? 'invalid' : ''}`}
              value={name}
              maxLength={NAME_MAX + 4}
              placeholder="Your name"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              autoComplete="off"
              aria-invalid={!!showName}
              aria-describedby="cname-msg"
            />
            <small id="cname-msg" className={`field-msg ${showName ? 'err' : ''}`} role={showName ? 'alert' : undefined}>
              {showName ? errors.name : `${name.trim().length}/${NAME_MAX} · letters, spaces, hyphens and apostrophes`}
            </small>
            <h3 className="creator-sec">🧍 Body</h3>
            <label className="lbl">Body</label><Pills items={SEXES} value={a.sex ?? 0} onChange={setSex} label="Body" />
            <label className="lbl">Pronouns</label><Pills items={PRONOUNS.map((p) => p.label)} value={PRONOUNS.findIndex((p) => p.id === pronouns)} onChange={(i) => setPronouns(PRONOUNS[i].id)} label="Pronouns" />
            <label className="lbl">Skin tone</label><Swatches colors={SKIN_TONES} value={a.skin} onChange={(skin) => set({ skin })} label="Skin tone" />
            <label className="lbl">Build</label><Pills items={BODY_TYPES} value={a.body ?? 1} onChange={(body) => set({ body })} label="Build" />
            <h3 className="creator-sec">💇🏾 Hair & face</h3>
            <label className="lbl">Hairstyle</label><Pills items={HAIRSTYLES} value={a.hair} onChange={(hair) => set({ hair })} label="Hairstyle" />
            <label className="lbl">Hair colour</label><Swatches colors={HAIR_COLORS} value={a.hairColor} onChange={(hairColor) => set({ hairColor })} label="Hair colour" />
            {(a.sex ?? 0) !== 1 && (<><label className="lbl">Facial hair</label><Pills items={BEARDS} value={a.beard ?? 0} onChange={(beard) => set({ beard })} label="Facial hair" /></>)}
            <h3 className="creator-sec">👕 Style</h3>
            <label className="lbl">Outfit</label><Pills items={OUTFITS.map((o) => o.name)} value={a.outfit} onChange={(outfit) => set({ outfit })} label="Outfit" />
            <label className="lbl">Outfit colour</label><Swatches colors={OUTFIT_COLORS} value={a.outfitColor} onChange={(outfitColor) => set({ outfitColor })} label="Outfit colour" />
            <label className="lbl">Accessory</label><Pills items={ACCESSORIES} value={a.accessory} onChange={(accessory) => set({ accessory })} label="Accessory" />
          </div>
        </div>
        <div className={`traits ${touched.submit && errors.traits ? 'invalid' : ''}`} ref={traitsRef}>
          <label className="lbl">Pick two personality traits <span className={traits.length === 2 ? 'muted' : 'field-count'}>({traits.length}/2)</span></label>
          {touched.submit && errors.traits && <small className="field-msg err" role="alert">{errors.traits}</small>}
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
        <div className={`traits ${touched.submit && errors.dream ? 'invalid' : ''}`} ref={dreamRef}>
          <label className="lbl">Your dream in life <span className="muted">· your main goal. Life may change it.</span></label>
          {touched.submit && errors.dream && <small className="field-msg err" role="alert">{errors.dream}</small>}
          <div className="trait-grid">
            {AMBITIONS.map((d) => (
              <button key={d.id} className={`trait dream ${dream === d.id ? 'on' : ''}`} onClick={() => { sfx('click'); setDream(d.id) }} aria-pressed={dream === d.id}>
                <span className="trait-emoji">{d.emoji}</span>
                <b>{d.name}</b>
                <small>{d.blurb}</small>
                <small className={`dream-path ${d.path}`}>{d.path === 'clean' ? 'Honest path' : d.path === 'crooked' ? 'Crooked path' : 'Any path'} · {d.steps.length} steps</small>
              </button>
            ))}
          </div>
        </div>
        <div className="traits">
          <label className="lbl">Your lifestyle</label>
          <div className="trait-grid">
            {(Object.keys(LIFESTYLES) as Lifestyle[]).map((id) => {
              const L = LIFESTYLES[id]
              const on = life === id
              return (
                <button key={id} className={`trait ${on ? 'on' : ''}`} onClick={() => { sfx('click'); setLife(id) }} aria-pressed={on}>
                  <span className="trait-emoji">{L.emoji}</span>
                  <b>{L.name}</b>
                  <small>{L.blurb}</small>
                  <small className="muted">{L.perks.join(' · ')}</small>
                </button>
              )
            })}
          </div>
        </div>
        <div className={`traits ${touched.submit && errors.area ? 'invalid' : ''}`} ref={areaRef}>
          <label className="lbl">Where you live</label>
          {touched.submit && errors.area && <small className="field-msg err" role="alert">{errors.area}</small>}
          {life === 'dadaba' ? (
            <small className="muted">Rich kids start in the East Legon Villa. You can move anywhere later.</small>
          ) : (
            <div className="pills" role="group" aria-label="Start neighbourhood">
              {areas.map((id) => (
                <button key={id} className={`pill ${area === id ? 'on' : ''}`} aria-pressed={area === id} onClick={() => { sfx('click'); setArea(id) }}>
                  {AREA_BY_ID[id].name}
                </button>
              ))}
            </div>
          )}
          {life !== 'dadaba' && <small className="muted">{AREA_BY_ID[area]?.blurb}</small>}
        </div>
        <footer className="creator-foot">
          <Btn onClick={start}>Start my story →</Btn>
          {!ok && (
            <ul className={`creator-todo ${touched.submit ? 'err' : ''}`} aria-live="polite">
              {errors.name && <li>✏️ {errors.name}</li>}
              {errors.traits && <li>🎭 {errors.traits}</li>}
              {errors.dream && <li>🌟 {errors.dream}</li>}
              {errors.area && <li>📍 {errors.area}</li>}
            </ul>
          )}
        </footer>
      </div>
    </div>
  )
}
