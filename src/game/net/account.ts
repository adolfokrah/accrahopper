import { createAuthClient } from 'better-auth/react'
import { usernameClient } from 'better-auth/client/plugins'
import { create } from 'zustand'
import { syncClock } from '../clock'
import { PRESENCE_CHANNEL } from './channel'
import { OfflineAdapter, RealtimeAdapter, type RealtimeLike } from './presence'
import { getNetAdapter, setNetAdapter } from './remotes'

export interface Account { id: string; username: string }

interface AccountState {
  /** 'checking' until the session cookie has been looked up. */
  status: 'checking' | 'out' | 'in'
  user: Account | null
  /** Live presence: other players are visible. */
  live: boolean
}

export const useAccount = create<AccountState>(() => ({ status: 'checking', user: null, live: false }))

const authClient = createAuthClient({ plugins: [usernameClient()] })

/** Better Auth sign-up needs an email; players only pick a username, so derive a placeholder. */
const playerEmail = (username: string) => `${username.toLowerCase()}@players.city-stories.invalid`

const toAccount = (u: { id: string; username?: string | null; name: string }): Account => ({ id: u.id, username: u.username ?? u.name })

async function signedIn(user: Account) {
  useAccount.setState({ status: 'in', user })
  await syncClock()
  void goLive(user)
}

/** Looks up the session cookie once at boot. */
export async function restoreSession() {
  try {
    const { data } = await authClient.getSession()
    if (data?.user) return signedIn(toAccount(data.user))
  } catch {
    /* offline: show the sign-in form */
  }
  useAccount.setState({ status: 'out', user: null })
}

/** One step: a new username makes an account, an existing one signs in. */
export async function enter(username: string, password: string): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) return { ok: false, error: 'Usernames are 3–16 letters, numbers or _' }
  if (password.length < 6) return { ok: false, error: 'Passwords need at least 6 characters' }
  try {
    const free = await authClient.isUsernameAvailable({ username })
    if (free.error) return { ok: false, error: free.error.message ?? 'Could not check that username' }
    const created = !!free.data?.available
    const res = created
      ? await authClient.signUp.email({ email: playerEmail(username), password, name: username, username })
      : await authClient.signIn.username({ username, password })
    if (res.error || !res.data?.user) {
      const msg = res.error?.status === 429 ? 'Too many tries. Wait a minute.' : created ? res.error?.message : 'That username is taken, and the password does not match.'
      return { ok: false, error: msg ?? 'Could not sign in' }
    }
    await signedIn(toAccount(res.data.user))
    return { ok: true, created }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection.' }
  }
}

export async function signOut() {
  setNetAdapter(new OfflineAdapter(), '')
  useAccount.setState({ status: 'out', user: null, live: false })
  await authClient.signOut().catch(() => undefined)
}

/** Joins the city's presence channel through Ably when the server has a key configured. */
async function goLive(user: Account) {
  if (getNetAdapter().online) return
  try {
    const probe = await fetch('/api/ably-token', { cache: 'no-store' })
    if (!probe.ok) return // multiplayer not configured yet: play on, solo
    const Ably = await import('ably')
    const client = new Ably.Realtime({ authUrl: '/api/ably-token', clientId: user.id })
    setNetAdapter(new RealtimeAdapter(client as unknown as RealtimeLike, PRESENCE_CHANNEL), user.id)
    useAccount.setState({ live: true })
  } catch (e) {
    console.warn('[City Stories] live presence unavailable', e)
  }
}
