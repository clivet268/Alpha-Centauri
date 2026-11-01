import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { Api, type ApiProps } from './api.ts'
import { Web } from './web.ts'

export interface RaserStackProps extends StackProps, ApiProps {}

export class RaserStack extends Stack {
  constructor(scope: Construct, id: string, props: RaserStackProps) {
    super(scope, id, props)

    const api = new Api(this, 'Api', { db: props.db, api: props.api })

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway stage URL',
    })

    const { restApiId, stageName } = props.api
    const web = new Web(this, 'Web', {
      apiUrl: `https://${restApiId}.execute-api.${this.region}.amazonaws.com/${stageName}/`,
      branchName: stageName,
    })

    new CfnOutput(this, 'WebUrl', {
      value: web.url,
      description: 'Amplify site',
    })
  }
}
