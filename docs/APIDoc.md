# PLTW Support Assistant APIs

This document provides comprehensive API documentation for the PLTW Support Assistant (Jordan).

---

## Overview

The PLTW Support Assistant API provides endpoints for:
- **Chat**: Real-time WebSocket chat interface powered by Amazon Bedrock Agent
- **Feedback**: User feedback submission for conversation quality tracking
- **Admin**: Protected endpoints for dashboard analytics and conversation management
- **Upload**: File upload and download operations

---

## Authentication

### Public Endpoints (No Authentication Required)
| Endpoint | Description |
|----------|-------------|
| WebSocket `/` | Chat with the AI assistant |
| `POST /feedback` | Submit feedback for a conversation |
| `POST /upload/presign` | Get presigned URL for file upload |
| `POST /upload/confirm` | Confirm file upload completion |
| `GET /upload/download/{fileId}` | Get presigned URL for file download |

### Protected Endpoints (Cognito Authentication Required)
All `/admin/*` endpoints require a valid Cognito JWT token.

### Headers Required
| Header | Description | Required |
|--------|-------------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | Cognito JWT token (for admin endpoints) | Admin only |

---

## 1) WebSocket Chat API

Real-time bidirectional chat interface powered by Amazon Bedrock Agent.

---

#### WebSocket Connection

- **URL**: `wss://{api-id}.execute-api.{region}.amazonaws.com/prod`
- **Purpose**: Establish real-time connection for chat messaging

---

#### Send Message — Chat with AI assistant

- **Route**: `$default` (send any message to WebSocket)

- **Request body**:
```json
{
  "action": "sendMessage",
  "message": "string (required) - The user's question",
  "conversationId": "string (optional) - Existing conversation ID",
  "category": "string (optional) - Conversation category",
  "fileIds": "string[] (optional) - Array of uploaded file IDs"
}
```

- **Example request**:
```json
{
  "action": "sendMessage",
  "message": "How do I get started with PLTW curriculum?",
  "category": "implementation"
}
```

- **Response Events** (sent via WebSocket):

| Event Type | Data Schema | Description |
|------------|-------------|-------------|
| `message_received` | `{ type, message }` | Confirms user message was received |
| `assistant_response` | `{ type, message, shouldEscalate }` | AI assistant response |
| `escalated` | `{ type, message, contactInfo }` | Escalation to human support |
| `error` | `{ type, message }` | Error message if request fails |

- **Message Schema**:
```json
{
  "messageId": "string - UUID",
  "conversationId": "string - UUID",
  "content": "string - Message text",
  "role": "user | assistant",
  "timestamp": "number - Unix timestamp",
  "metadata": {
    "confidence": "number - 0 to 1",
    "sources": "string[] - Source references"
  }
}
```

- **Example response event**:
```json
{
  "type": "assistant_response",
  "message": {
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "conversationId": "660e8400-e29b-41d4-a716-446655440001",
    "content": "To get started with PLTW curriculum, you'll need to...",
    "role": "assistant",
    "timestamp": 1704456600000,
    "metadata": {
      "confidence": 0.85,
      "sources": ["pltw.org/getting-started"]
    }
  },
  "shouldEscalate": false
}
```

---

#### Escalate — Request human support

- **Purpose**: Manually escalate conversation to human support.

- **Request body**:
```json
{
  "action": "escalate",
  "conversationId": "string (required) - Conversation ID to escalate"
}
```

- **Response**:
```json
{
  "type": "escalated",
  "message": "Connecting you to our Solution Center...",
  "contactInfo": {
    "phone": "877.335.7589",
    "email": "solutioncenter@pltw.org"
  }
}
```

---

## 2) Feedback Endpoints

Submit user feedback for conversation quality tracking.

---

#### POST /feedback — Submit feedback for a conversation

- **Purpose**: Record positive or negative feedback for a specific conversation.

- **Request body**:
```json
{
  "conversationId": "string (required) - UUID of the conversation",
  "satisfaction": "string (required) - 'positive' | 'negative'",
  "comment": "string (optional) - Additional feedback comment"
}
```

- **Example request**:
```json
{
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "satisfaction": "positive",
  "comment": "Very helpful response!"
}
```

- **Response**:
```json
{
  "message": "Feedback submitted successfully"
}
```

- **Status codes**:
  - `200 OK` - Feedback recorded successfully
  - `400 Bad Request` - Missing or invalid parameters
  - `500 Internal Server Error` - Database error

---

## 3) Upload Endpoints

File upload and download operations using S3 presigned URLs.

---

#### POST /upload/presign — Generate presigned upload URL

- **Purpose**: Get a presigned URL for uploading a file directly to S3.

- **Request body**:
```json
{
  "filename": "string (required) - Original filename",
  "contentType": "string (required) - MIME type",
  "size": "number (required) - File size in bytes",
  "conversationId": "string (optional) - Associated conversation ID"
}
```

- **Example request**:
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "size": 1024000,
  "conversationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

- **Response**:
```json
{
  "presignedUrl": "https://s3.amazonaws.com/bucket/...",
  "fileId": "string - UUID for the file",
  "s3Key": "string - S3 object key",
  "expiresIn": 3600
}
```

- **Allowed file types**:
  - PDF (`.pdf`) - `application/pdf`
  - Word (`.doc`, `.docx`) - `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`)
  - Text (`.txt`) - `text/plain`

- **Maximum file size**: 10MB

- **Status codes**:
  - `200 OK` - Presigned URL generated
  - `400 Bad Request` - Invalid file type or size
  - `500 Internal Server Error` - S3 error

---

#### POST /upload/confirm — Confirm upload completion

- **Purpose**: Mark a file upload as complete after uploading to S3.

- **Request body**:
```json
{
  "fileId": "string (required) - File ID from presign response"
}
```

- **Example request**:
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000"
}
```

- **Response**:
```json
{
  "success": true,
  "file": {
    "fileId": "string",
    "filename": "string",
    "status": "uploaded"
  }
}
```

- **Status codes**:
  - `200 OK` - Upload confirmed
  - `400 Bad Request` - Invalid file ID or status
  - `404 Not Found` - File not found
  - `500 Internal Server Error` - Database error

---

#### GET /upload/download/{fileId} — Get download URL

- **Purpose**: Generate a presigned URL for downloading a file.

- **Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | string | UUID of the file |

- **Response**:
```json
{
  "presignedUrl": "https://s3.amazonaws.com/bucket/...",
  "expiresIn": 3600
}
```

- **Status codes**:
  - `200 OK` - Download URL generated
  - `400 Bad Request` - Upload not confirmed
  - `404 Not Found` - File not found
  - `500 Internal Server Error` - S3 error

---

## 4) Admin Endpoints (Protected)

All admin endpoints require Cognito authentication via `Authorization` header.

---

#### GET /admin/metrics — Get dashboard statistics

- **Purpose**: Retrieve conversation statistics for the admin dashboard.

- **Query parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `days` | number | No | Number of days to query (default: 7) |

- **Example request**:
```
GET /admin/metrics?days=30
```

- **Response**:
```json
{
  "totalConversations": 150,
  "escalationRate": 12.5,
  "overallSatisfaction": 87.3,
  "conversationVolume": [
    {
      "date": "2025-01-01",
      "count": 20
    }
  ],
  "topCategories": [
    {
      "category": "implementation",
      "count": 45
    }
  ],
  "escalationReasons": {
    "no_answer": 5,
    "user_not_satisfied": 3,
    "requested_agent": 2
  }
}
```

---

#### GET /admin/conversations — Get conversation list

- **Purpose**: Retrieve list of conversations.

- **Query parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Items to return (default: 50) |

- **Example request**:
```
GET /admin/conversations?limit=20
```

- **Response**:
```json
{
  "conversations": [
    {
      "conversationId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-12345",
      "startTime": 1704456600000,
      "status": "active",
      "category": "implementation",
      "messages": [],
      "satisfaction": "positive",
      "escalationReason": null
    }
  ]
}
```

---

## Response Format

### Success Response
```json
{
  "statusCode": 200,
  "body": {
    "data": "..."
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "body": {
    "error": "Error message description",
    "code": "ERROR_CODE"
  }
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| `400` | Bad Request | Invalid request parameters or missing required fields |
| `401` | Unauthorized | Missing or invalid Cognito JWT token |
| `403` | Forbidden | Valid token but insufficient permissions |
| `404` | Not Found | Requested resource does not exist |
| `500` | Internal Server Error | Server-side error (Lambda, DynamoDB, Bedrock) |

### Upload-Specific Error Codes

| Code | Description |
|------|-------------|
| `MISSING_BODY` | Request body is required |
| `INVALID_JSON` | Invalid JSON in request body |
| `MISSING_FILENAME` | Filename is required |
| `MISSING_CONTENT_TYPE` | Content type is required |
| `MISSING_SIZE` | File size is required |
| `INVALID_FILE_TYPE` | File type not allowed |
| `FILE_TOO_LARGE` | File exceeds size limit |
| `FILE_NOT_FOUND` | File does not exist |
| `INVALID_STATUS` | File is not in expected status |
| `UPLOAD_NOT_CONFIRMED` | File upload has not been confirmed |

---

## Rate Limiting

Rate limiting is managed by API Gateway and AWS service quotas:

- **API Gateway**: Default throttling applies
- **Bedrock Agent**: Subject to AWS Bedrock quotas
- **DynamoDB**: On-demand capacity mode (auto-scaling)
- **WebSocket**: Connection limits per API

---

## SDK / Client Examples

### JavaScript/TypeScript (WebSocket Chat)
```typescript
const ws = new WebSocket('wss://your-api.execute-api.us-east-1.amazonaws.com/prod');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'sendMessage',
    message: 'How do I get started with PLTW?',
    category: 'implementation'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  if (data.type === 'assistant_response') {
    console.log('Assistant:', data.message.content);
  }
};
```

### JavaScript/TypeScript (File Upload)
```typescript
// Step 1: Get presigned URL
const presignResponse = await fetch('https://your-api.execute-api.us-east-1.amazonaws.com/prod/upload/presign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'document.pdf',
    contentType: 'application/pdf',
    size: file.size
  })
});
const { presignedUrl, fileId } = await presignResponse.json();

// Step 2: Upload to S3
await fetch(presignedUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/pdf' },
  body: file
});

// Step 3: Confirm upload
await fetch('https://your-api.execute-api.us-east-1.amazonaws.com/prod/upload/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileId })
});
```

### JavaScript/TypeScript (Admin API with Cognito)
```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

// Get Cognito token
const session = await fetchAuthSession();
const idToken = session.tokens?.idToken?.toString();

// Call admin API
const response = await fetch('https://your-api.execute-api.us-east-1.amazonaws.com/prod/admin/metrics?days=7', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': idToken
  }
});

const data = await response.json();
```

### cURL
```bash
# Submit feedback
curl -X POST 'https://your-api.execute-api.us-east-1.amazonaws.com/prod/feedback' \
  -H 'Content-Type: application/json' \
  -d '{"conversationId": "uuid-here", "satisfaction": "positive"}'

# Get presigned upload URL
curl -X POST 'https://your-api.execute-api.us-east-1.amazonaws.com/prod/upload/presign' \
  -H 'Content-Type: application/json' \
  -d '{"filename": "doc.pdf", "contentType": "application/pdf", "size": 1024000}'

# Admin endpoint (with Cognito token)
curl -X GET 'https://your-api.execute-api.us-east-1.amazonaws.com/prod/admin/metrics?days=7' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: your-cognito-id-token'
```

---

## DynamoDB Table Schemas

### Connections Table
| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `connectionId` | String | Partition Key | WebSocket connection ID |
| `userId` | String | - | User identifier |
| `ttl` | Number | - | TTL for auto-cleanup |

### Conversations Table
| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `conversationId` | String | Partition Key | UUID for the conversation |
| `userId` | String | GSI-PK | User identifier |
| `startTime` | Number | GSI-SK | Unix timestamp |
| `status` | String | - | active, resolved, escalated |
| `category` | String | - | Conversation category |
| `messages` | List | - | Array of message objects |
| `satisfaction` | String | - | positive, negative |
| `escalationReason` | String | - | no_answer, user_not_satisfied, requested_agent |
| `endTime` | Number | - | Unix timestamp |
| `comment` | String | - | User feedback comment |

### File Attachments Table
| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `fileId` | String | Partition Key | UUID for the file |
| `conversationId` | String | GSI-PK | Associated conversation |
| `uploadedAt` | Number | GSI-SK | Unix timestamp |
| `filename` | String | - | Original filename |
| `contentType` | String | - | MIME type |
| `size` | Number | - | File size in bytes |
| `s3Key` | String | - | S3 object key |
| `status` | String | - | pending, uploaded |
| `ttl` | Number | - | TTL for auto-cleanup |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-12 | Initial API documentation |

---

## Support

For API-related issues or questions:
- Review the [Deployment Guide](./deploymentGuide.md) for setup instructions
- Check the [Architecture Deep Dive](./architectureDeepDive.md) for system design details
- See the [User Guide](./userGuide.md) for frontend usage
