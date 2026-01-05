# PLTW Support Assistant

AI-powered chatbot for PLTW educators using AWS Bedrock, WebSocket API, and Next.js.

## Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: AWS Lambda (Node.js 20), WebSocket API, REST API
- **AI**: Amazon Bedrock Agent with Knowledge Base
- **Database**: DynamoDB
- **Auth**: AWS Cognito
- **Infrastructure**: AWS CDK

## Features

- ✅ Real-time WebSocket chat
- ✅ AI-powered responses using Bedrock
- ✅ Admin dashboard with analytics
- ✅ Conversation history
- ✅ Multi-category support
- ✅ Escalation detection
- ✅ File attachments (coming soon)

## Setup

### Prerequisites

- Node.js 20+
- AWS CLI configured
- AWS Account with Bedrock access

### Installation

1. Clone the repository
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/pltw-chatbot.git
cd pltw-chatbot
\`\`\`

2. Install dependencies
\`\`\`bash
# Frontend
cd frontend
npm install

# Backend CDK
cd ../backend/cdk
npm install
\`\`\`

3. Configure environment variables
\`\`\`bash
# Copy example files
cp frontend/.env.example frontend/.env
cp backend/cdk/.env.example backend/cdk/.env

# Edit with your values
nano frontend/.env
nano backend/cdk/.env
\`\`\`

4. Deploy infrastructure
\`\`\`bash
cd backend/cdk
cdk deploy --all
\`\`\`

5. Run frontend
\`\`\`bash
cd frontend
npm run dev
\`\`\`

## Project Structure

\`\`\`
pltw-chatbot/
├── frontend/                # Next.js application
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   └── contexts/          # React contexts
├── backend/
│   ├── cdk/               # AWS CDK infrastructure
│   │   ├── lib/           # Stack definitions
│   │   └── bin/           # CDK app entry
│   └── lambda/            # Lambda function handlers
└── README.md
\`\`\`

## API Endpoints

### WebSocket API
- `wss://{api-id}.execute-api.us-east-1.amazonaws.com/prod`

### REST API
- `GET /admin/metrics?day={days}` - Get metrics
- `GET /admin/conversations?category={category}` - Get conversations
- `POST /feedback` - Submit feedback

## License

Private - ASU CIC Project