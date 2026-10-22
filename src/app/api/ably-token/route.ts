import * as Ably from 'ably'
import { EVENTS_CHANNEL, PRESENCE_CHANNEL, USER_CHANNEL } from '@/game/net/channel'
import { currentUser } from '@/server/auth'

/**
 * Ably token request for the signed-in player. The API key never leaves the server and the
 * token only allows city presence, street events and reading the player's own inbox, with their id as clientId.
 */
export async function GET() {
  const key = process.env.ABLY_API_KEY
  if (!key) return Response.json({ error: 'Multiplayer is not configured (ABLY_API_KEY)' }, { status: 503 })
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const rest = new Ably.Rest({ key })
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: user.id,
    capability: {
      [PRESENCE_CHANNEL]: ['presence', 'subscribe'],
      [EVENTS_CHANNEL]: ['publish', 'subscribe'],
      [USER_CHANNEL(user.id)]: ['subscribe'],
    },
  })
  return Response.json(tokenRequest)
}
