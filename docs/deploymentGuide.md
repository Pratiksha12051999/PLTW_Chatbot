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

### 3. AWS Account Permissions

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
- CodeBuild

---

## Deployment using CloudShell

This is the **recommended deployment method**.

### Deployment Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/pltw-chatbot
cd pltw-chatbot/
```

> **Important**: Replace `YOUR-USERNAME` with your actual GitHub username.

#### 2. Configure AWS CLI

```bash
unset AWS_PROFILE
```

#### 3. Deploy Bedrock Agent and Knowledge Base

First, create the Bedrock Agent with Knowledge Base:

```bash
chmod +x deploy-chatbot.sh
./deploy-chatbot.sh
```

The script will guide you through the setup process:

1. **Configuration**: Enter your AWS region when prompted (default: us-east-1)

2. **S3 Bucket**: Automatically creates a versioned S3 bucket for your documentation

3. **IAM Roles**: Creates two roles with necessary permissions:
   - `pltw-support-kb-role` - For Knowledge Base (S3, OpenSearch, Embeddings)
   - `pltw-support-agent-role` - For Bedrock Agent (broader model invocation permissions)

4. **Knowledge Base (Manual Step)**:
   - The script will pause and provide instructions to create the Knowledge Base in the AWS Console
   - After creation, note down and enter:
     - **Knowledge Base ID** (e.g., `ABCDEFGHIJ`)
     - **Data Source ID** (found under the Data Sources tab)

5. **Bedrock Agent**: Automatically creates the agent with Nova Pro model and associates it with your Knowledge Base

6. **Agent Alias**: Creates a `prod` alias for the agent

7. **Configuration Saved**: All IDs are saved to `.env` file:
   ```
   BEDROCK_AGENT_ID=<your-agent-id>
   BEDROCK_AGENT_ALIAS_ID=<your-alias-id>
   BEDROCK_KB_ID=<your-kb-id>
   BEDROCK_DATA_SOURCE_ID=<your-datasource-id>
   ```

#### 4. Upload Documentation and Sync Knowledge Base

1. Navigate to **S3 Console** → Select your bucket (`pltw-support-docs-<account-id>`)
2. Click **Upload** → Add your documentation files → Click **Upload**
3. Navigate to **Bedrock Console** → **Knowledge Bases** → Select your Knowledge Base
4. Go to **Data Sources** tab → Select your data source → Click **Sync**

To check ingestion status via CLI:

```bash
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id <YOUR_KB_ID> \
  --data-source-id <YOUR_DATA_SOURCE_ID>
```

> **Note**: Run the sync whenever you update files in S3 to sync changes with the Knowledge Base.

#### 5. Deploy the Application Infrastructure

After the Bedrock Agent and Knowledge Base are set up, deploy the application infrastructure:

```bash
chmod +x one_click_deploy.sh
./one_click_deploy.sh
```

The script will guide you through the deployment:

1. **AWS Authentication**: Detects CloudShell environment or prompts for AWS profile

2. **Project Configuration**:
   - Enter project name (default: `pltw-chatbot`)
   - Select environment (`dev`/`staging`/`prod`)
   - Confirm AWS region

3. **GitHub Repository**: Detects or prompts for your forked repository URL

4. **Bedrock Configuration**:
   - Automatically loads Agent ID and Alias ID from `.env` file (created by `deploy-chatbot.sh`)
   - Prompts for any missing values

5. **Action Selection**: Choose `deploy` to deploy the infrastructure

6. **CodeBuild Setup**: Creates IAM role and CodeBuild project for deployment

7. **Build Execution**: Starts the deployment build which provisions:
   - **DynamoDB Tables**: `pltw-connections`, `pltw-conversations`
   - **SQS Queue**: `pltw-escalation-queue.fifo`
   - **Lambda Functions**: WebSocket handlers (connect, disconnect, sendMessage)
   - **API Gateway**: WebSocket API and REST API
   - **Cognito**: User pool for admin authentication
   - **Amplify**: Frontend hosting

8. **Build Monitoring**: Optionally monitor build progress in real-time

9. **Deployment Outputs**: Upon successful completion, displays:
   ```
   🖥️  Frontend:    https://<app-id>.amplifyapp.com
   🔌 WebSocket:   wss://<api-id>.execute-api.<region>.amazonaws.com/prod
   🔗 REST API:    https://<api-id>.execute-api.<region>.amazonaws.com/prod
   ```

> **Note**: The deployment typically takes 10-15 minutes. Outputs are also saved to `.deployment-outputs-<environment>.txt`.

---

## Post-Deployment Steps

### 1. Note the Outputs

After deployment, note down the following from the output from codebuild:

- Frontend URL
- WebSocket URL
- REST API URL

These are also saved in `.deployment-outputs-<environment>.txt`.

### 2. Create Admin User in Cognito

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

### 3. Set Admin Password (Optional)

To set a permanent password directly:

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <YOUR_USER_POOL_ID> \
  --username admin@example.com \
  --password "YourSecurePassword123!" \
  --permanent \
  --region us-east-1
```

### 4. Test the Application

1. Open the Frontend URL in your browser
2. Test the chatbot with sample questions
3. Log into the admin dashboard with your Cognito credentials

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

### Bedrock Access Denied

**Error**: "Access denied when calling Bedrock"

**Solution**:

1. Verify the `pltw-support-agent-role` has broader permissions:
   ```bash
   aws iam get-role-policy --role-name pltw-support-agent-role --policy-name pltw-support-agent-role-policy
   ```
2. If needed, update with broader permissions:
   ```bash
   aws iam put-role-policy \
     --role-name pltw-support-agent-role \
     --policy-name pltw-support-agent-role-policy \
     --policy-document '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:GetFoundationModel"],
           "Resource": "*"
         },
         {
           "Effect": "Allow",
           "Action": ["bedrock:Retrieve", "bedrock:RetrieveAndGenerate", "bedrock:ListKnowledgeBases"],
           "Resource": "*"
         }
       ]
     }'
   ```

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

### CodeBuild Failed

**Error**: Build failed during deployment

**Solution**:

1. Check the CodeBuild logs in AWS Console
2. Verify GitHub repository URL is correct
3. Ensure all environment variables are set
4. Check IAM role permissions for CodeBuild

### Knowledge Base Sync Failed

**Error**: Ingestion job failed

**Solution**:

1. Check the `pltw-support-kb-role` has S3 and OpenSearch permissions
2. Verify S3 bucket contains valid documents
3. Check ingestion job status:
   ```bash
   aws bedrock-agent list-ingestion-jobs \
     --knowledge-base-id <KB_ID> \
     --data-source-id <DS_ID>
   ```

---

## Cleanup

To remove all deployed resources:

### Using the Deployment Script

```bash
./one_click_deploy.sh
# Select "destroy" when prompted for action
```

### Using CDK Directly

```bash
cd backend/cdk
cdk destroy --all
```

> **Warning**: This will delete all resources including data in S3 and DynamoDB. Backup important data before proceeding.

### Manual Cleanup

If automated destroy fails, manually delete:

1. S3 bucket (empty it first)
2. DynamoDB tables
3. Cognito User Pool
4. API Gateway APIs
5. Lambda functions
6. Amplify app
7. CloudFormation stacks
8. CodeBuild project and IAM role
9. Bedrock Agent and Knowledge Base
10. OpenSearch Serverless collection

---

## Next Steps

After successful deployment:

1. Review the [User Guide](./userGuide.md) to learn how to use the application
2. Check the [API Documentation](./APIDoc.md) for integration details
3. See the [Modification Guide](./modificationGuide.md) for customization options
