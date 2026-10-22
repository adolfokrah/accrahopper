import { Pool, type PoolClient } from 'pg'

let pool: Pool | null = null

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await getPool().query(text, params)).rows as T[]
}

/** Runs `fn` in one transaction (rolled back if it throws). */
export async function transaction<T>(fn: (q: <R>(text: string, params?: unknown[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  const client: PoolClient = await getPool().connect()
  try {
    await client.query('begin')
    const out = await fn(async (text, params = []) => (await client.query(text, params)).rows)
    await client.query('commit')
    return out
  } catch (e) {
    await client.query('rollback').catch(() => undefined)
    throw e
  } finally {
    client.release()
  }
}
