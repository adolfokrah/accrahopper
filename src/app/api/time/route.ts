import { connection } from 'next/server'

/** Server clock in ms, so every player derives the same shared world time. */
export async function GET() {
  await connection()
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } })
}
