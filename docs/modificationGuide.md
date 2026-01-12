# Project Modification Guide

This guide is for developers who want to extend, customize, or modify the PLTW Support Assistant (Jordan).

---

## Introduction

This document provides guidance on how to modify and extend the PLTW Support Assistant. Whether you want to add new features, change existing behavior, or customize the application for your needs, this guide will help you understand the codebase and make changes effectively.

---

## Table of Contents

- [Project Structure Overview](#project-structure-overview)
- [Frontend Modifications](#frontend-modifications)
- [Backend Modifications](#backend-modifications)
- [Knowledge Base Modifications](#knowledge-base-modifications)
- [Changing AI/ML Models](#changing-aiml-models)
- [Database Modifications](#database-modifications)
- [Adding New API Endpoints](#adding-new-api-endpoints)
- [Best Practices](#best-practices)

---

## Project Structure Overview

```
├── backend/
│   ├── cdk/
│   │   ├── bin/app.ts              # CDK app entry point
│   │   └── lib/
│   │       ├── amplify-stack.ts    # AWS Amplify hosting
│   │       ├── cognito-stack.ts    # Cognito authentication
│   │       ├── dynamodb-stack.ts   # DynamoDB tables
│   │       ├── rest-api-stack.ts   # REST API Gateway
│   │       ├── s3-stack.ts         # S3 bucket
│   │       └── websocket-stack.ts  # WebSocket API Gateway
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── rest/               # REST API handlers
│   │   │   │   ├── admin.ts        # Metrics and conversations
│   │   │   │   ├── feedback.ts     # User feedback
│   │   │   │   └── upload.ts       # File upload operations
│   │   │   └── websocket/          # WebSocket handlers
│   │   │       ├── connect.ts      # Connection handler
│   │   │       ├── disconnect.ts   # Disconnection handler
│   │   │       └── sendMessage.ts  # Message processing
│   │   ├── services/               # Business logic
│   │   │   ├── bedrock.service.ts  # Bedrock Agent integration
│   │   │   ├── dynamodb.service.ts # DynamoDB operations
│   │   │   ├── upload.service.ts   # S3 upload operations
│   │   │   └── websocket.service.ts# WebSocket messaging
│   │   ├── types/                  # TypeScript definitions
│   │   └── utils/                  # Utility functions
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Main chat interface
│   │   ├── admin/page.tsx          # Admin dashboard
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Global styles
│   ├── components/
│   │   ├── admin/                  # Admin components
│   │   │   └── ConversationDetailModal.tsx
│   │   ├── charts/                 # Nivo chart components
│   │   │   ├── ConversationVolumeChart.tsx
│   │   │   ├── EscalationReasonsChart.tsx
│   │   │   ├── TopCategoriesChart.tsx
│   │   │   └── UserSatisfactionChart.tsx
│   │   └── ChatWindow.tsx          # Main chat component
│   ├── contexts/                   # React contexts
│   │   └── AuthContext.tsx         # Cognito auth state
│   ├── hooks/                      # Custom React hooks
│   │   ├── useFileUpload.ts        # File upload hook
│   │   └── useWebSocket.ts         # WebSocket connection hook
│   ├── lib/                        # Utilities
│   │   ├── amplify-config.ts       # AWS Amplify configuration
│   │   ├── api.ts                  # API client utilities
│   │   └── uploadApi.ts            # File upload API client
│   └── public/                     # Static assets (logos, icons)
└── docs/                           # Documentation
```

---

## Frontend Modifications

### Changing the UI Theme

**Location**: `frontend/app/globals.css`

The theme uses Tailwind CSS. To customize colors, update the Tailwind configuration or add custom CSS:

```css
/* Custom color overrides */
:root {
  --primary-blue: #1e3a8a;           /* Main brand color */
  --primary-blue-hover: #1e40af;     /* Hover state */
}
```

### Adding New Pages

**Location**: `frontend/app/`

Next.js uses file-based routing. To add a new page:

1. Create a new directory: `frontend/app/your-page/`
2. Add a `page.tsx` file:

```tsx
// frontend/app/your-page/page.tsx
export default function YourPage() {
  return (
    <div>
      <h1>Your New Page</h1>
    </div>
  );
}
```

3. For protected pages (admin-only), wrap with auth context:

```tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Access denied</div>;
  
  return <div>Protected content</div>;
}
```

### Modifying the Chat Interface

**Location**: `frontend/components/ChatWindow.tsx`

Key sections to modify:
- **Message Styling**: Update the message bubble classes
- **Input Handling**: Modify the input field behavior
- **File Attachments**: Customize file upload UI

### Modifying Components

**Location**: `frontend/components/`

| Component | Purpose |
|-----------|---------|
| `ChatWindow.tsx` | Main chat interface with WebSocket |
| `ConversationDetailModal.tsx` | Modal for viewing conversation details |
| `ConversationVolumeChart.tsx` | Line chart for conversation volume |
| `EscalationReasonsChart.tsx` | Donut chart for escalation reasons |
| `TopCategoriesChart.tsx` | Bar chart for top categories |
| `UserSatisfactionChart.tsx` | Donut chart for satisfaction |

### Adding New Charts

**Location**: `frontend/components/charts/`

Create a new chart component using Nivo:

```tsx
// frontend/components/charts/YourChart.tsx
'use client';
import { ResponsiveBar } from '@nivo/bar';

interface YourChartProps {
  data: { category: string; count: number }[];
}

export default function YourChart({ data }: YourChartProps) {
  return (
    <div style={{ height: 300 }}>
      <ResponsiveBar
        data={data}
        keys={['count']}
        indexBy="category"
        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
        // ... other Nivo config
      />
    </div>
  );
}
```

---

## Backend Modifications

### Lambda Functions Overview

| Lambda | File | Purpose |
|--------|------|---------|
| `Connect` | `handlers/websocket/connect.ts` | Store WebSocket connection |
| `Disconnect` | `handlers/websocket/disconnect.ts` | Remove WebSocket connection |
| `SendMessage` | `handlers/websocket/sendMessage.ts` | Process chat messages |
| `Metrics` | `handlers/rest/admin.ts` | Dashboard analytics |
| `Conversations` | `handlers/rest/admin.ts` | List conversations |
| `Feedback` | `handlers/rest/feedback.ts` | User feedback submission |
| `PresignUpload` | `handlers/rest/upload.ts` | Generate S3 presigned URL |
| `ConfirmUpload` | `handlers/rest/upload.ts` | Confirm file upload |
| `DownloadUrl` | `handlers/rest/upload.ts` | Generate download URL |

### Adding New Lambda Functions

**Location**: `backend/src/handlers/`

1. Create a new handler file:

```typescript
// backend/src/handlers/rest/yourHandler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const yourHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ message: 'Success' }),
  };
};
```

2. Add the Lambda to the CDK stack in `backend/cdk/lib/rest-api-stack.ts`:

```typescript
const yourHandler = new lambda.Function(this, 'YourHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'yourHandler.yourHandler',
  code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
  timeout: cdk.Duration.seconds(30),
  environment: {
    // Add environment variables
  },
});
```

3. Rebuild and deploy:

```bash
cd backend
npm run bundle
cd cdk
cdk deploy RestApiStack
```

### Modifying the CDK Stacks

**Location**: `backend/cdk/lib/`

The infrastructure is organized into modular stacks:

| Stack | File | Purpose |
|-------|------|---------|
| `DynamoDBStack` | `dynamodb-stack.ts` | DynamoDB tables |
| `S3Stack` | `s3-stack.ts` | S3 bucket for uploads |
| `CognitoStack` | `cognito-stack.ts` | Cognito User Pool |
| `WebSocketStack` | `websocket-stack.ts` | WebSocket API and Lambdas |
| `RestApiStack` | `rest-api-stack.ts` | REST API and Lambdas |
| `AmplifyStack` | `amplify-stack.ts` | Amplify hosting |

### Adding New API Endpoints

1. **Create or identify the Lambda function** that will handle the endpoint

2. **Add the API Gateway resource and method** in `rest-api-stack.ts`:

```typescript
// Create resource
const yourResource = this.api.root.addResource('your-endpoint');

// Add method with Lambda integration
yourResource.addMethod('POST', new apigateway.LambdaIntegration(yourHandler));

// For protected endpoints, add Cognito authorizer
yourResource.addMethod('GET', new apigateway.LambdaIntegration(yourHandler), {
  authorizer: cognitoAuthorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});
```

3. **Update the API documentation** in `docs/APIDoc.md`

---

## Knowledge Base Modifications

### Updating Bedrock Agent

The Bedrock Agent is configured outside of CDK. To modify:

1. Go to **AWS Console > Amazon Bedrock > Agents**
2. Select your agent
3. Update instructions, knowledge base, or action groups
4. Create a new alias after changes
5. Update `BEDROCK_AGENT_ALIAS_ID` in environment variables

### Adding Knowledge Base Sources

1. Go to **AWS Console > Amazon Bedrock > Knowledge bases**
2. Select your knowledge base
3. Add new data sources (S3, web crawler, etc.)
4. Sync the knowledge base

### Modifying Response Behavior

**Location**: `backend/src/services/bedrock.service.ts`

```typescript
// Modify confidence thresholds
shouldEscalate(confidence: number, messageCount: number): boolean {
  return confidence < 0.4 || messageCount > 10;  // Adjust thresholds
}

// Modify response cleaning
function cleanResponse(response: string): string {
  // Add custom cleaning logic
  return response;
}
```

---

## Changing AI/ML Models

### Switching the Bedrock Agent Model

1. Go to **AWS Console > Amazon Bedrock > Agents**
2. Select your agent
3. Edit the agent configuration
4. Change the foundation model
5. Save and create a new alias

### Modifying File Analysis

**Location**: `backend/src/services/bedrock.service.ts`

The service supports text extraction from PDFs and Word documents:

```typescript
// Supported file types for analysis
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DOCUMENT_TYPES_FOR_TEXT_EXTRACTION = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
```

---

## Database Modifications

### DynamoDB Tables

The project uses three DynamoDB tables:

#### Connections Table (`pltw-connections`)

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `connectionId` | String | Partition Key | WebSocket connection ID |
| `userId` | String | - | User identifier |
| `ttl` | Number | - | TTL for auto-cleanup |

#### Conversations Table (`pltw-conversations`)

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `conversationId` | String | Partition Key | UUID for conversation |
| `userId` | String | GSI | User identifier |
| `startTime` | Number | GSI Sort | Timestamp |
| `status` | String | - | active, resolved, escalated |
| `category` | String | - | Conversation category |
| `messages` | List | - | Array of messages |
| `satisfaction` | String | - | positive, negative |
| `escalationReason` | String | - | Reason for escalation |

#### File Attachments Table (`pltw-file-attachments`)

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `fileId` | String | Partition Key | UUID for file |
| `conversationId` | String | GSI | Associated conversation |
| `filename` | String | - | Original filename |
| `contentType` | String | - | MIME type |
| `s3Key` | String | - | S3 object key |
| `status` | String | - | pending, uploaded |
| `uploadedAt` | Number | GSI Sort | Timestamp |

### Adding New DynamoDB Tables

**Location**: `backend/cdk/lib/dynamodb-stack.ts`

```typescript
this.yourTable = new dynamodb.Table(this, 'YourTable', {
  tableName: 'pltw-your-table',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Add GSI if needed
this.yourTable.addGlobalSecondaryIndex({
  indexName: 'YourIndex',
  partitionKey: { name: 'yourField', type: dynamodb.AttributeType.STRING },
});
```

---

## Best Practices

### General Guidelines

1. **Test locally before deploying** - Use `cdk synth` to validate CDK changes
2. **Use environment variables** - Don't hardcode sensitive values or API endpoints
3. **Follow existing patterns** - Maintain consistency with the codebase
4. **Update documentation** - Keep docs in sync with code changes
5. **Version control** - Make small, focused commits

### Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use least privilege IAM** - Only grant permissions that are needed
3. **Validate inputs** - Sanitize user input in Lambda functions
4. **Keep dependencies updated** - Regularly update npm packages

### Performance Tips

1. **Use pagination** - For large data sets, use `limit` parameter
2. **Use projections** - Only fetch needed attributes from DynamoDB
3. **Reuse connections** - DynamoDB clients are reused across invocations
4. **Right-size Lambda** - Adjust memory based on function needs

---

## Testing Your Changes

### Local Frontend Testing

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Local Backend Testing (CDK)

```bash
cd backend/cdk
npm install
cdk synth          # Validate CloudFormation template
cdk diff           # See what will change
```

### Deployment Testing

```bash
# Build Lambda bundle
cd backend
npm run bundle

# Deploy all stacks
cd cdk
cdk deploy --all

# Deploy specific stack
cdk deploy WebSocketStack
```

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

---

## Common Modifications

### Changing the Logo

1. Replace `frontend/public/pltw-logo.svg` with your logo
2. Update references in components

### Adding Admin Users

Admin users are managed through Cognito. To add a new admin:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com \
  --temporary-password TempPassword123!
```

### Modifying CORS Settings

**Location**: `backend/cdk/lib/rest-api-stack.ts`

```typescript
defaultCorsPreflightOptions: {
  allowOrigins: apigateway.Cors.ALL_ORIGINS,  // Or specify domains
  allowMethods: apigateway.Cors.ALL_METHODS,
  allowHeaders: ['Content-Type', 'Authorization'],
},
```

### Modifying File Upload Limits

**Location**: `backend/src/utils/fileValidation.ts`

```typescript
export const FILE_UPLOAD_CONFIG = {
  maxFileSizeBytes: 10 * 1024 * 1024,  // 10MB
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain',
  ],
  allowedExtensions: ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.txt'],
};
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Check API Gateway CORS config and Lambda response headers |
| 401 Unauthorized | Verify Cognito token is valid and not expired |
| WebSocket not connecting | Check WebSocket URL and Lambda permissions |
| File upload fails | Verify S3 permissions and presigned URL expiration |
| Lambda timeout | Increase `timeout` in CDK stack |

### Useful Commands

```bash
# View Lambda logs
aws logs tail /aws/lambda/YourFunctionName --follow

# Check CDK diff
cd backend/cdk
cdk diff

# List DynamoDB tables
aws dynamodb list-tables
```

---

## Conclusion

This project is designed to be extensible. We encourage developers to modify and improve the system to better serve their needs. If you create useful extensions, consider contributing back to the project.

For questions or support:
- Review the [API Documentation](./APIDoc.md)
- Check the [Deployment Guide](./deploymentGuide.md)
- See the [User Guide](./userGuide.md)
