import { App } from 'aws-cdk-lib'
import type { ApiConfig, DbConfig } from '../lib/api.ts'
import { RaserStack } from '../lib/raser-stack.ts'

const app = new App()

// Uses the existing database and REST API set in cdk.json.
new RaserStack(app, 'Raser', {
  db: app.node.getContext('db') as DbConfig,
  api: app.node.getContext('api') as ApiConfig,
  env: {
    account: app.node.getContext('account') as string,
    region: app.node.getContext('region') as string,
  },
})
