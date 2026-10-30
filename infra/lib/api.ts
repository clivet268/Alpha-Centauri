import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ArnFormat, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, type NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import { routes } from '@raser/backend/routes'
import type { ApiConfig, DbConfig } from './raser-stack.ts'

const handlersDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../backend/src/handlers',
)

export interface ApiProps {
  db: DbConfig
  api: ApiConfig
}

// One Lambda + one method per entry in backend/src/routes.ts, added to the existing REST API.
export class Api extends Construct {
  readonly stage: apigw.Stage

  constructor(scope: Construct, id: string, { db, api: apiConfig }: ApiProps) {
    super(scope, id)

    const api = apigw.RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: apiConfig.restApiId,
      rootResourceId: apiConfig.rootResourceId,
    })

    const common: NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      // Aurora auto-pauses after 5 idle minutes; resuming took ~19s. API Gateway caps requests at 29s.
      timeout: Duration.seconds(29),
      environment: {
        DB_HOST: db.host,
        DB_PORT: String(db.port),
        DB_NAME: db.name,
        DB_USER: db.user,
        NODE_EXTRA_CA_CERTS: '/var/runtime/ca-cert.pem',
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        sourceMap: true,
        externalModules: ['pg-native'],
      },
    }

    const connectPolicy = new iam.PolicyStatement({
      actions: ['rds-db:connect'],
      resources: [
        Stack.of(this).formatArn({
          service: 'rds-db',
          resource: 'dbuser',
          resourceName: `${db.clusterResourceId}/${db.user}`,
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }),
      ],
    })

    const methods: apigw.Method[] = []
    const corsPaths = new Set<string>()

    for (const [key, file] of Object.entries(routes)) {
      const [method, routePath] = key.split(' ') as [string, string]
      const name = file
        .split(/[/-]/)
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join('')
      const fn = new NodejsFunction(this, `${name}Fn`, {
        ...common,
        entry: path.join(handlersDir, `${file}.ts`),
        logGroup: new logs.LogGroup(this, `${name}FnLogs`, {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
      })
      fn.addToRolePolicy(connectPolicy)

      const resource = api.root.resourceForPath(routePath)
      methods.push(resource.addMethod(method, new apigw.LambdaIntegration(fn)))

      if (!corsPaths.has(routePath)) {
        corsPaths.add(routePath)
        resource.addCorsPreflight({
          allowOrigins: apigw.Cors.ALL_ORIGINS,
          allowMethods: ['GET', 'POST'],
          allowHeaders: ['Content-Type'],
          maxAge: Duration.hours(1),
        })
      }
    }

    const deployment = new apigw.Deployment(this, 'Deployment', { api })
    deployment.addToLogicalId(Object.keys(routes))
    for (const m of methods) deployment.node.addDependency(m)

    this.stage = new apigw.Stage(this, 'Stage', {
      deployment,
      stageName: apiConfig.stageName,
    })
  }
}
