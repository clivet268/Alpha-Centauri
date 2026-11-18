import { randomBytes } from 'node:crypto'

// TOKEN PLACEHOLDER: same as journal register/login. There is no session/auth system yet,
// so this returns the right shape but the token is random and NOT stored or checked anywhere.
export function issueToken(): { token: string; expiresAt: string } {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return {
    token: randomBytes(24).toString('base64url'),
    expiresAt: expires.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }
}
