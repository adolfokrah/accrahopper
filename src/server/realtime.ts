import * as Ably from 'ably'
import { USER_CHANNEL } from '@/game/net/channel'

let rest: Ably.Rest | null = null

/** Pushes a server-made event to one player's private channel (DMs, MoMo, friend requests). No-op without Ably. */
export async function notifyUser(userId: string, name: string, data: unknown) {
  const key = process.env.ABLY_API_KEY
  if (!key) return
  rest ??= new Ably.Rest({ key })
  await rest.channels.get(USER_CHANNEL(userId)).publish(name, data).catch((e) => console.warn('[realtime] notify failed', e))
}
