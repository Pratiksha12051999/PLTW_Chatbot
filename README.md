# PLTW Support Assistant - Jordan AI Chatbot

An intelligent AI-powered customer support chatbot that helps US PreK-12 educators (administrators and teachers) get instant answers about PLTW curriculum implementation, product purchasing, training, assessments, payment, rostering, grants, and technical guidance. Built with AWS Bedrock Agent and NextJS.

## Demo Video

<video src="docs/PLTW Demo.mp4" controls width="100%"></video>

## Index

| Description | Link |
|-------------|------|
| Overview | [Overview](#overview) |
| Architecture | [Architecture](#architecture-diagram) |
| Detailed Architecture | [Architecture Deep Dive](docs/architectureDeepDive.md) |
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
- **Real-time Responses** via WebSocket API for a natural chat experience
- **Knowledge Base Integration** with PLTW documentation (pltw.org, knowledge.pltw.org, curriculum resources)
- **Response Citations** displaying source links for AI responses
- **Bilingual Support** (English/Spanish) with automatic translation via AWS Translate
- **LLM-Powered Categorization** automatically categorizes conversations using Nova Pro
- **Escalation Queue** with SQS integration for human agent handoff
- **Sentiment Analysis** scheduled analysis of conversation sentiment
- **Feedback Mechanism** to collect user satisfaction data (thumbs up/down)
- **Admin Dashboard** with analytics charts (Nivo), conversation logs, and metrics
- **Conversation Detail View** for reviewing full conversation history
- **Responsive Design** optimized for both desktop and mobile devices

## Architecture Diagram

![Architecture Diagram](./PLTW%20Chatbot%20Arch.png)

The application implements a serverless architecture on AWS, combining:

- **Frontend**: Next.js application hosted on AWS Amplify
- **Backend**: AWS CDK-deployed infrastructure with API Gateway (WebSocket + REST) and Lambda
- **AI Layer**: AWS Bedrock Agent with Knowledge Base for RAG-based question answering, plus Nova Pro for categorization and sentiment analysis
- **Data Storage**: DynamoDB for conversation history and connections
- **Queue**: Amazon SQS FIFO queue for escalation handling
- **Authentication**: Amazon Cognito for admin dashboard access
- **Translation**: AWS Translate for bilingual support

For a detailed deep dive into the architecture, see [docs/architectureDeepDive.md](docs/architectureDeepDive.md).

## Deployment

For detailed deployment instructions, including prerequisites and step-by-step guides, see [docs/deploymentGuide.md](docs/deploymentGuide.md).

### Quick Start

```bash
# Backend
cd backend
npm install
node build-lambda.js

cd cdk
npm install
export BEDROCK_AGENT_ID=your-agent-id
export BEDROCK_AGENT_ALIAS_ID=your-alias-id
npx tsc && npx cdk deploy --all

# Frontend
cd frontend
npm install
npm run build
```

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
│   │   │   └── app.ts                  # CDK app entry point
│   │   └── lib/
│   │       ├── amplify-stack.ts        # AWS Amplify hosting stack
│   │       ├── cognito-stack.ts        # Cognito authentication stack
│   │       ├── dynamodb-stack.ts       # DynamoDB tables stack
│   │       ├── rest-api-stack.ts       # REST API Gateway stack
│   │       ├── sqs-stack.ts            # SQS escalation queue stack
│   │       └── websocket-stack.ts      # WebSocket API Gateway stack
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── rest/
│   │   │   │   ├── admin.ts            # Admin dashboard API (metrics, conversations)
│   │   │   │   ├── feedback.ts         # Feedback submission handler
│   │   │   │   └── sentiment.ts        # Scheduled sentiment analysis
│   │   │   └── websocket/
│   │   │       ├── connect.ts          # WebSocket connection handler
│   │   │       ├── disconnect.ts       # WebSocket disconnect handler
│   │   │       └── sendMessage.ts      # Main chat Lambda
│   │   ├── services/
│   │   │   ├── bedrock.service.ts      # Bedrock Agent invocation
│   │   │   ├── categorization.service.ts # LLM-powered conversation categorization
│   │   │   ├── categorization.constants.ts # Category definitions
│   │   │   ├── dynamodb.service.ts     # DynamoDB operations
│   │   │   ├── escalation.service.ts   # Escalation queue service
│   │   │   ├── sentiment.service.ts    # Sentiment analysis service
│   │   │   ├── translate.service.ts    # AWS Translate service
│   │   │   └── websocket.service.ts    # WebSocket messaging
│   │   └── types/
│   │       └── index.ts                # TypeScript type definitions
│   ├── build-lambda.js                 # Lambda bundler script
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Admin layout
│   │   │   └── page.tsx                # Admin dashboard page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Main chatbot page
│   │   └── globals.css                 # Global styles
│   ├── components/
│   │   ├── admin/
│   │   │   └── ConversationDetailModal.tsx  # Conversation detail view
│   │   ├── charts/
│   │   │   ├── ConversationVolumeChart.tsx  # Volume over time chart
│   │   │   ├── EscalationReasonsChart.tsx   # Escalation reasons pie chart
│   │   │   ├── TopCategoriesChart.tsx       # Top categories bar chart
│   │   │   └── UserSatisfactionChart.tsx    # Satisfaction pie chart
│   │   ├── ChatWindow.tsx              # Main chatbot interface
│   │   └── CitationDisplay.tsx         # Source citation display
│   ├── config/
│   │   └── translations.ts             # Bilingual translations
│   ├── contexts/
│   │   ├── AuthContext.tsx             # Authentication context
│   │   └── LanguageContext.tsx         # Language selection context
│   ├── hooks/
│   │   └── useWebSocket.ts             # WebSocket connection hook
│   ├── lib/
│   │   ├── amplify-config.ts           # AWS Amplify configuration
│   │   └── api.ts                      # API client utilities
│   ├── public/                         # Static assets (logos, icons)
│   └── package.json
├── docs/
│   ├── architectureDeepDive.md         # Detailed architecture documentation
│   ├── deploymentGuide.md              # Deployment instructions
│   ├── userGuide.md                    # User guide
│   ├── APIDoc.md                       # API documentation
│   ├── modificationGuide.md            # Customization guide
│   └── media/
│       └── user-interface.gif          # Demo video
├── README.md                           # This file
└── LICENSE                             # MIT License
```

## Environment Variables

### Backend (CDK)
- `BEDROCK_AGENT_ID` - Bedrock Agent ID
- `BEDROCK_AGENT_ALIAS_ID` - Bedrock Agent Alias ID
- `NOVA_PRO_MODEL_ID` - Nova Pro model ID (default: `amazon.nova-pro-v1:0`)

### Frontend
- `NEXT_PUBLIC_WEBSOCKET_URL` - WebSocket API endpoint
- `NEXT_PUBLIC_API_URL` - REST API endpoint
- `NEXT_PUBLIC_USER_POOL_ID` - Cognito User Pool ID
- `NEXT_PUBLIC_USER_POOL_CLIENT_ID` - Cognito Client ID

## Credits

This application was architected and developed by [Pratiksha Wadibhasme](https://www.linkedin.com/in/pratikshawadibhasme/), [Sreeram Sreedhar](https://www.linkedin.com/in/sreeram-sreedhar/), and [Omdevsinh Zala](https://www.linkedin.com/in/omdevsinhzala/), with solutions architect [Arun Arunachalam](https://www.linkedin.com/in/arunarunachalam/), program manager [Thomas Orr](https://www.linkedin.com/in/thomas-orr/) and product manager [Rachel Hayden](https://www.linkedin.com/in/rachelhayden/). Thanks to the ASU Cloud Innovation Centre Technical and Project Management teams for their guidance and support.

## License

This project is distributed under the [MIT License](LICENSE).
