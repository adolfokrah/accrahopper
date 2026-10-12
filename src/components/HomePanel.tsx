'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { activitiesForFurniture } from '@/game/activities'
import { formatMoney } from '@/game/config'
import { BUILD_PIECES, FURNITURE, HOMES, HOME_TIERS, SELL_BACK, SHOP_FURNITURE, UPGRADES, homeDestId } from '@/game/content'
import { priceMultiplier } from '@/game/activities'
import { sfx } from '@/game/audio'
import { EXTENSIONS, PAINTS, canExtend, comfortOf, extCount, itemsInHome } from '@/game/home'
import { walkToDest } from '@/game/nav'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { ActivityRow, RentOutBtn } from './BuildingPanel'
import { Btn, Chip, Sheet } from './kit'

function Outside() {
  const s = useGame()
  const home = HOMES[s.housing.tier]
  const near = s.nearDest === homeDestId(s)
  return (
    <Sheet title="Home" icon="🏠" onClose={() => useUI.getState().setPanel('none')} subtitle={`${home.name} · rent ${formatMoney(home.rent)}/week`}>
      {near ? (
        <Btn onClick={() => useGame.getState().enterHome()} disabled={!!s.activity}>🚪 Enter home</Btn>
      ) : (
        <Btn onClick={() => { walkToDest(homeDestId(s)); useUI.getState().setPanel('none') }} disabled={!!s.activity}>🚶 Walk home</Btn>
      )}
      <b>Compare housing</b>
      <div className="compare">
        {HOME_TIERS.map((t) => {
          const h = HOMES[t]
          const owned = s.owned.includes(t)
          const cur = s.housing.tier === t
          return (
            <div key={t} className={`card-inner housing ${cur ? 'current' : ''}`}>
              <div className="row between"><b>{h.name}</b>{cur ? <Chip tone="plus">Current{owned ? ' · owned' : ''}</Chip> : owned ? <Chip tone="plus">Owned</Chip> : <Chip tone="gold">{formatMoney(h.rent)}/wk</Chip>}</div>
              <ul className="amenities">{h.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
              {!cur && (
                <Btn small kind="soft" disabled={s.money < (owned ? 0 : h.rent) + 50 || !!s.activity} onClick={() => useGame.getState().moveHome(t)}>
                  Move in · {formatMoney((owned ? 0 : h.rent) + 50)}
                </Btn>
              )}
              <RentOutBtn k={t} />
            </div>
          )
        })}
      </div>
      <small className="muted">Moving costs the first week of rent plus a GH₵50 moving fee (owned homes: fee only). Buy land or homes at Accra Realty.</small>
      <HomeUpgrades />
      <Inventory />
    </Sheet>
  )
}

const sellPrice = (t: keyof typeof FURNITURE) => Math.round(FURNITURE[t].price * SELL_BACK.furniture)

function Inventory() {
  const inv = useGame((s) => s.inventory)
  if (!inv.length) return <small className="muted">Furniture you buy at Makola Market appears here.</small>
  return (
    <>
      <b>Your furniture</b>
      <ul className="inv">
        {inv.map((o) => (
          <li key={o.uid}>
            <span>{FURNITURE[o.type].emoji} {FURNITURE[o.type].name} <Chip tone={o.placed ? 'plus' : 'warn'}>{o.placed ? 'Placed' : 'In storage'}</Chip></span>
            <Btn small kind="ghost" onClick={() => { sfx('coin'); useGame.getState().sellFurniture(o.uid) }}>Sell {formatMoney(sellPrice(o.type))}</Btn>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Upgrades for the current home, with extension rules (owned homes only) and paint colours. */
function HomeUpgrades() {
  const s = useGame()
  const tier = s.housing.tier
  const have = s.upgrades[tier] ?? []
  const own = canExtend(s)
  const ext = extCount(have)
  const nextExt = EXTENSIONS.find((e) => !have.includes(e))
  const style = s.homeStyle[tier]
  return (
    <div className="card-inner">
      <b>🔧 Upgrade your {HOMES[tier].name.toLowerCase()}</b>
      {UPGRADES.filter((u) => !(EXTENSIONS as readonly string[]).includes(u.id)).map((u) => (
        <div key={u.id} className="row between upg">
          <span>{u.emoji} {u.name}<small className="muted block">{u.blurb}</small></span>
          {have.includes(u.id) ? <Chip tone="plus">{u.id === 'flat' ? 'Tenant paying' : 'Installed'}</Chip> : u.id === 'flat' && !own ? <Chip tone="warn">Own it first</Chip> : <Btn small disabled={s.money < u.price} onClick={() => { useGame.getState().buyUpgrade(u.id); sfx('coin') }}>{formatMoney(u.price)}</Btn>}
        </div>
      ))}
      {have.includes('paint') && (
        <div className="paint-row" role="group" aria-label="Paint colour">
          <small className="muted">Paint colour:</small>
          {PAINTS.map((p) => (
            <button
              key={p.name}
              className={`swatch ${style?.wall === p.wall || (!style?.wall && p === PAINTS[0]) ? 'on' : ''}`}
              style={{ background: `linear-gradient(135deg, ${p.wall} 55%, ${p.floor} 55%)` }}
              title={p.name}
              aria-label={p.name}
              onClick={() => { sfx('click'); useGame.getState().setPaint(p.wall, p.floor) }}
            />
          ))}
        </div>
      )}
      <div className="row between upg">
        <span>
          🧱 Extend the room {ext > 0 && <Chip tone="blue">{ext}/{EXTENSIONS.length} built</Chip>}
          <small className="muted block">
            {!own ? 'Only homes you own can be extended. Buy or build a house.' : nextExt ? UPGRADES.find((u) => u.id === nextExt)?.blurb : 'Fully extended. This is as big as it gets.'}
          </small>
        </span>
        {own && nextExt && (() => {
          const u = UPGRADES.find((x) => x.id === nextExt)!
          return <Btn small disabled={s.money < u.price} onClick={() => { useGame.getState().buyUpgrade(u.id); sfx('coin') }}>{formatMoney(u.price)}</Btn>
        })()}
      </div>
    </div>
  )
}

/** Floating Move / Rotate / Store bar for the selected or held piece in Decorate mode. */
function DecoBar() {
  const s = useGame()
  const edit = useUI((u) => u.editMode)
  const selected = useUI((u) => u.selectedFurniture)
  const holdingUid = useUI((u) => u.holdingUid)
  const dragUid = useUI((u) => u.dragUid)
  const holdRot = useUI((u) => u.holdRot)
  if (!edit) return null
  const items = itemsInHome(s.housing.tier, s.inventory)
  const heldId = holdingUid ?? dragUid
  const held = heldId !== null ? items.find((i) => i.id === heldId) ?? s.inventory.map((o) => ({ id: o.uid, type: o.type, fixture: false })).find((o) => o.id === heldId) : undefined
  const sel = held ? undefined : items.find((i) => i.id === selected)
  const it = held ?? sel
  if (typeof document === 'undefined') return null
  if (!it) return createPortal(<div className="deco-bar hint">✋ Drag any furniture to move it · tap to select</div>, document.body)
  return createPortal(
    <div className="deco-bar" role="toolbar" aria-label="Furniture tools">
      <span className="deco-name">{FURNITURE[it.type].emoji} {FURNITURE[it.type].name}{held ? ' · tap a green spot' : ''}</span>
      {held ? (
        <>
          <button onClick={() => useUI.setState({ holdRot: holdRot === 0 ? 1 : 0 })}>↻ Rotate</button>
          <button onClick={() => useUI.setState({ holdingUid: null, dragUid: null })}>✕ Cancel</button>
        </>
      ) : (
        sel && (
          <>
            <button onClick={() => useUI.setState({ holdingUid: sel.id, holdRot: sel.rot, selectedFurniture: null })}>✋ Move</button>
            <button onClick={() => {
              sfx('click')
              if (!useGame.getState().placeFurniture(sel.id, sel.x, sel.y, sel.rot === 0 ? 1 : 0)) useUI.setState({ holdingUid: sel.id, holdRot: sel.rot === 0 ? 1 : 0, selectedFurniture: null })
            }}>↻ Rotate</button>
            {!sel.fixture && <button onClick={() => { useGame.getState().storeFurniture(sel.id); useUI.setState({ selectedFurniture: null }) }}>📦 Store</button>}
            {!sel.fixture && <button onClick={() => { sfx('coin'); useGame.getState().sellFurniture(sel.id); useUI.setState({ selectedFurniture: null }) }}>💰 Sell {formatMoney(sellPrice(sel.type))}</button>}
            <button onClick={() => useUI.setState({ selectedFurniture: null })}>✓ Done</button>
          </>
        )
      )}
    </div>,
    document.body,
  )
}

function Inside() {
  const s = useGame()
  const selected = useUI((u) => u.selectedFurniture)
  const edit = useUI((u) => u.editMode)
  const holdingUid = useUI((u) => u.holdingUid)
  const holdRot = useUI((u) => u.holdRot)
  const [open, setOpen] = useState<string | null>(null)
  const home = HOMES[s.housing.tier]
  const items = itemsInHome(s.housing.tier, s.inventory)
  const sel = items.find((i) => i.id === selected)
  const holding = s.inventory.find((o) => o.uid === holdingUid)
  const stored = s.inventory.filter((o) => !o.placed)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && useUI.getState().holdingUid) useUI.setState((u) => ({ holdRot: u.holdRot === 0 ? 1 : 0 }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setEdit = (v: boolean) => useUI.setState({ editMode: v, selectedFurniture: null, holdingUid: null })
  const hold = (uid: number) => useUI.setState({ holdingUid: uid, holdRot: 0, selectedFurniture: null, editMode: true })

  return (
    <Sheet
      title={home.name}
      icon="🏠"
      subtitle={`Comfort ${comfortOf(s.housing.tier, s.inventory, s.upgrades[s.housing.tier] ?? [])} · better comfort means better sleep`}
      onClose={() => useUI.getState().setPanel('none')}
      minimize
      footer={<Btn kind="ghost" onClick={() => useGame.getState().exitHome()} disabled={!!s.activity}>🚪 Leave home</Btn>}
    >
      <div className="tabs">
        <button className={!edit ? 'on' : ''} onClick={() => setEdit(false)}>Use</button>
        <button className={edit ? 'on' : ''} onClick={() => setEdit(true)}>Decorate</button>
      </div>

      {!edit && (
        <>
          {!sel && <p className="blurb">Tap a bed, shower, toilet, fridge, sofa or computer in the room to use it.</p>}
          {sel && (
            <>
              <div className="here">{FURNITURE[sel.type].emoji} {FURNITURE[sel.type].name}</div>
              {(() => {
                const list = activitiesForFurniture(s, sel.id)
                if (!list.length) return <small className="muted">{FURNITURE[sel.type].blurb} (Decoration only. It adds comfort.)</small>
                return <div className="act-list">{list.map((r) => <ActivityRow key={r.def.id} r={r} open={open === r.def.id} onToggle={() => setOpen(open === r.def.id ? null : r.def.id)} />)}</div>
              })()}
            </>
          )}
        </>
      )}

      {edit && (
        <>
          <DecoBar />
          <p className="blurb">Drag any piece (even the bed) to move it. Tap a piece for Move, Rotate and Store. Press R while moving to rotate. New furniture is delivered to storage below.</p>
          {holding && <small className="muted">Placing {FURNITURE[holding.type].emoji} {FURNITURE[holding.type].name}: tap a green spot in the room.</small>}
          <b>🛒 Furniture catalogue (delivered, +GH₵20)</b>
          <div className="shop">
            {SHOP_FURNITURE.map((t) => {
              const f = FURNITURE[t]
              const price = Math.round(f.price * priceMultiplier(s, 'market')) + 20
              return (
                <div key={t} className="shop-item">
                  <span className="shop-ico">{f.emoji}</span>
                  <div className="shop-text"><b>{f.name}</b><small>{f.blurb} · Comfort +{f.comfort}</small></div>
                  <Btn small disabled={s.money < price || !!s.viewing} onClick={() => { useGame.getState().buyFurniture(t, true); sfx('coin') }}>{formatMoney(price)}</Btn>
                </div>
              )
            })}
          </div>
          <b>🧱 Walls & rooms (+GH₵20 delivery)</b>
          <small className="muted">Place walls and doorways to split your home into bedrooms, a kitchen or a hall. Rotate (R) to turn them.</small>
          <div className="shop">
            {BUILD_PIECES.map((t) => {
              const f = FURNITURE[t]
              const price = f.price + 20
              return (
                <div key={t} className="shop-item">
                  <span className="shop-ico">{f.emoji}</span>
                  <div className="shop-text"><b>{f.name}</b><small>{f.blurb} · {f.w}×{f.d}</small></div>
                  <Btn small disabled={s.money < price || !!s.viewing} onClick={() => { useGame.getState().buyFurniture(t, true, true); sfx('coin') }}>{formatMoney(price)}</Btn>
                </div>
              )
            })}
          </div>
          <HomeUpgrades />
          <b>In storage ({stored.length})</b>
          {stored.length === 0 && <small className="muted">Nothing in storage. Buy furniture at Makola Market.</small>}
          <ul className="inv">
            {stored.map((o) => (
              <li key={o.uid}>
                <span>{FURNITURE[o.type].emoji} {FURNITURE[o.type].name}</span>
                <span className="row">
                  <Btn small onClick={() => { hold(o.uid); sfx('click') }}>Place</Btn>
                  <Btn small kind="ghost" onClick={() => { sfx('coin'); useGame.getState().sellFurniture(o.uid) }}>Sell {formatMoney(sellPrice(o.type))}</Btn>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

function Viewing() {
  const s = useGame()
  const t = s.viewing!
  const h = HOMES[t]
  const owned = s.owned.includes(t)
  return (
    <Sheet title={`Viewing: ${h.name}`} icon="🔑" minimize onClose={() => useUI.getState().setPanel('none')} subtitle={`${owned ? 'You own this home' : `Rent ${formatMoney(h.rent)}/week${h.buy ? ` · buy ${formatMoney(h.buy)}` : ''}`}`}
      footer={<Btn kind="ghost" onClick={() => useGame.getState().exitHome()}>🚪 Leave</Btn>}>
      <p className="blurb">Have a look around. Fixtures shown are included with the home.</p>
      <ul className="amenities">{h.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
      <Btn disabled={s.money < (owned ? 0 : h.rent) + 50} onClick={() => useGame.getState().moveHome(t)}>Move in · {formatMoney((owned ? 0 : h.rent) + 50)}</Btn>
      {h.buy > 0 && !owned && <small className="muted">To buy it outright, visit Accra Realty.</small>}
    </Sheet>
  )
}

export function HomePanel() {
  const view = useGame((s) => s.view)
  const viewing = useGame((s) => s.viewing)
  return view === 'home' ? (viewing ? <Viewing /> : <Inside />) : <Outside />
}
