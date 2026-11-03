import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { query } from '../../shared/db.ts'
import {
  forbidden,
  handle,
  invalidInput,
  parseBody,
  unauthorized,
} from '../../shared/http.ts'
import { verifyPassword } from '../../shared/password.ts'

// POST /journal/login
// 200 { journalId, token, expiresAt } | 400 INVALID_INPUT | 401 UNAUTHORIZED | 403 FORBIDDEN

// Optional here only so a missing field produces "<field> is required."; checked by hand below.
const Body = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
})

export interface LoginJournalResponse {
  journalId: string
  token: string
  expiresAt: string
}

interface AccountRow {
  account_id: string
  password_hash: string
  journal_id: string | null
  withdrawn_at: string | null
}

export const handler = handle(async (event): Promise<LoginJournalResponse> => {
  const body = parseBody(event, Body)

  // Register stores emails lowercase, so Login must lowercase too.
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) throw invalidInput('email is required.')
  const password = body.password ?? ''
  if (!password) throw invalidInput('password is required.')

  const { rows } = await query<AccountRow>(
    `SELECT a.account_id, a.password_hash, j.journal_id, j.withdrawn_at
     FROM account a
     LEFT JOIN journal j ON j.editor_id = a.account_id
     WHERE a.email = $1 AND a.role = 'JournalEditor'`,
    [email],
  )
  const account = rows[0]

  // Unknown email and wrong password get the same 401 so emails can't be probed.
  if (!account || !(await verifyPassword(password, account.password_hash))) {
    throw unauthorized('Invalid email or password.')
  }
  if (!account.journal_id || account.withdrawn_at) {
    throw forbidden('This account has no active journal.')
  }

  return { journalId: account.journal_id, ...issueToken() }
})

// TOKEN PLACEHOLDER: same as Register's. There is no session/auth system yet, so this
// returns the right shape but the token is random and NOT stored or checked anywhere.
// Next phase: replace with a real signed token in both places.
function issueToken(): { token: string; expiresAt: string } {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return {
    token: randomBytes(24).toString('base64url'),
    expiresAt: expires.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }
}
