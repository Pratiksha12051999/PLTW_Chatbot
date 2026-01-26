#!/usr/bin/env bash
set -euo pipefail

# PLTW Bedrock Setup - Managed Vector Storage (No OpenSearch!)
# Uses Bedrock's built-in vector storage - simpler and no permissions issues

echo "🤖 PLTW Bedrock Agent Setup (Simplified)"
echo "=========================================="
echo ""

# --------------------------------------------------
# Configuration
# --------------------------------------------------

echo "📋 Configuration"
echo "================"
echo ""

# Detect CloudShell or use profile
if [ -n "${AWS_EXECUTION_ENV:-}" ] || [ -n "${AWS_CLOUDSHELL:-}" ] || [ -d "/home/cloudshell-user" ]; then
    echo "✅ Detected AWS CloudShell"
    IS_CLOUDSHELL=true
else
    echo "📍 Running on local machine"
    IS_CLOUDSHELL=false
    
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI not installed"
        exit 1
    fi
    
    echo "Available profiles:"
    aws configure list-profiles 2>/dev/null || echo "  (none)"
    echo ""
    
    read -rp "Enter AWS profile [default]: " AWS_PROFILE_INPUT
    AWS_PROFILE=${AWS_PROFILE_INPUT:-default}
    export AWS_PROFILE
    echo "✅ Using profile: $AWS_PROFILE"
fi

echo ""

# Helper function
run_aws() {
    if [ "$IS_CLOUDSHELL" = true ]; then
        aws "$@"
    else
        aws --profile "$AWS_PROFILE" "$@"
    fi
}

# Get credentials
AWS_IDENTITY=$(run_aws sts get-caller-identity)
AWS_ACCOUNT=$(echo "$AWS_IDENTITY" | grep -o '"Account"[^"]*"[^"]*"' | cut -d'"' -f4)
AWS_REGION=$(run_aws configure get region 2>/dev/null || echo "us-east-1")

echo "Account: $AWS_ACCOUNT"

read -rp "Enter AWS region [$AWS_REGION]: " REGION_INPUT
AWS_REGION=${REGION_INPUT:-$AWS_REGION}
export AWS_DEFAULT_REGION="$AWS_REGION"
echo "✅ Region: $AWS_REGION"
echo ""

# Project configuration
PROJECT_NAME="pltw-support"
BUCKET_NAME="${PROJECT_NAME}-docs-${AWS_ACCOUNT}"
KB_NAME="${PROJECT_NAME}-kb"
AGENT_NAME="${PROJECT_NAME}-agent"

echo "Resources to create:"
echo "  S3 Bucket:      $BUCKET_NAME"
echo "  Knowledge Base: $KB_NAME (Managed Vector Storage)"
echo "  Agent:          $AGENT_NAME (Nova Pro)"
echo ""
echo "✅ No OpenSearch needed - using Bedrock managed storage!"
echo ""

read -rp "Continue? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" && "$CONFIRM" != "y" ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting setup..."
echo ""

# --------------------------------------------------
# 1. Create S3 Bucket
# --------------------------------------------------

echo "📦 Step 1: Creating S3 Bucket"
echo "=============================="
echo ""

if run_aws s3 ls "s3://${BUCKET_NAME}" 2>/dev/null; then
    echo "✅ Bucket already exists: $BUCKET_NAME"
else
    echo "Creating bucket: $BUCKET_NAME"
    
    if [ "$AWS_REGION" = "us-east-1" ]; then
        run_aws s3 mb "s3://${BUCKET_NAME}"
    else
        run_aws s3 mb "s3://${BUCKET_NAME}" --region "$AWS_REGION"
    fi
    
    run_aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    
    echo "✅ Bucket created"
fi

echo ""

# --------------------------------------------------
# 2. Create IAM Roles
# --------------------------------------------------

echo "🔐 Step 2: Creating IAM Roles"
echo "=============================="
echo ""

KB_ROLE_NAME="${PROJECT_NAME}-kb-role"
AGENT_ROLE_NAME="${PROJECT_NAME}-agent-role"

# Knowledge Base Role
if run_aws iam get-role --role-name "$KB_ROLE_NAME" >/dev/null 2>&1; then
    echo "✅ KB role already exists"
    KB_ROLE_ARN=$(run_aws iam get-role --role-name "$KB_ROLE_NAME" --query 'Role.Arn' --output text)
else
    echo "Creating Knowledge Base IAM role..."
    
    KB_TRUST_POLICY='{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {
                "Service": "bedrock.amazonaws.com"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "aws:SourceAccount": "'"$AWS_ACCOUNT"'"
                },
                "ArnLike": {
                    "aws:SourceArn": "arn:aws:bedrock:'"$AWS_REGION"':'"$AWS_ACCOUNT"':knowledge-base/*"
                }
            }
        }]
    }'
    
    KB_ROLE_ARN=$(run_aws iam create-role \
        --role-name "$KB_ROLE_NAME" \
        --assume-role-policy-document "$KB_TRUST_POLICY" \
        --query 'Role.Arn' \
        --output text)
    
    # Simplified policy - no OpenSearch needed!
    KB_POLICY='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::'"$BUCKET_NAME"'",
                    "arn:aws:s3:::'"$BUCKET_NAME"'/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel"
                ],
                "Resource": [
                    "arn:aws:bedrock:'"$AWS_REGION"'::foundation-model/amazon.titan-embed-text-v1",
                    "arn:aws:bedrock:'"$AWS_REGION"'::foundation-model/amazon.titan-embed-text-v2:0"
                ]
            }
        ]
    }'
    
    run_aws iam put-role-policy \
        --role-name "$KB_ROLE_NAME" \
        --policy-name "${KB_ROLE_NAME}-policy" \
        --policy-document "$KB_POLICY"
    
    echo "✅ KB role created: $KB_ROLE_ARN"
    sleep 5
fi

# Agent Role
if run_aws iam get-role --role-name "$AGENT_ROLE_NAME" >/dev/null 2>&1; then
    echo "✅ Agent role already exists"
    AGENT_ROLE_ARN=$(run_aws iam get-role --role-name "$AGENT_ROLE_NAME" --query 'Role.Arn' --output text)
else
    echo "Creating Agent IAM role..."
    
    AGENT_TRUST_POLICY='{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {
                "Service": "bedrock.amazonaws.com"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "aws:SourceAccount": "'"$AWS_ACCOUNT"'"
                },
                "ArnLike": {
                    "aws:SourceArn": "arn:aws:bedrock:'"$AWS_REGION"':'"$AWS_ACCOUNT"':agent/*"
                }
            }
        }]
    }'
    
    AGENT_ROLE_ARN=$(run_aws iam create-role \
        --role-name "$AGENT_ROLE_NAME" \
        --assume-role-policy-document "$AGENT_TRUST_POLICY" \
        --query 'Role.Arn' \
        --output text)
    
    # Policy for Nova Pro - will update with KB ARN after creation
    AGENT_POLICY='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel"
                ],
                "Resource": [
                    "arn:aws:bedrock:'"$AWS_REGION"'::foundation-model/amazon.nova-pro-v1:0",
                    "arn:aws:bedrock:'"$AWS_REGION"'::foundation-model/us.amazon.nova-pro-v1:0"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "bedrock:Retrieve"
                ],
                "Resource": [
                    "arn:aws:bedrock:'"$AWS_REGION"':'"$AWS_ACCOUNT"':knowledge-base/*"
                ]
            }
        ]
    }'
    
    run_aws iam put-role-policy \
        --role-name "$AGENT_ROLE_NAME" \
        --policy-name "${AGENT_ROLE_NAME}-policy" \
        --policy-document "$AGENT_POLICY"
    
    echo "✅ Agent role created: $AGENT_ROLE_ARN"
    sleep 5
fi

echo ""

# --------------------------------------------------
# 3. Create Knowledge Base via Console (Easiest!)
# --------------------------------------------------

echo "📚 Step 3: Create Knowledge Base via Console"
echo "============================================="
echo ""

echo "⚠️  Please create the Knowledge Base via AWS Console"
echo "   This is faster and avoids all permission issues!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Instructions:"
echo ""
echo "1. Open Bedrock Console:"
echo "   https://console.aws.amazon.com/bedrock/home?region=$AWS_REGION#/knowledge-bases"
echo ""
echo "2. Click 'Create knowledge base'"
echo ""
echo "3. Configure:"
echo "   Name:        $KB_NAME"
echo "   Description: PLTW support documentation"
echo ""
echo "4. For IAM role:"
echo "   • Select 'Use an existing service role'"
echo "   • Choose: $KB_ROLE_NAME"
echo ""
echo "5. For data source:"
echo "   • Type: S3"
echo "   • S3 URI: s3://$BUCKET_NAME/"
echo ""
echo "6. For embedding model:"
echo "   • Select: Titan Embeddings G1 - Text (v1)"
echo ""
echo "7. For vector database:"
echo "   • Select: 'Quick create a new vector store'"
echo "   • This creates managed storage automatically!"
echo "   • ✅ No OpenSearch permissions needed!"
echo ""
echo "8. Click 'Create knowledge base'"
echo ""
echo "9. After creation, click into the KB and note:"
echo "   • Knowledge Base ID"
echo "   • Data Source ID (under Data sources tab)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -rp "Press Enter after you've created the Knowledge Base..."
echo ""

# Collect IDs
echo "Please enter the IDs from the console:"
echo ""
read -rp "Knowledge Base ID: " KB_ID
read -rp "Data Source ID: " DATA_SOURCE_ID
echo ""

if [ -z "$KB_ID" ] || [ -z "$DATA_SOURCE_ID" ]; then
    echo "❌ Knowledge Base ID and Data Source ID are required"
    exit 1
fi

echo "✅ Knowledge Base: $KB_ID"
echo "✅ Data Source: $DATA_SOURCE_ID"
echo ""

# --------------------------------------------------
# 4. Create Bedrock Agent
# --------------------------------------------------

echo "🤖 Step 4: Creating Bedrock Agent (Nova Pro)"
echo "============================================="
echo ""

# Your exact agent instructions
AGENT_INSTRUCTION='# MISSION
You are Jordan, a Customer-Centric Support Assistant for Project Lead The Way (PLTW). 
Your goal is to provide US PreK-12 educators (teachers, admins, CTE directors) with 
immediate, actionable Tier-1 support to reduce the volume of inquiries to the 
Solution Center.

# CONTEXT & SCOPE
Always prioritize the PLTW mission: Empowering teachers to inspire students through 
real-world applied learning. You assist with:
- Implementation & Curriculum
- Professional Development
- Rostering & Account Management
- Assessments, Grading, Payment, and Grants

# OPERATIONAL RULES
1. TONE: Maintain a "Very Pleasant" and "Friendly" demeanor. 
   - Example: Start with "Thank you for that question!" or "I'\''d be happy to help you with that."
2. REASONING: Before answering, use <thinking> tags to plan your response based on the knowledge base.
3. CITATIONS: 
   - For website-based info: Always provide the link.
   - For PDF-based info: Summarize clearly but DO NOT provide a link.
4. ESCALATION: If the knowledge base does not contain the answer, or if the user is 
   unsatisfied, provide this EXACT contact info: 
   "Please contact the PLTW Solution Center at 877.335.7589 or solutioncenter@pltw.org." 

# KNOWLEDGE BASE UTILIZATION
### Primary Sources:
- Main Site: https://www.pltw.org
- Technical/Software: https://knowledge.pltw.org/s/
- Curriculum: https://www.pltw.org/curriculum

### Handling Constraints:
- Only answer based on the provided Knowledge Base.
- Do not make up external links or resources.
- If a query is outside the PLTW scope, politely redirect them back to PLTW topics.

# OUTPUT FORMATTING
- Use headers and bullet points for scannability.
- Use bold text for key steps or deadlines.
- Always include a "Next Steps" section at the end of helpful responses.'

EXISTING_AGENT=$(run_aws bedrock-agent list-agents \
    --query "agentSummaries[?agentName=='$AGENT_NAME'].agentId" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_AGENT" ]; then
    echo "✅ Agent already exists"
    AGENT_ID="$EXISTING_AGENT"
else
    echo "Creating Bedrock Agent with Nova Pro..."
    
    AGENT_RESULT=$(run_aws bedrock-agent create-agent \
        --agent-name "$AGENT_NAME" \
        --agent-resource-role-arn "$AGENT_ROLE_ARN" \
        --foundation-model "us.amazon.nova-pro-v1:0" \
        --instruction "$AGENT_INSTRUCTION" \
        --description "PLTW Support Assistant - Jordan" \
        --idle-session-ttl-in-seconds 600 \
        --output json)
    
    AGENT_ID=$(echo "$AGENT_RESULT" | grep -o '"agentId"[^"]*"[^"]*"' | cut -d'"' -f4)
    
    echo "✅ Agent created: $AGENT_ID"
fi

# Associate KB with Agent
echo "Associating Knowledge Base with Agent..."
run_aws bedrock-agent associate-agent-knowledge-base \
    --agent-id "$AGENT_ID" \
    --agent-version "DRAFT" \
    --knowledge-base-id "$KB_ID" \
    --description "PLTW documentation knowledge base" \
    --knowledge-base-state "ENABLED" \
    2>/dev/null || true

echo "✅ Knowledge Base associated"
echo ""

# --------------------------------------------------
# 5. Prepare and Create Alias
# --------------------------------------------------

echo "🔧 Step 5: Preparing Agent"
echo "=========================="
echo ""

echo "Preparing agent..."
run_aws bedrock-agent prepare-agent --agent-id "$AGENT_ID" >/dev/null
echo "⏳ Waiting for preparation..."
sleep 15

# Create prod alias
echo "Creating 'prod' alias..."
PROD_ALIAS_RESULT=$(run_aws bedrock-agent create-agent-alias \
    --agent-id "$AGENT_ID" \
    --agent-alias-name "prod" \
    --description "Production alias" \
    --output json 2>/dev/null || echo '{"agentAlias":{"agentAliasId":"existing"}}')

AGENT_ALIAS_ID=$(echo "$PROD_ALIAS_RESULT" | grep -o '"agentAliasId"[^"]*"[^"]*"' | cut -d'"' -f4)

if [ "$AGENT_ALIAS_ID" != "existing" ]; then
    echo "✅ Prod alias created: $AGENT_ALIAS_ID"
else
    AGENT_ALIAS_ID=$(run_aws bedrock-agent list-agent-aliases \
        --agent-id "$AGENT_ID" \
        --query "agentAliasSummaries[?agentAliasName=='prod'].agentAliasId" \
        --output text)
    echo "✅ Using existing prod alias: $AGENT_ALIAS_ID"
fi

echo ""

# --------------------------------------------------
# 6. Save Configuration
# --------------------------------------------------

echo "💾 Step 6: Saving Configuration"
echo "================================"
echo ""

ENV_FILE=".env"
cat > "$ENV_FILE" <<EOF
# PLTW Bedrock Configuration (Managed Vector Storage)
# Generated: $(date)

# AWS
CDK_DEFAULT_REGION=$AWS_REGION
AWS_ACCOUNT=$AWS_ACCOUNT

# S3
S3_BUCKET=$BUCKET_NAME

# Knowledge Base (Managed Vector Storage - No OpenSearch!)
BEDROCK_KB_ID=$KB_ID
BEDROCK_DATA_SOURCE_ID=$DATA_SOURCE_ID

# Bedrock Agent (Nova Pro)
BEDROCK_AGENT_ID=$AGENT_ID
BEDROCK_AGENT_ALIAS_ID=$AGENT_ALIAS_ID
AGENT_NAME=$AGENT_NAME
FOUNDATION_MODEL=us.amazon.nova-pro-v1:0

# IAM Roles
KB_ROLE_ARN=$KB_ROLE_ARN
AGENT_ROLE_ARN=$AGENT_ROLE_ARN

# Vector Storage
VECTOR_STORAGE=BEDROCK_MANAGED
EOF

echo "✅ Configuration saved to: $ENV_FILE"
echo ""

if [ -d "infrastructure/cdk" ]; then
    cp "$ENV_FILE" "infrastructure/cdk/.env"
    echo "✅ Also saved to: infrastructure/cdk/.env"
    echo ""
fi

# --------------------------------------------------
# 7. Summary
# --------------------------------------------------

echo "🎉 =============================================="
echo "🎉 SETUP COMPLETED SUCCESSFULLY!"
echo "🎉 =============================================="
echo ""
echo "📋 Resources Created:"
echo "===================="
echo ""
echo "S3 Bucket:"
echo "  Name: $BUCKET_NAME"
echo "  URL:  https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME"
echo ""
echo "Knowledge Base:"
echo "  ID:   $KB_ID"
echo "  Storage: Bedrock Managed (No OpenSearch!)"
echo "  Model: Amazon Titan Embeddings G1 - Text v1"
echo "  URL:  https://console.aws.amazon.com/bedrock/home?region=$AWS_REGION#/knowledge-bases/$KB_ID"
echo ""
echo "Bedrock Agent:"
echo "  ID:    $AGENT_ID"
echo "  Name:  $AGENT_NAME"
echo "  Model: Amazon Nova Pro v1"
echo "  Alias: $AGENT_ALIAS_ID (prod)"
echo "  URL:   https://console.aws.amazon.com/bedrock/home?region=$AWS_REGION#/agents/$AGENT_ID"
echo ""
echo "✅ No OpenSearch permissions needed!"
echo "✅ Uses Bedrock managed vector storage"
echo ""
echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. Upload your PLTW documentation to S3:"
echo "   aws s3 cp ./docs/ s3://$BUCKET_NAME/ --recursive"
echo ""
echo "2. Start ingestion job:"
echo "   aws bedrock-agent start-ingestion-job \\"
echo "     --knowledge-base-id $KB_ID \\"
echo "     --data-source-id $DATA_SOURCE_ID"
echo ""
echo "3. Monitor ingestion:"
echo "   aws bedrock-agent list-ingestion-jobs \\"
echo "     --knowledge-base-id $KB_ID \\"
echo "     --data-source-id $DATA_SOURCE_ID"
echo ""
echo "4. Test the agent:"
echo "   aws bedrock-agent-runtime invoke-agent \\"
echo "     --agent-id $AGENT_ID \\"
echo "     --agent-alias-id $AGENT_ALIAS_ID \\"
echo "     --session-id test-123 \\"
echo "     --input-text \"What is PLTW?\" \\"
echo "     response.txt"
echo ""
echo "5. Use in deployment:"
echo "   cd infrastructure/cdk"
echo "   export \$(cat .env | xargs)"
echo "   cdk deploy"
echo ""
echo "✅ All done! Configuration saved in .env file"
echo ""