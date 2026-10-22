import * as Ably from 'ably'
import { PRESENCE_CHANNEL } from '@/game/net/channel'
import { currentUser } from '@/server/auth'

/**
 * Ably token request for the signed-in player. The API key never leaves the server and the
 * token only allows presence on the city channel, with the player's own id as clientId.
 */
export async function GET() {
  const key = process.env.ABLY_API_KEY
  if (!key) return Response.json({ error: 'Multiplayer is not configured (ABLY_API_KEY)' }, { status: 503 })
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const rest = new Ably.Rest({ key })
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: user.id,
    capability: { [PRESENCE_CHANNEL]: ['presence', 'subscribe'] },
  })
  return Response.json(tokenRequest)
}
