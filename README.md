# PLTW Support Assistant - Jordan AI Chatbot

An intelligent AI-powered customer support chatbot that helps US PreK-12 educators (administrators and teachers) get instant answers about PLTW curriculum implementation, product purchasing, training, assessments, payment, rostering, grants, and technical guidance. Built with AWS Bedrock Knowledge Base and NextJS.

## Demo Video

<p align="center">
  <img src="./docs/media/user-interface.gif" alt="PLTW Support Assistant Demo" width="640" />
</p>

> **Note:** Please add a demo GIF at `docs/media/user-interface.gif`

## Index

| Description | Link |
|-------------|------|
| Overview | [Overview](#overview) |
| Architecture | [Architecture](#architecture-diagram) |
| Detailed Architecture | [Architecture Deep Dive](ARCHITECTURE.md) |
| Deployment | [Deployment Guide](docs/deploymentGuide.md) |
| User Guide | [User Guide](docs/userGuide.md) |
| API Documentation | [API Documentation](docs/APIDoc.md) |
| Modification Guide | [Modification Guide](docs/modificationGuide.md) |
| Credits | [Credits](#credits) |
| License | [License](#license) |

## Overview

PLTW Support Assistant (Jordan) is a conversational AI assistant designed to serve as the first line of customer support for US PreK-12 educators, including District and School administrators, CTE directors, and teachers using Project Lead The Way (PLTW) curriculum. Jordan enables educators to get instant, accurate answers to tier 1 questions about curriculum implementation, product purchasing, training, assessments, payment, rostering, grants, and technical guidance through natural language conversations in English and Spanish.
### Key Features

- **AI-Powered Conversations** using AWS Bedrock Agent with Knowledge Base integration
- **Real-time Streaming Responses** via WebSocket API for a natural chat experience
- **Knowledge Base Integration** with PLTW documentation (pltw.org, knowledge.pltw.org, curriculum resources)
- **Citation Support** with source references and links to documentation
- **Feedback Mechanism** with thumbs up/thumbs down to collect user satisfaction data
- **File Attachment Support** for sharing and analyzing documents (PDFs, Word docs, images)
- **Escalation Detection** automatically identifies queries that need human follow-up and provides Solution Center contact information
- **Admin Dashboard** for monitoring conversations, feedback, analytics, and conversation logs
- **Conversation History** to track and review past interactions
- **Multi-category Support** for organizing conversations by topic
- **Responsive Design** optimized for both desktop and mobile devices
- **Bilingual Support** (English/Spanish) for diverse educator communities

## Architecture Diagram

![Architecture Diagram](./docs/media/architecture.png)

The application implements a serverless architecture on AWS, combining:

- **Frontend**: Next.js application hosted on AWS Amplify
- **Backend**: AWS CDK-deployed infrastructure with API Gateway (WebSocket + REST) and Lambda
- **AI Layer**: AWS Bedrock Agent with Knowledge Base for RAG-based question answering, trained on PLTW documentation from pltw.org, knowledge.pltw.org, and curriculum resources
- **Data Storage**: DynamoDB for conversation history, connections, and file metadata; S3 for file uploads
- **Authentication**: Amazon Cognito for admin dashboard access
- **Future Integration**: Amazon Connect integration planned for direct queue placement when escalation is needed

For a detailed deep dive into the architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Deployment

For detailed deployment instructions, including prerequisites and step-by-step guides, see [docs/deploymentGuide.md](docs/deploymentGuide.md).

## User Guide

For detailed usage instructions with screenshots, see [docs/userGuide.md](docs/userGuide.md).

## API Documentation

For complete API reference including chat endpoints, admin APIs, and user management, see [docs/APIDoc.md](docs/APIDoc.md).

## Modification Guide

For developers looking to extend or customize this project, see [docs/modificationGuide.md](docs/modificationGuide.md).

## Directory Structure

```
├── backend/
│   ├── cdk/
│   │   ├── bin/
│   │   │   └── app.ts              # CDK app entry point
│   │   ├── lib/
│   │   │   ├── amplify-stack.ts    # AWS Amplify hosting stack
│   │   │   ├── cognito-stack.ts    # Cognito authentication stack
│   │   │   ├── dynamodb-stack.ts   # DynamoDB tables stack
│   │   │   ├── rest-api-stack.ts   # REST API Gateway stack
│   │   │   ├── s3-stack.ts         # S3 bucket stack
│   │   │   └── websocket-stack.ts  # WebSocket API Gateway stack
│   │   ├── cdk.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── rest/
│   │   │   │   ├── admin.ts        # Admin dashboard API handlers (metrics, conversations)
│   │   │   │   ├── feedback.ts     # Feedback submission handler
│   │   │   │   └── upload.ts       # File upload handlers (presign, confirm, download)
│   │   │   └── websocket/
│   │   │       ├── connect.ts      # WebSocket connection handler
│   │   │       ├── disconnect.ts   # WebSocket disconnect handler
│   │   │       └── sendMessage.ts  # Main chat Lambda with streaming
│   │   ├── services/
│   │   │   ├── bedrock.service.ts  # Bedrock Agent service with file analysis
│   │   │   ├── dynamodb.service.ts # DynamoDB operations
│   │   │   ├── upload.service.ts   # File upload service (S3 presigned URLs, metadata)
│   │   │   └── websocket.service.ts # WebSocket messaging
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript type definitions
│   │   └── utils/
│   │       └── fileValidation.ts   # File validation utilities
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── admin/                  # Admin login and dashboard pages
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── admin/              # Admin dashboard components
│   │   │   │   └── ConversationDetailModal.tsx
│   │   │   ├── charts/             # Analytics chart components
│   │   │   │   ├── ConversationVolumeChart.tsx
│   │   │   │   ├── EscalationReasonsChart.tsx
│   │   │   │   ├── TopCategoriesChart.tsx
│   │   │   │   └── UserSatisfactionChart.tsx
│   │   │   └── ChatWindow.tsx      # Main chatbot interface
│   │   ├── contexts/               # React contexts (auth)
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── useFileUpload.ts    # File upload hook
│   │   │   └── useWebSocket.ts     # WebSocket connection hook
│   │   ├── lib/                    # App configuration and utilities
│   │   │   ├── amplify-config.ts   # AWS Amplify configuration
│   │   │   ├── api.ts              # API client utilities
│   │   │   ├── fileValidation.ts   # Frontend file validation
│   │   │   └── uploadApi.ts        # File upload API client
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Main chatbot interface
│   │   ├── globals.css
│   │   └── favicon.ico
│   ├── public/                     # Static assets (logos, icons)
│   └── package.json
├── ARCHITECTURE.md                 # Architecture documentation
├── README.md                       # This file
└── docs/                           # Additional documentation (to be created)
    ├── architectureDeepDive.md
    ├── deploymentGuide.md
    ├── userGuide.md
    ├── APIDoc.md
    ├── modificationGuide.md
    └── media/
        └── user-interface.gif
```

## Credits

This application was developed by:

**Associate Cloud Developers:**
- <a href="https://www.linkedin.com/in/pratikshawadibhasme/" target="_blank">Pratiksha Wadibhasme</a>

**UI/UX Designers:**
- <a href="https://www.linkedin.com/in/omdevsinhzala/" target="_blank">Omdevsinh Zala</a>

Built in collaboration with the ASU Cloud Innovation Center and Project Lead The Way.

## License

Private - ASU CIC Project
