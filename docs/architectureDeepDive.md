# Architecture Deep Dive

This document provides a detailed explanation of the PLTW Support Assistant (Jordan) architecture.

---

## Architecture Diagram

![Architecture Diagram](./media/architecture.png)

---

## Architecture Overview

The PLTW Support Assistant is built on a fully serverless AWS architecture, designed for scalability, cost-efficiency, and ease of maintenance. The system consists of three main user flows:

1. **Educator Chat Flow** - Teachers and administrators interact with the AI chatbot
2. **Admin Dashboard Flow** - Staff access analytics and conversation history
3. **File Upload Flow** - Users attach documents for AI analysis

---

## Architecture Flow

### 1. User Interaction (Educators, Administrators, Teachers)

Users access the chatbot through a modern web interface hosted on **AWS Amplify**:

- The **Frontend** is a Next.js 15 application with App Router
- Provides real-time streaming responses via WebSocket
- Supports file attachments for document analysis
- Displays feedback mechanism with thumbs up/down

### 2. API Gateway (WebSocket + REST)

All requests from the frontend are routed through **Amazon API Gateway**:

- WebSocket API for real-time bidirectional chat communication
- REST API with CORS support for admin and file upload endpoints
- Routes requests to appropriate Lambda functions
- Public endpoints for chat and feedback
- Protected endpoints (Cognito auth) for admin APIs

### 3. WebSocket Lambda Functions

The core chat functionality is handled by three WebSocket Lambda functions:

- **Connect Lambda**: Stores connection ID in DynamoDB when user connects
- **Disconnect Lambda**: Removes connection from DynamoDB when user disconnects
- **SendMessage Lambda**: Processes chat messages and invokes Bedrock Agent
  - Receives user queries and forwards them to Bedrock Agent
  - Sends responses back via WebSocket connection
  - Saves conversation history to DynamoDB for analytics
  - Handles file attachment analysis with text extraction

### 4. Bedrock Agent with Knowledge Base

**Amazon Bedrock Agent** provides the RAG (Retrieval-Augmented Generation) capabilities:

- Configured with Knowledge Base containing PLTW documentation
- Trained on content from pltw.org and knowledge.pltw.org
- Performs intelligent query routing and response generation
- Returns confidence scores for escalation detection
- Supports multi-turn conversations with session management

### 5. File Processing

The system supports file uploads for document analysis:

- **Presign Lambda**: Generates S3 presigned URLs for direct upload
- **Confirm Lambda**: Updates file status after successful upload
- **Download Lambda**: Generates presigned URLs for file retrieval
- **Text Extraction**: PDF and Word document parsing using pdf-parse and mammoth
- Extracted content sent to Bedrock Agent for analysis

### 6. Data Sources

The Knowledge Base is populated from PLTW documentation:

#### PLTW Resources
- Content from pltw.org main website
- Knowledge base articles from knowledge.pltw.org
- Curriculum documentation and guides
- Training and certification materials

#### User Uploads (S3 Bucket)
- PDFs, Word documents, and images uploaded by users
- Text files for direct content analysis
- Organized by conversation ID

### 7. Admin Flow

Administrators access the dashboard through a separate authentication flow:

1. **Amazon Cognito** authenticates admin users
2. Protected API endpoints verify JWT tokens
3. **Metrics Lambda** returns dashboard analytics
4. **Conversations Lambda** returns conversation history
5. Dashboard displays charts powered by Nivo

### 8. Data Storage (DynamoDB)

Three DynamoDB tables store application data:

#### Connections Table
- Stores active WebSocket connections
- TTL enabled for automatic cleanup
- Partition key: connectionId

#### Conversations Table
- Records all Q&A interactions
- Stores feedback (positive/negative)
- Enables analytics and reporting
- GSI for querying by userId and startTime

#### File Attachments Table
- Stores file metadata and S3 keys
- Tracks upload status (pending/uploaded)
- GSI for querying by conversationId
- TTL enabled for automatic cleanup

---

## Cloud Services / Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
  - TypeScript for type safety
  - Tailwind CSS for styling
  - Nivo charts for analytics visualization
  - Lucide icons for UI elements

- **AWS Amplify**: Frontend hosting and CI/CD
  - Automatic builds on git push
  - Environment variables injected at build time
  - Custom domain support

### Backend Infrastructure

- **AWS CDK**: Infrastructure as Code
  - TypeScript-based stack definitions
  - Modular stack architecture (6 stacks)
  - Automatic dependency management

- **Amazon API Gateway**: WebSocket + REST APIs
  - WebSocket API for real-time chat
  - REST API for admin and file operations
  - CORS configuration
  - Cognito authorizer integration

- **AWS Lambda**: Serverless compute
  - **Connect/Disconnect/SendMessage**: WebSocket handlers (Node.js 20)
  - **Metrics/Conversations**: Admin API handlers (Node.js 20)
  - **Feedback**: User feedback handler (Node.js 20)
  - **Presign/Confirm/Download**: File upload handlers (Node.js 20)

### AI/ML Services

- **Amazon Bedrock Agent**: Conversational AI
  - Agent with Knowledge Base integration
  - RAG capabilities for PLTW documentation
  - Confidence scoring for escalation detection
  - Session management for multi-turn conversations

### Data Storage

- **Amazon S3**: Object storage
  - File uploads bucket
  - Presigned URLs for secure upload/download
  - Server-side encryption enabled

- **Amazon DynamoDB**: NoSQL database
  - Connections table (WebSocket sessions)
  - Conversations table (chat history)
  - File attachments table (upload metadata)
  - On-demand capacity mode
  - TTL for automatic cleanup

### Security & Authentication

- **Amazon Cognito**: User authentication
  - Admin user pool for dashboard access
  - Email-based sign-in
  - Password policies enforced

---

## Infrastructure as Code

This project uses **AWS CDK (Cloud Development Kit)** to define and deploy infrastructure.

### CDK Stack Structure

```
backend/
├── cdk/
│   ├── bin/
│   │   └── app.ts                  # CDK app entry point
│   └── lib/
│       ├── amplify-stack.ts        # AWS Amplify hosting
│       ├── cognito-stack.ts        # Cognito authentication
│       ├── dynamodb-stack.ts       # DynamoDB tables
│       ├── rest-api-stack.ts       # REST API Gateway
│       ├── s3-stack.ts             # S3 bucket
│       └── websocket-stack.ts      # WebSocket API Gateway
├── src/
│   ├── handlers/
│   │   ├── rest/                   # REST API handlers
│   │   │   ├── admin.ts            # Metrics and conversations
│   │   │   ├── feedback.ts         # User feedback
│   │   │   └── upload.ts           # File upload operations
│   │   └── websocket/              # WebSocket handlers
│   │       ├── connect.ts          # Connection handler
│   │       ├── disconnect.ts       # Disconnection handler
│   │       └── sendMessage.ts      # Message processing
│   ├── services/                   # Business logic
│   │   ├── bedrock.service.ts      # Bedrock Agent integration
│   │   ├── dynamodb.service.ts     # DynamoDB operations
│   │   ├── upload.service.ts       # S3 upload operations
│   │   └── websocket.service.ts    # WebSocket messaging
│   ├── types/                      # TypeScript definitions
│   └── utils/                      # Utility functions
└── package.json
```

### Key CDK Constructs

1. **WebSocketApi** (aws-cdk-lib/aws-apigatewayv2)
   - Creates WebSocket API for real-time chat
   - Configures routes for connect, disconnect, and default

2. **RestApi** (aws-cdk-lib/aws-apigateway)
   - Creates REST API for admin and file operations
   - Cognito authorizer for protected routes

3. **Table** (aws-cdk-lib/aws-dynamodb)
   - DynamoDB tables with GSIs
   - On-demand billing mode
   - TTL configuration

4. **Function** (aws-cdk-lib/aws-lambda)
   - Lambda functions with Node.js 20 runtime
   - ESM module support
   - Environment variable configuration

5. **Bucket** (aws-cdk-lib/aws-s3)
   - S3 bucket for file uploads
   - CORS configuration for browser uploads

---

## Security Considerations

### Authentication
- **Admin Dashboard**: Cognito User Pool with email verification
- **Public APIs**: No authentication required (chat, feedback)
- **Protected APIs**: Cognito JWT token validation

### Authorization
- **IAM Roles**: Least privilege principle for Lambda functions
- **API Gateway**: Cognito authorizer for admin endpoints
- **S3**: Presigned URLs for secure upload/download

### Data Encryption
- **At Rest**: S3 server-side encryption, DynamoDB encryption
- **In Transit**: HTTPS for all API calls, WSS for WebSocket

### Network Security
- **API Gateway**: CORS configured for Amplify domain
- **S3**: Block public access, presigned URLs only

### Data Privacy
- **Conversation Logs**: Stored for analytics
- **File Uploads**: TTL for automatic cleanup
- **Escalation**: Contact info provided, not stored

---

## Scalability

### Auto-scaling
- **Lambda**: Automatic scaling to 1000+ concurrent executions
- **DynamoDB**: On-demand capacity mode (auto-scaling)
- **API Gateway**: Managed service with automatic scaling
- **WebSocket**: Supports thousands of concurrent connections

### Performance Optimizations
- **WebSocket**: Real-time bidirectional communication
- **Presigned URLs**: Direct S3 upload without Lambda proxy
- **ESM Modules**: Faster Lambda cold starts
- **Connection Pooling**: Reused DynamoDB clients

### Cost Optimization
- **Serverless Architecture**: Pay only for actual usage
- **On-Demand DynamoDB**: No provisioned capacity costs
- **TTL Cleanup**: Automatic deletion of old data
- **Lambda Memory**: Right-sized for each function

---

## Data Flow Diagrams

### Chat Request Flow

```
User → Amplify → WebSocket API → SendMessage Lambda
                                        ↓
                                 Bedrock Agent
                                        ↓
                                 Knowledge Base
                                        ↓
                                 Generate Response
                                        ↓
                                 WebSocket → User
                                        ↓
                                 Save to DynamoDB
```

### Admin Dashboard Flow

```
Admin → Cognito (auth) → Amplify → REST API
                                       ↓
                                 Metrics Lambda
                                       ↓
                                 DynamoDB (query)
                                       ↓
                                 Return Stats → Admin
```

### File Upload Flow

```
User → REST API → Presign Lambda
                        ↓
                 Generate S3 URL
                        ↓
User → S3 (direct upload)
                        ↓
User → REST API → Confirm Lambda
                        ↓
                 Update DynamoDB
                        ↓
User → WebSocket → SendMessage Lambda
                        ↓
                 Fetch from S3
                        ↓
                 Extract Text
                        ↓
                 Bedrock Agent
```

---

## Related Documentation

- [Deployment Guide](./deploymentGuide.md) - How to deploy the application
- [API Documentation](./APIDoc.md) - Complete API reference
- [Modification Guide](./modificationGuide.md) - How to customize the application
- [User Guide](./userGuide.md) - How to use the chatbot
