import { z } from 'zod'
import { query } from '../../shared/db.ts'
import {
  handle,
  invalidInput,
  parseBody,
  unauthorized,
} from '../../shared/http.ts'
import { verifyPassword } from '../../shared/password.ts'
import { issueToken } from '../../shared/token.ts'

const Body = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
})

export interface LoginDesignerResponse {
  designerId: string
  token: string
  expiresAt: string
}

export const handler = handle(async (event): Promise<LoginDesignerResponse> => {
  const body = parseBody(event, Body)

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) throw invalidInput('email is required.')
  const password = body.password ?? ''
  if (!password) throw invalidInput('password is required.')

  const { rows } = await query<{ account_id: string; password_hash: string }>(
    `SELECT account_id, password_hash FROM account
     WHERE email = $1 AND role = 'RubricDesigner'`,
    [email],
  )
  const account = rows[0]

  // Unknown email and wrong password get the same 401 so emails can't be probed.
  if (!account || !(await verifyPassword(password, account.password_hash))) {
    throw unauthorized('Invalid email or password.')
  }

  return { designerId: account.account_id, ...issueToken() }
})
