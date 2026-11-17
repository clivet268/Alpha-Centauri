import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { conflict, handle, invalidInput, parseBody } from '../../shared/http.ts'
import { hashPassword } from '../../shared/password.ts'
import { issueToken } from '../../shared/token.ts'

const Body = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
})

export interface RegisterDesignerResponse {
  designerId: string
  token: string
  expiresAt: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const handler = handle(
  async (event): Promise<RegisterDesignerResponse> => {
    const body = parseBody(event, Body)

    const email = (body.email ?? '').trim().toLowerCase()
    if (!email) throw invalidInput('email is required.')
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      throw invalidInput('email is not a valid email address.')
    }

    const password = body.password ?? ''
    if (!password) throw invalidInput('password is required.')
    if (password.length < 8)
      throw invalidInput('password must be at least 8 characters.')
    if (password.length > 128)
      throw invalidInput('password must be at most 128 characters.')

    const { rows } = await query<{ account_id: string }>(
      `INSERT INTO account (email, password_hash, role)
       VALUES ($1, $2, 'RubricDesigner')
       ON CONFLICT (email) DO NOTHING
       RETURNING account_id`,
      [email, await hashPassword(password)],
    )
    const designerId = rows[0]?.account_id
    if (!designerId) {
      throw conflict(
        'EMAIL_IN_USE',
        'An account with this email already exists.',
      )
    }

    return { designerId, ...issueToken() }
  },
)
