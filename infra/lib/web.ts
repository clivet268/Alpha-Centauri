import { execSync } from 'node:child_process'
import { cpSync } from 'node:fs'
import path from 'node:path'
import * as amplify from '@aws-cdk/aws-amplify-alpha'
import { DockerImage } from 'aws-cdk-lib'
import { Asset } from 'aws-cdk-lib/aws-s3-assets'
import { Construct } from 'constructs'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const frontendDir = path.join(repoRoot, 'frontend')

export interface WebProps {
  apiUrl: string
  branchName: string
}

export class Web extends Construct {
  readonly url: string

  constructor(scope: Construct, id: string, { apiUrl, branchName }: WebProps) {
    super(scope, id)

    const site = new Asset(this, 'Site', {
      path: frontendDir,
      bundling: {
        image: DockerImage.fromRegistry('unused'),
        local: {
          tryBundle(outputDir) {
            execSync('npm run build -w frontend', {
              cwd: repoRoot,
              env: { ...process.env, VITE_API_BASE_URL: apiUrl },
              stdio: ['ignore', process.stderr, process.stderr],
            })
            cpSync(path.join(frontendDir, 'dist'), outputDir, { recursive: true })
            return true
          },
        },
      },
    })

    const app = new amplify.App(this, 'App', {
      appName: 'raser',
      platform: amplify.Platform.WEB,
      customRules: [amplify.CustomRule.SINGLE_PAGE_APPLICATION_REDIRECT],
    })
    new amplify.Branch(this, 'Branch', { app, branchName, asset: site })

    this.url = `https://${branchName}.${app.defaultDomain}`
  }
}
