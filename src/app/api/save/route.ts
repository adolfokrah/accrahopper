import { currentUser } from '@/server/auth'
import { query } from '@/server/db'

const MAX_BYTES = 2_000_000

/** The signed-in player's cloud save (the client validates it with sanitize()). */
export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const [row] = await query<{ data: unknown; updated_at: string }>('select data, updated_at from saves where user_id = $1', [user.id])
  return Response.json({ save: row?.data ?? null, updatedAt: row?.updated_at ?? null })
}

export async function PUT(request: Request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const text = await request.text()
  if (text.length > MAX_BYTES) return Response.json({ error: 'Save too large' }, { status: 413 })
  let env: { version?: unknown; game?: { profile?: unknown } } | null = null
  try {
    env = JSON.parse(text)
  } catch {
    /* handled below */
  }
  if (!env || typeof env.version !== 'number' || !env.game?.profile) return Response.json({ error: 'Bad save' }, { status: 400 })
  await query(
    `insert into saves (user_id, data, updated_at) values ($1, $2::jsonb, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
    [user.id, text],
  )
  return Response.json({ ok: true })
}

/** Start over: wipes the cloud save (the account stays). */
export async function DELETE() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  await query('delete from saves where user_id = $1', [user.id])
  return Response.json({ ok: true })
}
