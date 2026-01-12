# Deployment Guide

This guide provides step-by-step instructions for deploying the PLTW Support Assistant (Jordan).

---

## Common Prerequisites

### 1. Fork the Repository

Fork this repository to your own GitHub account (required for deployment and CI/CD):

1. Navigate to the repository on GitHub
2. Click the **"Fork"** button in the top right corner
3. Select your GitHub account as the destination
4. Wait for the forking process to complete
5. You'll now have your own copy at `https://github.com/YOUR-USERNAME/pltw-chatbot`

### 2. Obtain a GitHub Personal Access Token

A GitHub personal access token with repo permissions is needed for Amplify deployment:

1. Go to **GitHub Settings > Developer Settings > Personal Access Tokens > Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Give the token a descriptive name (e.g., "PLTW Chatbot Deployment")
4. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (Full control of repository hooks)
5. Click **"Generate token"** and save the token securely

> **Important**: Save this token immediately - you won't be able to see it again!

For detailed instructions, see: [GitHub Personal Access Tokens Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

### 3. Bedrock Agent Setup

Before deploying, you need to create a Bedrock Agent with Knowledge Base:

1. Go to **AWS Console > Amazon Bedrock > Agents**
2. Create a new Agent with appropriate instructions for PLTW support
3. Create a Knowledge Base with PLTW documentation sources
4. Attach the Knowledge Base to the Agent
5. Create an Agent Alias
6. Note the **Agent ID** and **Agent Alias ID**

### 4. AWS Account Permissions

Ensure your AWS account has permissions to create and manage the following resources:

- CloudFormation
- Lambda
- API Gateway (REST and WebSocket)
- S3
- DynamoDB
- Bedrock (Agents, Knowledge Bases)
- Cognito
- Amplify
- IAM Roles and Policies
- CloudWatch Logs

---

## Manual CDK Deployment

This is the **recommended deployment method**.

### Prerequisites

- **AWS CLI** (v2.x) - [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Node.js** (v20.x or later) - [Download Node.js](https://nodejs.org/)
- **AWS CDK** (v2.x) - Install via `npm install -g aws-cdk`

### Deployment Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/pltw-chatbot
cd pltw-chatbot/
```

> **Important**: Replace `YOUR-USERNAME` with your actual GitHub username.

#### 2. Configure AWS CLI

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1` (recommended)
- Default output format: `json`

#### 3. Install Dependencies

```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install

# CDK dependencies
cd cdk
npm install
```

#### 4. Configure Environment Variables

Create environment files from examples:

```bash
# Backend environment
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your Bedrock Agent details:
```
BEDROCK_AGENT_ID=your-agent-id
BEDROCK_AGENT_ALIAS_ID=your-agent-alias-id
AWS_REGION=us-east-1
```

#### 5. Build Lambda Bundle

```bash
cd backend
npm run bundle
```

This creates the `lambda-bundle/` directory with compiled Lambda code.

#### 6. Bootstrap CDK (First-time only)

```bash
cd backend/cdk
cdk bootstrap
```

#### 7. Deploy the Stacks

```bash
cdk deploy --all
```

When prompted, review the IAM changes and type `y` to confirm.

The deployment creates 6 stacks:
- **DynamoDBStack**: DynamoDB tables
- **S3Stack**: S3 bucket for file uploads
- **CognitoStack**: Cognito User Pool
- **WebSocketStack**: WebSocket API and Lambda functions
- **RestApiStack**: REST API and Lambda functions
- **AmplifyStack**: Amplify app for frontend hosting

---

## Post-Deployment Steps

### 1. Note the CDK Outputs

After deployment, note these important outputs from the terminal:

| Output | Description |
|--------|-------------|
| `WebSocketURL` | WebSocket API endpoint |
| `RestApiUrl` | REST API endpoint |
| `CognitoUserPoolId` | Cognito User Pool ID |
| `CognitoClientId` | Cognito App Client ID |
| `AmplifyAppUrl` | Frontend application URL |

### 2. Configure Frontend Environment

Create the frontend environment file:

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` with the CDK outputs:
```
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-api.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_REST_API_URL=https://your-rest-api.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id
```

### 3. Create Admin User in Cognito

Create an admin user for the dashboard:

1. Go to **AWS Console > Cognito > User Pools**
2. Select the user pool created by the stack
3. Click **"Users"** tab > **"Create user"**
4. Fill in:
   - Username: admin email address
   - Email: same email address
   - Temporary password: a secure password
5. Click **"Create user"**

The user will reset their password on first login.

### 4. Access the Application

1. Go to **AWS Console > AWS Amplify**
2. Select the app created by the stack
3. Click on the **Amplify URL** to access the chatbot
4. Navigate to `/admin` to access the admin dashboard

---

## Local Development

### Run Frontend Locally

```bash
cd frontend
npm run dev
```

Access at `http://localhost:3000`

### Run Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

---

## CDK Outputs

After deployment, note these important outputs:

| Output | Description |
|--------|-------------|
| `WebSocketURL` | WebSocket API endpoint for chat |
| `WebSocketApiId` | WebSocket API ID |
| `RestApiUrl` | REST API endpoint for admin/uploads |
| `ConnectionsTableName` | DynamoDB connections table |
| `ConversationsTableName` | DynamoDB conversations table |
| `FileAttachmentsTableName` | DynamoDB file attachments table |
| `UploadsBucketName` | S3 bucket for file uploads |
| `CognitoUserPoolId` | Cognito User Pool ID |
| `CognitoClientId` | Cognito App Client ID |

---

## Troubleshooting

### CDK Bootstrap Error

**Error**: "This stack uses assets, so the toolkit stack must be deployed"

**Solution**:
```bash
cdk bootstrap aws://ACCOUNT_ID/REGION
```

### Permission Denied

**Error**: Access denied errors during deployment

**Solution**:
- Verify your AWS credentials are configured correctly
- Ensure your IAM user/role has the required permissions
- Check if you're deploying to the correct region

### Lambda Bundle Missing

**Error**: "Cannot find lambda-bundle directory"

**Solution**:
```bash
cd backend
npm run bundle
```

### Bedrock Agent Not Responding

**Error**: Chat returns empty or error responses

**Solution**:
1. Verify the Bedrock Agent ID and Alias ID are correct in `.env`
2. Ensure the Agent is properly configured with Knowledge Base
3. Check CloudWatch logs for the SendMessage Lambda
4. Verify IAM permissions for Bedrock access

### WebSocket Connection Failed

**Error**: Cannot connect to WebSocket

**Solution**:
1. Verify the WebSocket URL in frontend environment
2. Check that the WebSocket API is deployed
3. Verify CORS settings if accessing from different domain
4. Check CloudWatch logs for Connect Lambda

### Amplify Build Failed

**Error**: Frontend deployment failed

**Solution**:
1. Check Amplify build logs in the AWS Console
2. Verify the GitHub token has repo access
3. Ensure the `frontend/` directory exists with valid Next.js app
4. Check that environment variables are set in Amplify

---

## Cleanup

To remove all deployed resources:

### Using CDK
```bash
cd backend/cdk
cdk destroy --all
```

> **Warning**: This will delete all resources including data in S3 and DynamoDB. Backup important data before proceeding.

### Manual Cleanup

If CDK destroy fails, manually delete:
1. S3 bucket (empty it first)
2. DynamoDB tables
3. Cognito User Pool
4. API Gateway APIs
5. Lambda functions
6. Amplify app
7. CloudFormation stacks

---

## Next Steps

After successful deployment:

1. Review the [User Guide](./userGuide.md) to learn how to use the application
2. Check the [API Documentation](./APIDoc.md) for integration details
3. See the [Modification Guide](./modificationGuide.md) for customization options
