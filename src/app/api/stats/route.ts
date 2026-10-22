import { connection } from 'next/server'
import { query } from '@/server/db'

/** How many players have ever joined (online counts come from live presence). */
export async function GET() {
  await connection()
  const [row] = await query<{ players: number }>('select count(*)::int as players from "user"')
  return Response.json({ players: row.players }, { headers: { 'Cache-Control': 'no-store' } })
}
