import { currentUser } from '@/server/auth'
import { transaction } from '@/server/db'
import { playerInfo } from '@/server/players'

/** Collects MoMo sent to you: credits your save and returns what arrived (the client mirrors it). */
export async function POST() {
  const me = await currentUser()
  if (!me) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const rows = await transaction(async (q) => {
    const [save] = await q<{ user_id: string }>('select user_id from saves where user_id = $1 for update', [me.id])
    if (!save) return [] // no life yet: money waits until there is one
    const got = await q<{ id: number; from_user: string; amount: number }>(
      `update transfers set claimed_at = now() where to_user = $1 and claimed_at is null returning id, from_user, amount`,
      [me.id],
    )
    const total = got.reduce((sum, t) => sum + t.amount, 0)
    if (total) {
      await q(`update saves set data = jsonb_set(data, '{game,money}', to_jsonb((data->'game'->>'money')::numeric + $2)), updated_at = now() where user_id = $1`, [me.id, total])
    }
    return got
  })
  const info = await playerInfo([...new Set(rows.map((r) => r.from_user))])
  return Response.json({ received: rows.map((r) => ({ id: r.id, amount: r.amount, from: r.from_user, name: info[r.from_user]?.name ?? 'A player' })) })
}
