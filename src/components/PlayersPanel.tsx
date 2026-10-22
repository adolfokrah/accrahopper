'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatMoney } from '@/game/config'
import { DEST_BY_ID, areaAt } from '@/game/content'
import { useAccount } from '@/game/net/account'
import { remotes, useRemoteIds } from '@/game/net/remotes'
import {
  EMOTES, emote, friendAction, loadConversations, loadFriends, openThread, say, sendDm, sendPlayerMomo, socialLive, toggleMute, useSocial,
} from '@/game/net/social'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { Btn, Chip, Sheet } from './kit'

type Tab = 'online' | 'friends' | 'chats'

/** Where an online player is right now, in words. */
function whereIs(id: string): string | null {
  const st = remotes.get(id)?.state
  if (!st) return null
  if (st.view === 'home') return '🏠 At home'
  if (st.view === 'inside' && st.place) return `🏢 ${DEST_BY_ID[st.place]?.name ?? 'Indoors'}`
  return `📍 ${areaAt(st.x, st.z).name}`
}

const close = () => {
  useSocial.setState({ card: null, thread: null })
  useUI.getState().setPanel('none')
}
const back = () => useSocial.setState({ card: null, thread: null })

export function PlayersPanel() {
  const card = useSocial((s) => s.card)
  const thread = useSocial((s) => s.thread)
  if (thread) return <Thread id={thread} />
  if (card) return <PlayerCard id={card} />
  return <PlayerLists />
}

function PlayerLists() {
  const [tab, setTab] = useState<Tab>('online')
  const ids = useRemoteIds((s) => s.ids)
  const friends = useSocial((s) => s.friends)
  const convos = useSocial((s) => s.conversations)
  const unread = useSocial((s) => s.unread)
  const players = useSocial((s) => s.players)
  const live = useAccount((s) => s.live)
  const requests = friends.filter((f) => f.status === 'received').length
  useEffect(() => {
    void loadFriends()
    void loadConversations()
  }, [])
  return (
    <Sheet title="Players" icon="👥" onClose={close} subtitle={live ? `${ids.length + 1} online · ${players ?? '…'} have joined Accra` : 'Live play is off right now'}>
      <div className="seg" role="tablist">
        {([['online', `Online ${ids.length}`], ['friends', `Friends${requests ? ` (${requests})` : ''}`], ['chats', `Chats${unread ? ` (${unread})` : ''}`]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'online' && <OnlineTab ids={ids} />}
      {tab === 'friends' && (
        <ul className="plist">
          {!friends.length && <li className="muted">No friends yet. Tap a player and add them.</li>}
          {friends.map((f) => (
            <li key={f.id}>
              <button className="prow" onClick={() => useSocial.setState({ card: f.id })}>
                <span className={`dot ${remotes.has(f.id) ? 'on' : ''}`} aria-label={remotes.has(f.id) ? 'online' : 'offline'} />
                <b>{f.name}</b> <small className="muted">@{f.username}</small>
                <small className="muted">{remotes.has(f.id) ? whereIs(f.id) : f.status === 'friends' ? 'Offline' : ''}</small>
              </button>
              {f.status === 'received' && (
                <span className="row">
                  <Btn small onClick={() => void friendAction(f.id, 'accept')}>Accept</Btn>
                  <Btn small kind="ghost" onClick={() => void friendAction(f.id, 'remove')}>Decline</Btn>
                </span>
              )}
              {f.status === 'sent' && <Chip>Request sent</Chip>}
            </li>
          ))}
        </ul>
      )}
      {tab === 'chats' && (
        <ul className="plist">
          {!convos.length && <li className="muted">No messages yet. Tap a player, then 💬 Message.</li>}
          {convos.map((c) => (
            <li key={c.other}>
              <button className="prow" onClick={() => void openThread(c.other)}>
                <b>{c.name}</b>
                <small className="muted ellipsis">{c.last_body}</small>
                {c.unread > 0 && <Chip tone="blue">{c.unread}</Chip>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

function OnlineTab({ ids }: { ids: string[] }) {
  const nearby = useSocial((s) => s.nearby)
  const [text, setText] = useState('')
  const view = useGame((s) => s.view)
  const send = (e: FormEvent) => {
    e.preventDefault()
    say(text)
    setText('')
  }
  return (
    <>
      <form className="say-row" onSubmit={send}>
        <input className="text-input" placeholder={view === 'world' ? 'Say something to people nearby…' : 'Step outside to talk to people nearby'} value={text} maxLength={140}
          onChange={(e) => setText(e.target.value)} disabled={!socialLive() || view !== 'world'} aria-label="Say to nearby players" />
        <Btn small disabled={!text.trim() || !socialLive() || view !== 'world'}>Say</Btn>
      </form>
      {nearby.length > 0 && (
        <div className="nearby-log" aria-live="polite">
          {nearby.slice(-6).map((l) => <div key={l.id}><b>{l.name}:</b> {l.text}</div>)}
        </div>
      )}
      <ul className="plist">
        {!ids.length && <li className="muted">Nobody else is online right now. Invite a friend!</li>}
        {ids.map((id) => (
          <li key={id}>
            <button className="prow" onClick={() => useSocial.setState({ card: id })}>
              <span className="dot on" aria-hidden />
              <b>{remotes.get(id)?.state.name ?? 'Player'}</b>
              <small className="muted">{whereIs(id)}</small>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
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
    <Sheet title={name} icon="🌐" onClose={close} subtitle={<>{info ? `@${info.username}` : '…'} · {online ? whereIs(id) : 'Offline'}</>}>
      <Btn small kind="ghost" onClick={back}>← All players</Btn>
      <h3>Say hi</h3>
      <div className="emote-row">
        {EMOTES.map((e, i) => (
          <button key={e.label} className="emote" onClick={() => emote(i, id)} disabled={!online || !socialLive()} title={online ? undefined : 'They are offline'}>
            <span aria-hidden>{e.emoji}</span>{e.label}
          </button>
        ))}
      </div>
      <div className="row">
        <Btn onClick={() => void openThread(id)}>💬 Message</Btn>
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

function Thread({ id }: { id: string }) {
  const msgs = useSocial((s) => s.threads[id])
  const name = useSocial((s) => s.conversations.find((c) => c.other === id)?.name) ?? remotes.get(id)?.state.name ?? 'Player'
  const meId = useAccount((s) => s.user?.id)
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs?.length])
  const send = async (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    setErr(await sendDm(id, t))
  }
  return (
    <Sheet title={name} icon="💬" onClose={close} subtitle="Private messages">
      <Btn small kind="ghost" onClick={back}>← All players</Btn>
      <div className="dm-list">
        {!msgs && <small className="muted">Loading…</small>}
        {msgs?.length === 0 && <small className="muted">Say hello to {name}.</small>}
        {msgs?.map((m) => (
          <div key={m.id} className={`dm ${m.from_user === meId ? 'mine' : ''}`}>{m.body}</div>
        ))}
        <div ref={end} />
      </div>
      <form className="say-row" onSubmit={send}>
        <input className="text-input" placeholder="Message" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} aria-label={`Message ${name}`} />
        <Btn small disabled={!text.trim()}>Send</Btn>
      </form>
      {err && <small className="err">{err}</small>}
    </Sheet>
  )
}
