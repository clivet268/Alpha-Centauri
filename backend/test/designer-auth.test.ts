import { afterAll, describe, expect, it } from 'vitest'
import { handler as login } from '../src/handlers/designer/login.ts'
import { handler as register } from '../src/handlers/designer/register.ts'
import { closePool } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

const call = async (h: typeof login, body: unknown) =>
  parse(await h(makeEvent({ body })))

describe('Designer register + login', () => {
  it('registers, then logs in with the same designerId', async () => {
    const email = `designer-${crypto.randomUUID()}@test.org`
    const reg = await call(register, { email, password: 'password123' })
    expect(reg.status).toBe(200)
    expect(reg.body.designerId).toMatch(/^ac_/)

    const r = await call(login, { email, password: 'password123' })
    expect(r.status).toBe(200)
    expect(r.body.designerId).toBe(reg.body.designerId)
  })

  it('401 for a wrong password', async () => {
    const email = `designer-${crypto.randomUUID()}@test.org`
    await call(register, { email, password: 'password123' })
    const r = await call(login, { email, password: 'wrong-password' })
    expect(r.status).toBe(401)
  })

  it('409 EMAIL_IN_USE when the email is taken', async () => {
    const email = `designer-${crypto.randomUUID()}@test.org`
    await call(register, { email, password: 'password123' })
    const r = await call(register, { email, password: 'password123' })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('EMAIL_IN_USE')
  })

  afterAll(closePool)
})
