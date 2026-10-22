// Creates/updates Better Auth's tables, then applies db/schema.sql. Run: npm run db:migrate
import { readFileSync } from 'node:fs'
import { getMigrations } from 'better-auth/db/migration'
import { username } from 'better-auth/plugins'
import { Pool } from 'pg'

process.loadEnvFile?.('.env.local')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (put it in .env.local)')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// must match the schema-affecting options in src/server/auth.ts
const { runMigrations, toBeCreated, toBeAdded } = await getMigrations({
  database: pool,
  emailAndPassword: { enabled: true },
  plugins: [username()],
})
await runMigrations()
console.log(`Auth tables: ${toBeCreated.length} created, ${toBeAdded.length} updated`)

const statements = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
  .split(/;\s*$/m)
  .map((s) => s.replace(/^--.*$/gm, '').trim())
  .filter(Boolean)
for (const s of statements) await pool.query(s)
console.log(`Applied ${statements.length} game statements`)
await pool.end()
