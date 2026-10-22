'use client'
import { useEffect, useState } from 'react'
import { formatMoney } from '@/game/config'
import { remotes, useRemoteIds } from '@/game/net/remotes'
import { EMOTES, chatWith, emote, friendAction, sendPlayerMomo, socialLive, toggleMute, useSocial } from '@/game/net/social'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { Btn, Chip, Sheet } from './kit'

const close = () => {
  useSocial.setState({ card: null })
  useUI.getState().setPanel('none')
}

/** Card for a player you tapped in the city. Chatting happens in the phone's Chat app. */
export function PlayersPanel() {
  const card = useSocial((s) => s.card)
  useEffect(() => { if (!card) useUI.getState().setPanel('none') }, [card])
  return card ? <PlayerCard key={card} id={card} /> : null
}

interface CardInfo { id: string; username: string; name: string; friend: 'none' | 'friends' | 'sent' | 'received' }

function PlayerCard({ id }: { id: string }) {
  const [info, setInfo] = useState<CardInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const muted = useSocial((s) => s.muted.includes(id))
  const money = useGame((s) => s.money)
  const online = useRemoteIds((s) => s.ids.includes(id))
  useEffect(() => {
    let live = true
    void fetch(`/api/players/${encodeURIComponent(id)}`).then((r) => r.json()).then((d) => live && !d.error && setInfo(d))
    return () => { live = false }
  }, [id])
  const name = info?.name ?? remotes.get(id)?.state.name ?? 'Player'
  const friend = async (action: 'add' | 'accept' | 'remove') => {
    const status = await friendAction(id, action)
    if (status && info) setInfo({ ...info, friend: status as CardInfo['friend'] })
  }
  const momo = async () => {
    const n = Math.floor(Number(amount))
    if (!(n >= 1)) return setNote('Enter an amount')
    setBusy(true)
    setNote(null)
    const err = await sendPlayerMomo(id, n)
    setBusy(false)
    if (err) setNote(err)
    else setAmount('')
  }
  return (
    <Sheet title={name} icon="🌐" onClose={close} subtitle={<>{info ? `@${info.username}` : '…'} · {online ? 'Online' : 'Offline'}</>}>
      <h3>Say hi</h3>
      <div className="emote-row">
        {EMOTES.map((e, i) => (
          <button key={e.label} className="emote" onClick={() => emote(i, id)} disabled={!online || !socialLive()} title={online ? undefined : 'They are offline'}>
            <span aria-hidden>{e.emoji}</span>{e.label}
          </button>
        ))}
      </div>
      <div className="row">
        <Btn onClick={() => chatWith(id)}>💬 Message</Btn>
        {info?.friend === 'none' && <Btn kind="soft" onClick={() => void friend('add')}>➕ Add friend</Btn>}
        {info?.friend === 'received' && <Btn kind="soft" onClick={() => void friend('accept')}>🤝🏾 Accept friend</Btn>}
        {info?.friend === 'sent' && <Chip>Friend request sent</Chip>}
        {info?.friend === 'friends' && <Chip tone="plus">Friends</Chip>}
      </div>
      <h3>📲 Send MoMo</h3>
      <form className="say-row" onSubmit={(e) => { e.preventDefault(); void momo() }}>
        <input className="text-input" inputMode="numeric" placeholder="Amount (GH₵)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} aria-label="MoMo amount" />
        <Btn small disabled={busy || !amount}>{busy ? 'Sending…' : 'Send'}</Btn>
      </form>
      <small className={note ? 'err' : 'muted'}>{note ?? `Real cedis from your clean cash, plus 1% E-levy. You have ${formatMoney(money)}.`}</small>
      <div className="row">
        {info?.friend === 'friends' && <Btn small kind="ghost" onClick={() => void friend('remove')}>Unfriend</Btn>}
        <Btn small kind="ghost" onClick={() => toggleMute(id)}>{muted ? '🔈 Unmute' : '🔇 Mute'}</Btn>
      </div>
    </Sheet>
  )
}
