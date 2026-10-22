import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { username } from 'better-auth/plugins'
import { headers } from 'next/headers'
import { Pool } from 'pg'

/**
 * Better Auth with username + password only. Sign-up still needs an email under the hood, so the
 * client sends a placeholder derived from the username (see playerEmail); players never see it.
 * Keep the schema-affecting options in sync with scripts/migrate.mjs.
 */
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true, minPasswordLength: 6, autoSignIn: true },
  session: { expiresIn: 60 * 60 * 24 * 90 },
  plugins: [username({ minUsernameLength: 3, maxUsernameLength: 16 }), nextCookies()],
})

export interface User { id: string; username: string }

/** The signed-in player for this request, or null. */
export async function currentUser(): Promise<User | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const u = session.user as { id: string; username?: string | null; name: string }
  return { id: u.id, username: u.username ?? u.name }
}
