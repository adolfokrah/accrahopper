import { currentUser } from '@/server/auth'
import { transaction } from '@/server/db'
import { limited, playerInfo } from '@/server/players'
import { notifyUser } from '@/server/realtime'

const E_LEVY = 0.01
const MAX = 50_000

/**
 * Send cedis to another player. Body: { to, amount }. The server checks the sender's saved clean cash
 * and debits their save in the same transaction that records the transfer, so it cannot be faked.
 */
export async function POST(request: Request) {
  const me = await currentUser()
  if (!me) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const to = typeof body?.to === 'string' ? body.to : ''
  const amount = Math.floor(Number(body?.amount))
  if (!to || to === me.id || !(amount >= 1 && amount <= MAX)) return Response.json({ error: `Send between GH₵1 and GH₵${MAX.toLocaleString()}` }, { status: 400 })
  if (limited(`momo:${me.id}`, 10, 60_000)) return Response.json({ error: 'Too many transfers. Wait a minute.' }, { status: 429 })
  const fee = Math.ceil(amount * E_LEVY * 100) / 100
  const result = await transaction(async (q) => {
    const [target] = await q<{ id: string }>('select id from "user" where id = $1', [to])
    if (!target) return { error: 'No such player', status: 404 }
    const [save] = await q<{ money: number; dirty: number }>(
      `select (data->'game'->>'money')::numeric as money, coalesce((data->'game'->>'dirty')::numeric, 0) as dirty
       from saves where user_id = $1 for update`,
      [me.id],
    )
    if (!save) return { error: 'Start your life first', status: 400 }
    const clean = Number(save.money) - Number(save.dirty)
    if (clean < amount + fee) return { error: `Not enough clean cash (need GH₵${(amount + fee).toFixed(2)} incl. 1% E-levy)`, status: 400 }
    await q(
      `update saves set data = jsonb_set(data, '{game,money}', to_jsonb((data->'game'->>'money')::numeric - $2)), updated_at = now() where user_id = $1`,
      [me.id, amount + fee],
    )
    const [t] = await q<{ id: number }>('insert into transfers (from_user, to_user, amount, fee) values ($1, $2, $3, $4) returning id', [me.id, to, amount, fee])
    return { id: t.id }
  })
  if ('error' in result) return Response.json({ error: result.error }, { status: result.status })
  const info = await playerInfo([me.id, to])
  await notifyUser(to, 'momo', { id: result.id, from: me.id, name: info[me.id]?.name ?? me.username, amount })
  return Response.json({ ok: true, amount, fee, to: info[to]?.name ?? 'Player' })
}
