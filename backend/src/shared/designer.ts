import type pg from 'pg'
import { unauthorized } from './http.ts'

export async function requireDesigner(
  client: Pick<pg.ClientBase, 'query'>,
  designerId: string | undefined,
): Promise<string> {
  const id = (designerId ?? '').trim()
  if (!id) throw unauthorized('Designer login required.')

  const { rows } = await client.query(
    `SELECT 1 FROM account WHERE account_id = $1 AND role = 'RubricDesigner'`,
    [id],
  )
  if (!rows[0]) throw unauthorized('Designer login required.')
  return id
}
