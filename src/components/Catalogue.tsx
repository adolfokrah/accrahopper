'use client'
import { useState } from 'react'
import { priceMultiplier } from '@/game/activities'
import { sfx } from '@/game/audio'
import { formatMoney } from '@/game/config'
import { FURNITURE, FURNITURE_CATS, SHOP_FURNITURE, type FurnitureCat } from '@/game/content'
import { useGame } from '@/game/store'
import { Btn } from './kit'

const TIER_LABEL = { standard: 'Essentials', premium: 'Premium', luxury: 'Luxury' } as const

/** Furniture showroom: category tabs and product cards. `delivered` adds the delivery fee and buys from home. */
export function Catalogue({ delivered, dest }: { delivered?: boolean; dest?: string }) {
  const s = useGame()
  const [cat, setCat] = useState<FurnitureCat | 'all'>('all')
  const [luxOnly, setLuxOnly] = useState(false)
  const pm = priceMultiplier(s, dest ?? 'market')
  const list = SHOP_FURNITURE.filter((t) => (cat === 'all' || FURNITURE[t].cat === cat) && (!luxOnly || FURNITURE[t].tier === 'luxury'))
  return (
    <div className="catalogue">
      <div className="cat-tabs" role="tablist" aria-label="Furniture categories">
        {FURNITURE_CATS.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => { sfx('click'); setCat(c.id) }}>
            <span aria-hidden>{c.emoji}</span> {c.name}
          </button>
        ))}
      </div>
      <label className="cat-lux">
        <input type="checkbox" checked={luxOnly} onChange={(e) => setLuxOnly(e.target.checked)} /> Luxury collection only
      </label>
      <div className="cat-grid">
        {list.map((t) => {
          const f = FURNITURE[t]
          const tier = f.tier ?? 'standard'
          const price = Math.round(f.price * pm) + (delivered ? 20 : 0)
          const owned = s.inventory.filter((o) => o.type === t).length
          const disabled = s.money < price || (delivered ? !!s.viewing : s.nearDest !== dest || !!s.activity)
          return (
            <article key={t} className={`cat-card ${tier}`}>
              <div className="cat-thumb"><span>{f.emoji}</span>{tier !== 'standard' && <em>{TIER_LABEL[tier]}</em>}</div>
              <div className="cat-body">
                <b>{f.name}</b>
                <small>{f.blurb}</small>
                <div className="cat-meta">
                  <span title="Comfort">♥ +{f.comfort}</span>
                  <span title="Floor space">⬚ {f.w}×{f.d}</span>
                  {owned > 0 && <span>Owned {owned}</span>}
                </div>
              </div>
              <Btn small disabled={disabled} onClick={() => { useGame.getState().buyFurniture(t, delivered); sfx('coin') }}>{formatMoney(price)}</Btn>
            </article>
          )
        })}
        {list.length === 0 && <small className="muted">Nothing in this range yet.</small>}
      </div>
    </div>
  )
}
