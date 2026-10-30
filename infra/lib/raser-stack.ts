import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { Api } from './api.ts'

export interface DbConfig {
  host: string
  port: number
  name: string
  user: string
  clusterResourceId: string
}

export interface ApiConfig {
  restApiId: string
  rootResourceId: string
  stageName: string
}

export interface RaserStackProps extends StackProps {
  db: DbConfig
  api: ApiConfig
}

export class RaserStack extends Stack {
  constructor(scope: Construct, id: string, props: RaserStackProps) {
    super(scope, id, props)

    const api = new Api(this, 'Api', { db: props.db, api: props.api })

    new CfnOutput(this, 'ApiUrl', {
      value: api.stage.urlForPath(),
      description: 'Set as VITE_API_BASE_URL for the frontend build',
    })
  }
}
