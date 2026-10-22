import { currentUser } from '@/server/auth'
import { query } from '@/server/db'
import { playerInfo } from '@/server/players'
import { notifyUser } from '@/server/realtime'

/** Your friends and pending requests. */
export async function GET() {
  const me = await currentUser()
  if (!me) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const rows = await query<{ other: string; status: string; requested_by: string }>(
    `select case when user_a = $1 then user_b else user_a end as other, status, requested_by
     from friends where user_a = $1 or user_b = $1 order by created_at desc`,
    [me.id],
  )
  const info = await playerInfo(rows.map((r) => r.other))
  return Response.json({
    friends: rows.map((r) => ({
      id: r.other,
      name: info[r.other]?.name ?? 'Player',
      username: info[r.other]?.username ?? '',
      status: r.status === 'accepted' ? 'friends' : r.requested_by === me.id ? 'sent' : 'received',
    })),
  })
}

/** Body: { to, action: 'add' | 'accept' | 'remove' } ('remove' also declines or cancels a request). */
export async function POST(request: Request) {
  const me = await currentUser()
  if (!me) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const to = typeof body?.to === 'string' ? body.to : ''
  const action = body?.action
  if (!to || to === me.id || !['add', 'accept', 'remove'].includes(action)) return Response.json({ error: 'Bad request' }, { status: 400 })
  const [a, b] = [me.id, to].sort()
  const name = (await playerInfo([me.id]))[me.id]?.name ?? me.username
  if (action === 'add') {
    // asking someone who already asked you makes you friends straight away
    const [row] = await query<{ status: string }>(
      `insert into friends (user_a, user_b, requested_by, status)
       select $1, $2, $3, 'pending' where exists (select 1 from "user" where id = $4)
       on conflict (user_a, user_b) do update set status = case when friends.requested_by <> $3 then 'accepted' else friends.status end
       returning status`,
      [a, b, me.id, to],
    )
    if (!row) return Response.json({ error: 'No such player' }, { status: 404 })
    await notifyUser(to, row.status === 'accepted' ? 'friend-accepted' : 'friend-request', { from: me.id, name })
    return Response.json({ status: row.status === 'accepted' ? 'friends' : 'sent' })
  }
  if (action === 'accept') {
    const rows = await query(`update friends set status = 'accepted' where user_a = $1 and user_b = $2 and requested_by <> $3 returning 1`, [a, b, me.id])
    if (rows.length) await notifyUser(to, 'friend-accepted', { from: me.id, name })
    return Response.json({ status: rows.length ? 'friends' : 'none' })
  }
  await query('delete from friends where user_a = $1 and user_b = $2', [a, b])
  return Response.json({ status: 'none' })
}
