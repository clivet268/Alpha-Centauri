import { Signer } from '@aws-sdk/rds-signer'
import pg from 'pg'

let pool: Promise<pg.Pool> | undefined

async function createPool(): Promise<pg.Pool> {
  // Local dev / tests: plain connection string.
  if (process.env.DATABASE_URL) {
    return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
  }

  // AWS: existing Aurora cluster with IAM authentication. CDK sets DB_* from infra/cdk.json.
  const { DB_HOST, DB_PORT = '5432', DB_NAME, DB_USER, AWS_REGION } = process.env
  if (!DB_HOST || !DB_NAME || !DB_USER) {
    throw new Error('Set DATABASE_URL (local) or DB_HOST, DB_NAME, DB_USER (AWS)')
  }
  const signer = new Signer({
    hostname: DB_HOST,
    port: Number(DB_PORT),
    username: DB_USER,
    region: AWS_REGION,
  })
  return new pg.Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    // IAM tokens last 15 minutes, so sign a fresh one for each new connection.
    password: () => signer.getAuthToken(),
    ssl: true,
    // One Lambda instance handles one request at a time.
    max: 1,
  })
}

function getPool(): Promise<pg.Pool> {
  pool ??= createPool().catch((err) => {
    pool = undefined
    throw err
  })
  return pool
}

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<pg.QueryResult<R>> {
  return (await getPool()).query<R>(sql, params)
}

// Runs fn inside BEGIN/COMMIT, rolling back on error.
export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await (await getPool()).connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function closePool(): Promise<void> {
  if (pool) await (await pool).end()
  pool = undefined
}
