import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import { Construct } from 'constructs';

export interface AmplifyStackProps extends cdk.StackProps {
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  branches?: string[]; // Branches to deploy (default: ['main'])
}

export class AmplifyStack extends cdk.Stack {
  public readonly amplifyApp: amplify.CfnApp;

  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, props);

    const branches = props.branches || ['main'];

    // Create Amplify App
    this.amplifyApp = new amplify.CfnApp(this, 'PLTWChatbotApp', {
      name: 'pltw-chatbot',
      repository: `https://github.com/${props.githubOwner}/${props.githubRepo}`,
      accessToken: props.githubToken,
      buildSpec: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
`,
      environmentVariables: [
        {
          name: 'NEXT_PUBLIC_WEBSOCKET_URL',
          value: cdk.Fn.importValue('WebSocketURL'),
        },
        {
          name: 'NEXT_PUBLIC_REST_API_URL',
          value: cdk.Fn.importValue('RestApiUrl'),
        },
      ],
    });

    // Create branches
    branches.forEach((branchName) => {
      new amplify.CfnBranch(this, `${branchName}Branch`, {
        appId: this.amplifyApp.attrAppId,
        branchName: branchName,
        enableAutoBuild: true,
        enablePullRequestPreview: branchName === 'main',
      });
    });

    // Outputs
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: this.amplifyApp.attrAppId,
      description: 'Amplify App ID',
      exportName: 'AmplifyAppId',
    });

    new cdk.CfnOutput(this, 'AmplifyAppUrl', {
      value: `https://${this.amplifyApp.attrDefaultDomain}`,
      description: 'Amplify App URL',
    });
  }
}
