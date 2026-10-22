import { currentUser } from '@/server/auth'
import { query } from '@/server/db'
import { playerInfo } from '@/server/players'

/** A player's card: names plus your friendship with them. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentUser()
  if (!me) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await ctx.params
  const info = (await playerInfo([id]))[id]
  if (!info) return Response.json({ error: 'No such player' }, { status: 404 })
  const [a, b] = [me.id, id].sort()
  const [f] = await query<{ status: string; requested_by: string }>('select status, requested_by from friends where user_a = $1 and user_b = $2', [a, b])
  const friend = !f ? 'none' : f.status === 'accepted' ? 'friends' : f.requested_by === me.id ? 'sent' : 'received'
  return Response.json({ ...info, friend })
}
