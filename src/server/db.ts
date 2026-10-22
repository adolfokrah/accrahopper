import { Pool } from 'pg'

let pool: Pool | null = null

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return (await pool.query(text, params)).rows as T[]
}
