import { currentUser } from '@/server/auth'
import { query } from '@/server/db'
import { limited, playerInfo } from '@/server/players'
import { notifyUser } from '@/server/realtime'

interface Msg { id: number; from_user: string; to_user: string; body: string; created_at: string }

/** ?with=<id>: that thread (newest 60, marks it read). Without: your conversations with unread counts. */
export async function GET(request: Request) {
  const me = await currentUser()
  if (!me) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const other = new URL(request.url).searchParams.get('with')
  if (other) {
    const rows = await query<Msg>(
      `select id, from_user, to_user, body, created_at from messages
       where least(from_user, to_user) = least($1::text, $2::text) and greatest(from_user, to_user) = greatest($1::text, $2::text)
       order by id desc limit 60`,
      [me.id, other],
    )
    await query('update messages set read_at = now() where to_user = $1 and from_user = $2 and read_at is null', [me.id, other])
    return Response.json({ messages: rows.reverse() })
  }
  const convos = await query<{ other: string; last_body: string; last_at: string; unread: number }>(
    `select other, (array_agg(body order by id desc))[1] as last_body, max(created_at) as last_at,
            count(*) filter (where to_user = $1 and read_at is null)::int as unread
     from (select *, case when from_user = $1 then to_user else from_user end as other from messages
           where from_user = $1 or to_user = $1) m
     group by other order by max(id) desc limit 40`,
    [me.id],
  )
  const info = await playerInfo(convos.map((c) => c.other))
  return Response.json({ conversations: convos.map((c) => ({ ...c, name: info[c.other]?.name ?? 'Player', username: info[c.other]?.username })) })
}

/** Send a private message. Body: { to, text } */
export async function POST(request: Request) {
  const me = await currentUser()
  if (!me) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const to = typeof body?.to === 'string' ? body.to : ''
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 300) : ''
  if (!to || !text || to === me.id) return Response.json({ error: 'Nothing to send' }, { status: 400 })
  if (limited(`dm:${me.id}`, 20, 60_000)) return Response.json({ error: 'Slow down a little' }, { status: 429 })
  const [msg] = await query<Msg>(
    `insert into messages (from_user, to_user, body) select $1, $2, $3 where exists (select 1 from "user" where id = $2)
     returning id, from_user, to_user, body, created_at`,
    [me.id, to, text],
  )
  if (!msg) return Response.json({ error: 'No such player' }, { status: 404 })
  const info = (await playerInfo([me.id]))[me.id]
  await notifyUser(to, 'dm', { ...msg, name: info?.name ?? me.username })
  return Response.json({ message: msg })
}
