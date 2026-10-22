import type * as Ably from 'ably'
import { create } from 'zustand'
import { formatMoney } from '../config'
import { withSaveHeld } from '../save'
import { useGame } from '../store'
import { useUI } from '../ui'
import { EVENTS_CHANNEL, USER_CHANNEL } from './channel'
import { remotes } from './remotes'

export interface DM { id: number; from_user: string; to_user: string; body: string; created_at: string }
export interface Convo { other: string; name: string; username?: string; last_body: string; last_at: string; unread: number }
export interface Friend { id: string; name: string; username: string; status: 'friends' | 'sent' | 'received' }
export interface NearbyLine { id: number; from: string; name: string; text: string }

/** Street events sent on the shared channel: chat said out loud, or an emote. */
type StreetEvent = { kind: 'say'; text: string } | { kind: 'emote'; emoji: string; verb: string; to?: string }

export const EMOTES = [
  { emoji: '👋', verb: 'waved at', label: 'Wave' },
  { emoji: '💃🏾', verb: 'danced with', label: 'Dance' },
  { emoji: '😂', verb: 'laughed with', label: 'Laugh' },
  { emoji: '🙏🏾', verb: 'thanked', label: 'Thanks' },
  { emoji: '🤝🏾', verb: 'greeted', label: 'Greet' },
] as const

/** How far (tiles) a spoken line or emote carries. */
export const HEARING_RANGE = 25
const BUBBLE_MS = 6000

interface SocialState {
  /** Players who have ever joined (null until loaded). */
  players: number | null
  /** Chat bubble over a player's head (by account id), cleared after a few seconds. */
  bubbles: Record<string, string>
  nearby: NearbyLine[]
  conversations: Convo[]
  unread: number
  friends: Friend[]
  threads: Record<string, DM[]>
  /** Players panel: card or DM thread open (account ids). */
  card: string | null
  thread: string | null
  muted: string[]
}

export const useSocial = create<SocialState>(() => ({
  players: null, bubbles: {}, nearby: [], conversations: [], unread: 0, friends: [], threads: {}, card: null, thread: null, muted: readMuted(),
}))

let me: string | null = null
let events: Ably.RealtimeChannel | null = null
let inbox: Ably.RealtimeChannel | null = null
let lineSeq = 0
const bubbleTimers = new Map<string, ReturnType<typeof setTimeout>>()

function readMuted(): string[] {
  try {
    return JSON.parse(localStorage.getItem('city-stories:muted') ?? '[]')
  } catch {
    return []
  }
}

const toast = (msg: string, kind: 'info' | 'good' | 'warn' = 'info') => useUI.getState().toast(msg, kind)
const nameOf = (id: string) => remotes.get(id)?.state.name ?? 'A player'

function showBubble(id: string, text: string) {
  useSocial.setState((s) => ({ bubbles: { ...s.bubbles, [id]: text } }))
  clearTimeout(bubbleTimers.get(id))
  bubbleTimers.set(id, setTimeout(() => useSocial.setState((s) => {
    const bubbles = { ...s.bubbles }
    delete bubbles[id]
    return { bubbles }
  }), BUBBLE_MS))
}

function inEarshot(id: string) {
  const r = remotes.get(id)
  const g = useGame.getState()
  if (!r || g.view !== 'world' || r.state.view !== 'world') return false
  return Math.hypot(r.state.x - g.player.x, r.state.z - g.player.z) <= HEARING_RANGE
}

function logNearby(from: string, text: string) {
  useSocial.setState((s) => ({ nearby: [...s.nearby, { id: ++lineSeq, from, name: from === me ? 'You' : nameOf(from), text }].slice(-40) }))
}

function onStreet(msg: Ably.InboundMessage) {
  const from = msg.clientId
  const ev = msg.data as StreetEvent
  if (!from || from === me || useSocial.getState().muted.includes(from) || !inEarshot(from)) return
  if (ev.kind === 'say' && typeof ev.text === 'string') {
    const text = ev.text.slice(0, 140)
    showBubble(from, text)
    logNearby(from, text)
  } else if (ev.kind === 'emote' && typeof ev.emoji === 'string') {
    showBubble(from, ev.emoji)
    if (ev.to === me) {
      if (me) showBubble(me, ev.emoji)
      toast(`${ev.emoji} ${nameOf(from)} ${ev.verb} you`, 'good')
    }
    logNearby(from, `${ev.emoji} ${ev.verb} ${ev.to === me ? 'you' : ev.to ? nameOf(ev.to) : 'everyone'}`)
  }
}

function onInbox(msg: Ably.InboundMessage) {
  const data = msg.data as Record<string, unknown>
  if (msg.name === 'dm') {
    const dm = data as unknown as DM & { name: string }
    if (useSocial.getState().muted.includes(dm.from_user)) return
    const open = useSocial.getState().thread === dm.from_user && useUI.getState().panel === 'players'
    useSocial.setState((s) => ({ threads: s.threads[dm.from_user] ? { ...s.threads, [dm.from_user]: [...s.threads[dm.from_user], dm] } : s.threads }))
    if (open) void openThread(dm.from_user)
    else {
      toast(`💬 ${dm.name}: ${dm.body.slice(0, 60)}`)
      void loadConversations()
    }
  } else if (msg.name === 'momo') {
    void claimMomo()
  } else if (msg.name === 'friend-request') {
    toast(`🤝🏾 ${String(data.name)} wants to be friends. Open 👥 Players to accept.`, 'good')
    void loadFriends()
  } else if (msg.name === 'friend-accepted') {
    toast(`🎉 You and ${String(data.name)} are now friends`, 'good')
    void loadFriends()
  }
}

/** Called once the Ably client is connected for a signed-in player. */
export function startSocial(client: Ably.Realtime, userId: string) {
  stopSocial()
  me = userId
  events = client.channels.get(EVENTS_CHANNEL)
  inbox = client.channels.get(USER_CHANNEL(userId))
  void events.subscribe(onStreet)
  void inbox.subscribe(onInbox)
  void loadFriends()
  void loadConversations()
}

export function stopSocial() {
  events?.unsubscribe()
  inbox?.unsubscribe()
  events = inbox = null
  me = null
  useSocial.setState({ bubbles: {}, nearby: [], conversations: [], unread: 0, friends: [], threads: {}, card: null, thread: null })
}

export const socialLive = () => !!events

/** Say something out loud: players within earshot see a bubble over your head. */
export function say(text: string) {
  const t = text.trim().slice(0, 140)
  if (!t || !events || !me) return
  void events.publish('street', { kind: 'say', text: t } satisfies StreetEvent)
  showBubble(me, t)
  logNearby(me, t)
}

export function emote(i: number, to?: string) {
  const e = EMOTES[i]
  if (!e || !events || !me) return
  void events.publish('street', { kind: 'emote', emoji: e.emoji, verb: e.verb, ...(to ? { to } : {}) } satisfies StreetEvent)
  showBubble(me, e.emoji)
  logNearby(me, `${e.emoji} ${e.verb} ${to ? nameOf(to) : 'everyone'}`)
}

export function openPlayer(id: string) {
  useSocial.setState({ card: id, thread: null })
  useUI.getState().setPanel('players')
}

export function toggleMute(id: string) {
  const muted = useSocial.getState().muted.includes(id) ? useSocial.getState().muted.filter((m) => m !== id) : [...useSocial.getState().muted, id]
  useSocial.setState({ muted })
  try {
    localStorage.setItem('city-stories:muted', JSON.stringify(muted))
  } catch {
    /* ignore */
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T & { error?: string }> {
  try {
    const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
    return await res.json()
  } catch {
    return { error: 'Could not reach the server' } as T & { error?: string }
  }
}

export async function loadStats() {
  const r = await api<{ players: number }>('/api/stats')
  if (typeof r.players === 'number') useSocial.setState({ players: r.players })
}

export async function loadConversations() {
  const r = await api<{ conversations: Convo[] }>('/api/dm')
  if (r.conversations) useSocial.setState({ conversations: r.conversations, unread: r.conversations.reduce((n, c) => n + c.unread, 0) })
}

export async function openThread(id: string) {
  useSocial.setState({ thread: id, card: null })
  const r = await api<{ messages: DM[] }>(`/api/dm?with=${encodeURIComponent(id)}`)
  if (r.messages) useSocial.setState((s) => ({ threads: { ...s.threads, [id]: r.messages } }))
  void loadConversations()
}

export async function sendDm(to: string, text: string): Promise<string | null> {
  const r = await api<{ message: DM }>('/api/dm', { method: 'POST', body: JSON.stringify({ to, text }) })
  if (!r.message) return r.error ?? 'Could not send'
  useSocial.setState((s) => ({ threads: { ...s.threads, [to]: [...(s.threads[to] ?? []), r.message] } }))
  return null
}

export async function loadFriends() {
  const r = await api<{ friends: Friend[] }>('/api/friends')
  if (r.friends) useSocial.setState({ friends: r.friends })
}

export async function friendAction(to: string, action: 'add' | 'accept' | 'remove') {
  const r = await api<{ status: string }>('/api/friends', { method: 'POST', body: JSON.stringify({ to, action }) })
  if (r.error) toast(r.error, 'warn')
  await loadFriends()
  return r.status
}

/** Sends real cedis to another player. The server checks your clean cash and moves it. */
export async function sendPlayerMomo(to: string, amount: number): Promise<string | null> {
  return withSaveHeld(async () => {
    const r = await api<{ ok: boolean; amount: number; fee: number; to: string }>('/api/momo', { method: 'POST', body: JSON.stringify({ to, amount }) })
    if (!r.ok) return r.error ?? 'Transfer failed'
    useGame.getState().playerMomoSent(r.to, r.amount, r.fee)
    toast(`📲 Sent ${formatMoney(r.amount)} to ${r.to}`, 'good')
    return null
  })
}

/** Collects MoMo other players sent you (also runs when your life loads). */
export async function claimMomo() {
  if (useGame.getState().screen !== 'game') return
  await withSaveHeld(async () => {
    const r = await api<{ received: { amount: number; name: string }[] }>('/api/momo/claim', { method: 'POST' })
    if (!r.received?.length) return
    useGame.getState().playerMomoReceived(r.received)
    for (const it of r.received) toast(`📲 ${it.name} sent you ${formatMoney(it.amount)}`, 'good')
  })
}
