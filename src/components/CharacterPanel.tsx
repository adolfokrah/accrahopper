'use client'
import { dayOf, formatMoney } from '@/game/config'
import { ACCESSORIES, BEARDS, BODY_TYPES, FURNITURE, HAIRSTYLES, HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKIN_TONES, TRAITS } from '@/game/content'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { Chip, Sheet, Meter } from './kit'
import { AvatarPreview } from './AvatarPreview'

export function Swatches({ colors, value, onChange, label }: { colors: string[]; value: number; onChange: (i: number) => void; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {colors.map((c, i) => (
        <button key={c} role="radio" aria-checked={value === i} aria-label={`${label} ${i + 1}`} className={value === i ? 'on' : ''} style={{ background: c }} onClick={() => onChange(i)} />
      ))}
    </div>
  )
}
export function Pills({ items, value, onChange, label }: { items: string[]; value: number; onChange: (i: number) => void; label: string }) {
  return (
    <div className="pills" role="radiogroup" aria-label={label}>
      {items.map((c, i) => (
        <button key={c} role="radio" aria-checked={value === i} className={value === i ? 'on' : ''} onClick={() => onChange(i)}>{c}</button>
      ))}
    </div>
  )
}

export function CharacterPanel() {
  const s = useGame()
  const p = s.profile!
  const a = p.appearance
  const set = (patch: Partial<typeof a>) => useGame.getState().updateAppearance({ ...a, ...patch })
  return (
    <Sheet title={p.name} icon="🧍" subtitle={`Day ${dayOf(s.minutes)} · ${formatMoney(s.money)}`} onClose={() => useUI.getState().setPanel('none')}>
      <div className="char-top">
        <AvatarPreview appearance={a} size={150} />
        <div className="stack">
          <b>Personality</b>
          {p.traits.map((t) => (
            <div key={t} className="trait-mini"><span>{TRAITS[t].emoji}</span><div><b>{TRAITS[t].name}</b><small>{TRAITS[t].blurb}</small></div></div>
          ))}
        </div>
      </div>
      <b>Wardrobe (free to change)</b>
      <label className="lbl">Skin tone</label><Swatches colors={SKIN_TONES} value={a.skin} onChange={(skin) => set({ skin })} label="Skin tone" />
      <label className="lbl">Build</label><Pills items={BODY_TYPES} value={a.body ?? 1} onChange={(body) => set({ body })} label="Build" />
      <label className="lbl">Hairstyle</label><Pills items={HAIRSTYLES} value={a.hair} onChange={(hair) => set({ hair })} label="Hairstyle" />
      <label className="lbl">Facial hair</label><Pills items={BEARDS} value={a.beard ?? 0} onChange={(beard) => set({ beard })} label="Facial hair" />
      <label className="lbl">Hair colour</label><Swatches colors={HAIR_COLORS} value={a.hairColor} onChange={(hairColor) => set({ hairColor })} label="Hair colour" />
      <label className="lbl">Outfit</label><Pills items={OUTFITS.map((o) => o.name)} value={a.outfit} onChange={(outfit) => set({ outfit })} label="Outfit" />
      <label className="lbl">Outfit colour</label><Swatches colors={OUTFIT_COLORS} value={a.outfitColor} onChange={(outfitColor) => set({ outfitColor })} label="Outfit colour" />
      <label className="lbl">Accessory</label><Pills items={ACCESSORIES} value={a.accessory} onChange={(accessory) => set({ accessory })} label="Accessory" />
      <b>Reputation</b>
      <div className="rep-grid">
        <div className="rep-row">
          <span>🕶️ Street cred <b>{Math.round(s.rep.street)}</b></span>
          <Meter value={s.rep.street} tone="red" label="Street cred" />
          <small className="muted">{s.rep.street >= 50 ? 'Feared: small-time robbers leave you alone. ' : ''}Better odds on every crime (+{Math.round(Math.min(20, s.rep.street / 5))}%){s.rep.street >= 40 ? ', cheaper forex boys' : ''}. Sakawa needs 15, smuggling 30.</small>
        </div>
        <div className="rep-row">
          <span>🤝 Respect <b>{Math.round(s.rep.respect)}</b></span>
          <Meter value={s.rep.respect} tone="green" label="Respect" />
          <small className="muted">Honest wages ×{(0.9 + s.rep.respect / 500).toFixed(2)}. Banks, schools and hospitals check it before hiring; letting agents want 15+. Church, volunteering and honest work raise it; crime, arrests and evictions lower it.</small>
        </div>
      </div>
      <b>Life so far</b>
      <div className="chips">
        <Chip>🍛 {s.stats.mealsEaten} meals</Chip>
        <Chip>💼 {s.stats.shiftsCompleted} shifts</Chip>
        <Chip>😴 {s.stats.sleeps} nights</Chip>
        <Chip>🚌 {s.stats.tripsTaken} trips</Chip>
        <Chip>💬 {s.stats.conversations} chats</Chip>
        <Chip tone="plus">Earned {formatMoney(s.stats.moneyEarned)}</Chip>
        <Chip tone="minus">Spent {formatMoney(s.stats.moneySpent)}</Chip>
      </div>
      {s.inventory.length > 0 && (
        <>
          <b>Inventory</b>
          <div className="chips">{s.inventory.map((o) => <Chip key={o.uid}>{FURNITURE[o.type].emoji} {FURNITURE[o.type].name}{o.placed ? '' : ' (stored)'}</Chip>)}</div>
        </>
      )}
    </Sheet>
  )
}
