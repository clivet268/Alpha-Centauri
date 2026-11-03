import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import { conflict, handle, invalidInput, parseBody } from '../../shared/http.ts'
import { hashPassword } from '../../shared/password.ts'

// POST /journal/register
// 200 { journalId, token, expiresAt } | 400 INVALID_INPUT | 409 EMAIL_IN_USE | 409 RUBRIC_NOT_PUBLISHED

// Fields are optional here only so a missing one produces the "<field> is required." message
// from the API spec instead of a generic schema error; checked by hand below.
const Body = z.object({
  journalName: z.string().optional(),
  rubricId: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
})

export interface RegisterJournalResponse {
  journalId: string
  token: string
  expiresAt: string
}

const RUBRIC_ID_RE = /^rb_[A-Za-z0-9]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const handler = handle(async (event): Promise<RegisterJournalResponse> => {
  const body = parseBody(event, Body)

  const journalName = (body.journalName ?? '').trim()
  if (!journalName) throw invalidInput('journalName is required.')
  if (journalName.length > 200) throw invalidInput('journalName must be at most 200 characters.')

  const rubricId = (body.rubricId ?? '').trim()
  if (!rubricId) throw invalidInput('rubricId is required.')
  if (!RUBRIC_ID_RE.test(rubricId)) throw invalidInput('rubricId is not a valid rubric ID.')

  // Stored lowercase: account.email is UNIQUE and case-sensitive, so Login must lowercase too.
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) throw invalidInput('email is required.')
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw invalidInput('email is not a valid email address.')
  }

  const password = body.password ?? ''
  if (!password) throw invalidInput('password is required.')
  if (password.length < 8) throw invalidInput('password must be at least 8 characters.')
  if (password.length > 128) throw invalidInput('password must be at most 128 characters.')

  const passwordHash = await hashPassword(password)

  // Account + journal are created together or not at all.
  const { accountId, journalId } = await transaction(async (client) => {
    // FOR SHARE: the rubric can't be deprecated by someone else before we commit.
    const rubric = await client.query<{ state: string }>(
      `SELECT state FROM rubric WHERE rubric_id = $1 FOR SHARE`,
      [rubricId],
    )
    // An unknown rubric is "not published" too.
    if (rubric.rows[0]?.state !== 'Published') {
      throw conflict('RUBRIC_NOT_PUBLISHED', 'Selected rubric is not published.')
    }

    const account = await client.query<{ account_id: string }>(
      `INSERT INTO account (email, password_hash, role)
       VALUES ($1, $2, 'JournalEditor')
       ON CONFLICT (email) DO NOTHING
       RETURNING account_id`,
      [email, passwordHash],
    )
    const accountId = account.rows[0]?.account_id
    if (!accountId) {
      throw conflict('EMAIL_IN_USE', 'An account with this email already exists.')
    }

    const journal = await client.query<{ journal_id: string }>(
      `INSERT INTO journal (editor_id, rubric_id, name)
       VALUES ($1, $2, $3)
       RETURNING journal_id`,
      [accountId, rubricId, journalName],
    )
    const journalId = journal.rows[0]?.journal_id
    if (!journalId) throw new Error('Journal insert returned no row.')

    return { accountId, journalId }
  })

  return { journalId, ...issueToken(accountId) }
})

// TOKEN PLACEHOLDER: there is no session/auth system yet. This returns the right shape
// ({ token, expiresAt }) but the token is random and NOT stored or checked anywhere.
// Next phase: replace with a real signed token (and have Login issue the same kind).
function issueToken(_accountId: string): { token: string; expiresAt: string } {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return {
    token: randomBytes(24).toString('base64url'),
    expiresAt: expires.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }
}
