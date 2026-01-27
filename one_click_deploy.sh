#!/usr/bin/env bash
set -euo pipefail

# PLTW Chatbot - One-Click Deployment
# Auto-detects CloudShell or uses AWS CLI profiles

echo "🚀 PLTW Chatbot - One-Click Deployment"
echo "======================================"
echo ""

# --------------------------------------------------
# 1. Detect Environment and Configure AWS Credentials
# --------------------------------------------------

echo "📋 Step 1: AWS Authentication"
echo "=============================="
echo ""

# Detect if running in AWS CloudShell
if [ -n "${AWS_EXECUTION_ENV:-}" ] || [ -n "${AWS_CLOUDSHELL:-}" ] || [ -d "/home/cloudshell-user" ]; then
    echo "✅ Detected AWS CloudShell environment"
    echo "   Using CloudShell IAM role credentials"
    IS_CLOUDSHELL=true
else
    echo "📍 Running on local machine"
    IS_CLOUDSHELL=false
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is not installed"
        echo "Install from: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # List available profiles
    echo ""
    echo "Available AWS profiles:"
    aws configure list-profiles 2>/dev/null || echo "  (none configured)"
    echo ""
    
    # Prompt for profile
    read -rp "Enter AWS profile name [default]: " AWS_PROFILE_INPUT
    AWS_PROFILE=${AWS_PROFILE_INPUT:-default}
    export AWS_PROFILE
    
    echo "✅ Using AWS profile: $AWS_PROFILE"
fi

echo ""

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed (recommended for better output)"
    echo "Install: brew install jq (macOS) or apt-get install jq (Linux)"
    echo ""
    read -rp "Continue without jq? (y/n): " CONTINUE
    if [[ "$CONTINUE" != "y" && "$CONTINUE" != "yes" ]]; then
        exit 1
    fi
    HAS_JQ=false
else
    HAS_JQ=true
fi

# Verify credentials
echo "🔐 Verifying AWS credentials..."

if [ "$IS_CLOUDSHELL" = true ]; then
    AWS_CALLER=$(aws sts get-caller-identity 2>&1)
else
    AWS_CALLER=$(aws sts get-caller-identity --profile "$AWS_PROFILE" 2>&1)
fi

AWS_EXIT_CODE=$?

if [ $AWS_EXIT_CODE -ne 0 ]; then
    echo "❌ Failed to verify AWS credentials"
    echo ""
    echo "Error details:"
    echo "$AWS_CALLER"
    echo ""
    
    if [ "$IS_CLOUDSHELL" = false ]; then
        echo "Troubleshooting:"
        echo "1. Verify profile exists: aws configure list-profiles"
        echo "2. Check profile config: aws configure list --profile $AWS_PROFILE"
        echo "3. Test credentials: aws sts get-caller-identity --profile $AWS_PROFILE"
        echo ""
        echo "To configure a new profile:"
        echo "  aws configure --profile $AWS_PROFILE"
    fi
    exit 1
fi

if [ "$HAS_JQ" = true ]; then
    AWS_ACCOUNT=$(echo "$AWS_CALLER" | jq -r '.Account')
    AWS_USER_ARN=$(echo "$AWS_CALLER" | jq -r '.Arn')
else
    # Parse without jq (less reliable)
    AWS_ACCOUNT=$(echo "$AWS_CALLER" | grep -o '"Account"[^"]*"[^"]*"' | cut -d'"' -f4)
    AWS_USER_ARN=$(echo "$AWS_CALLER" | grep -o '"Arn"[^"]*"[^"]*"' | tail -1 | cut -d'"' -f4)
fi

echo "✅ Credentials verified!"
echo "   Account: $AWS_ACCOUNT"
echo "   Identity: $AWS_USER_ARN"
echo ""

# --------------------------------------------------
# 2. Project Configuration
# --------------------------------------------------

echo "📋 Step 2: Project Configuration"
echo "================================="
echo ""

read -rp "Enter project name [pltw-chatbot]: " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-pltw-chatbot}
echo "✅ Project: $PROJECT_NAME"
echo ""

read -rp "Enter environment (dev/staging/prod) [dev]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-dev}
echo "✅ Environment: $ENVIRONMENT"
echo ""

# Get AWS region
if [ "$IS_CLOUDSHELL" = true ]; then
    AWS_REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
else
    AWS_REGION=$(aws configure get region --profile "$AWS_PROFILE" 2>/dev/null || echo "us-east-1")
fi

read -rp "Enter AWS region [$AWS_REGION]: " AWS_REGION_INPUT
AWS_REGION=${AWS_REGION_INPUT:-$AWS_REGION}
export AWS_DEFAULT_REGION="$AWS_REGION"
echo "✅ Region: $AWS_REGION"
echo ""

# --------------------------------------------------
# 3. GitHub Configuration
# --------------------------------------------------

echo "📋 Step 3: GitHub Repository"
echo "============================="
echo ""

GITHUB_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -n "$GITHUB_URL" ]; then
    echo "Detected: $GITHUB_URL"
    read -rp "Use this URL? (y/n) [y]: " USE_DETECTED
    USE_DETECTED=${USE_DETECTED:-y}
    if [[ "$USE_DETECTED" != "y" && "$USE_DETECTED" != "yes" ]]; then
        GITHUB_URL=""
    fi
fi

if [ -z "$GITHUB_URL" ]; then
    read -rp "Enter GitHub repository URL: " GITHUB_URL
fi

if [ -z "$GITHUB_URL" ]; then
    echo "❌ GitHub URL is required"
    exit 1
fi

echo "✅ GitHub: $GITHUB_URL"

if [[ $GITHUB_URL =~ github\.com[:/]([^/]+)/([^/]+)(\.git)?$ ]]; then
    GITHUB_OWNER="${BASH_REMATCH[1]}"
    GITHUB_REPO="${BASH_REMATCH[2]%.git}"
    echo "✅ Repository: $GITHUB_OWNER/$GITHUB_REPO"
fi
echo ""

# --------------------------------------------------
# 4. Bedrock Configuration
# --------------------------------------------------

echo "📋 Step 4: Bedrock Configuration"
echo "================================="
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "Found .env file with configuration"
    read -rp "Load Bedrock IDs from .env? (y/n) [y]: " LOAD_ENV
    LOAD_ENV=${LOAD_ENV:-y}
    
    if [[ "$LOAD_ENV" == "y" || "$LOAD_ENV" == "yes" ]]; then
        # Load from .env
        if [ "$HAS_JQ" = true ]; then
            BEDROCK_AGENT_ID=$(grep "BEDROCK_AGENT_ID=" .env | cut -d'=' -f2)
            BEDROCK_AGENT_ALIAS_ID=$(grep "BEDROCK_AGENT_ALIAS_ID=" .env | cut -d'=' -f2)
            KNOWLEDGE_BASE_ID=$(grep "BEDROCK_KB_ID=" .env | cut -d'=' -f2)
        else
            BEDROCK_AGENT_ID=$(grep "BEDROCK_AGENT_ID=" .env | cut -d'=' -f2)
            BEDROCK_AGENT_ALIAS_ID=$(grep "BEDROCK_AGENT_ALIAS_ID=" .env | cut -d'=' -f2)
            KNOWLEDGE_BASE_ID=$(grep "BEDROCK_KB_ID=" .env | cut -d'=' -f2)
        fi
        
        echo "✅ Loaded from .env:"
        echo "   Agent ID: ${BEDROCK_AGENT_ID:0:10}..."
        echo "   Alias ID: ${BEDROCK_AGENT_ALIAS_ID:0:10}..."
        if [ -n "$KNOWLEDGE_BASE_ID" ]; then
            echo "   KB ID:    ${KNOWLEDGE_BASE_ID:0:10}..."
        fi
    fi
fi

# If not loaded from .env, prompt for values
if [ -z "${BEDROCK_AGENT_ID:-}" ]; then
    read -rp "Enter Bedrock Agent ID: " BEDROCK_AGENT_ID
    if [ -z "$BEDROCK_AGENT_ID" ]; then
        echo "❌ Bedrock Agent ID is required"
        exit 1
    fi
    echo "✅ Agent ID: ${BEDROCK_AGENT_ID:0:10}..."
fi

if [ -z "${BEDROCK_AGENT_ALIAS_ID:-}" ]; then
    read -rp "Enter Bedrock Agent Alias ID: " BEDROCK_AGENT_ALIAS_ID
    if [ -z "$BEDROCK_AGENT_ALIAS_ID" ]; then
        echo "❌ Bedrock Agent Alias ID is required"
        exit 1
    fi
    echo "✅ Alias ID: ${BEDROCK_AGENT_ALIAS_ID:0:10}..."
fi

if [ -z "${KNOWLEDGE_BASE_ID:-}" ]; then
    read -rp "Enter Knowledge Base ID (optional, press Enter to skip): " KNOWLEDGE_BASE_ID
    if [ -n "$KNOWLEDGE_BASE_ID" ]; then
        echo "✅ Knowledge Base: ${KNOWLEDGE_BASE_ID:0:10}..."
    fi
fi

echo ""

# --------------------------------------------------
# 5. Deployment Action
# --------------------------------------------------

echo "📋 Step 5: Deployment Action"
echo "============================="
echo ""

read -rp "Deploy or destroy? [deploy/destroy]: " ACTION
ACTION=$(printf '%s' "$ACTION" | tr '[:upper:]' '[:lower:]')

if [[ "$ACTION" != "deploy" && "$ACTION" != "destroy" ]]; then
    echo "❌ Invalid action. Must be 'deploy' or 'destroy'"
    exit 1
fi
echo "✅ Action: $ACTION"
echo ""

# --------------------------------------------------
# 6. Configuration Summary
# --------------------------------------------------

echo "📋 Configuration Summary"
echo "========================"
echo ""
echo "  AWS Account:          $AWS_ACCOUNT"
if [ "$IS_CLOUDSHELL" = true ]; then
echo "  Credentials:          CloudShell IAM Role"
else
echo "  AWS Profile:          $AWS_PROFILE"
fi
echo "  Project Name:         $PROJECT_NAME"
echo "  Environment:          $ENVIRONMENT"
echo "  AWS Region:           $AWS_REGION"
echo "  GitHub URL:           $GITHUB_URL"
echo "  Bedrock Agent ID:     ${BEDROCK_AGENT_ID:0:10}..."
echo "  Bedrock Alias ID:     ${BEDROCK_AGENT_ALIAS_ID:0:10}..."
if [ -n "$KNOWLEDGE_BASE_ID" ]; then
echo "  Knowledge Base ID:    ${KNOWLEDGE_BASE_ID:0:10}..."
fi
echo "  Action:               $ACTION"
echo ""

read -rp "Continue with deployment? (yes/no): " CONFIRM
CONFIRM=$(printf '%s' "$CONFIRM" | tr '[:upper:]' '[:lower:]')
if [[ "$CONFIRM" != "yes" && "$CONFIRM" != "y" ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting deployment process..."
echo ""

# --------------------------------------------------
# 7. Create CodeBuild Service Role
# --------------------------------------------------

echo "🔧 Step 6: Setting up CodeBuild Service Role"
echo "============================================="
echo ""

CODEBUILD_ROLE_NAME="${PROJECT_NAME}-codebuild-role"

# Function to run AWS commands with appropriate profile
run_aws() {
    if [ "$IS_CLOUDSHELL" = true ]; then
        aws "$@"
    else
        aws --profile "$AWS_PROFILE" "$@"
    fi
}

if run_aws iam get-role --role-name "$CODEBUILD_ROLE_NAME" >/dev/null 2>&1; then
    echo "✅ CodeBuild role already exists"
    CODEBUILD_ROLE_ARN=$(run_aws iam get-role --role-name "$CODEBUILD_ROLE_NAME" --query 'Role.Arn' --output text)
else
    echo "Creating CodeBuild service role..."
    
    TRUST_POLICY='{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "codebuild.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }'
    
    CODEBUILD_ROLE_ARN=$(run_aws iam create-role \
        --role-name "$CODEBUILD_ROLE_NAME" \
        --assume-role-policy-document "$TRUST_POLICY" \
        --query 'Role.Arn' --output text)
    
    echo "✅ Role created: $CODEBUILD_ROLE_ARN"
    
    echo "Attaching policies..."
    run_aws iam attach-role-policy \
        --role-name "$CODEBUILD_ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
    
    echo "✅ Policies attached"
    echo "⏳ Waiting for role to propagate (10 seconds)..."
    sleep 10
fi

echo ""

# --------------------------------------------------
# 8. Create/Update CodeBuild Project
# --------------------------------------------------

echo "🏗️  Step 7: Setting up CodeBuild Project"
echo "========================================="
echo ""

CODEBUILD_PROJECT="${PROJECT_NAME}-deploy"

# Build environment variables
ENVIRONMENT_VARS='[
    {"name":"ENVIRONMENT","value":"'"$ENVIRONMENT"'","type":"PLAINTEXT"},
    {"name":"AWS_REGION","value":"'"$AWS_REGION"'","type":"PLAINTEXT"},
    {"name":"AWS_ACCOUNT","value":"'"$AWS_ACCOUNT"'","type":"PLAINTEXT"},
    {"name":"ACTION","value":"'"$ACTION"'","type":"PLAINTEXT"},
    {"name":"BEDROCK_AGENT_ID","value":"'"$BEDROCK_AGENT_ID"'","type":"PLAINTEXT"},
    {"name":"BEDROCK_AGENT_ALIAS_ID","value":"'"$BEDROCK_AGENT_ALIAS_ID"'","type":"PLAINTEXT"}
'

if [ -n "${KNOWLEDGE_BASE_ID:-}" ]; then
    ENVIRONMENT_VARS+=',{"name":"KNOWLEDGE_BASE_ID","value":"'"$KNOWLEDGE_BASE_ID"'","type":"PLAINTEXT"}'
fi

ENVIRONMENT_VARS+=']'

ENVIRONMENT_CONFIG='{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_LARGE",
    "privilegedMode": true,
    "environmentVariables": '"$ENVIRONMENT_VARS"'
}'

ARTIFACTS='{"type":"NO_ARTIFACTS"}'
SOURCE='{"type":"GITHUB","location":"'"$GITHUB_URL"'"}'

echo "Configuring CodeBuild project: $CODEBUILD_PROJECT"

PROJECT_EXISTS=$(run_aws codebuild batch-get-projects --names "$CODEBUILD_PROJECT" --query 'projects[0].name' --output text 2>/dev/null || echo "")

if [ "$PROJECT_EXISTS" = "$CODEBUILD_PROJECT" ]; then
    echo "Updating existing project..."
    run_aws codebuild update-project \
        --name "$CODEBUILD_PROJECT" \
        --source "$SOURCE" \
        --artifacts "$ARTIFACTS" \
        --environment "$ENVIRONMENT_CONFIG" \
        --service-role "$CODEBUILD_ROLE_ARN" \
        --no-cli-pager >/dev/null
else
    echo "Creating new project..."
    run_aws codebuild create-project \
        --name "$CODEBUILD_PROJECT" \
        --source "$SOURCE" \
        --artifacts "$ARTIFACTS" \
        --environment "$ENVIRONMENT_CONFIG" \
        --service-role "$CODEBUILD_ROLE_ARN" \
        --no-cli-pager >/dev/null
fi

echo "✅ CodeBuild project configured"
echo ""

# --------------------------------------------------
# 9. Start Build
# --------------------------------------------------

echo "🚀 Step 8: Starting Deployment Build"
echo "====================================="
echo ""

BUILD_RESULT=$(run_aws codebuild start-build \
    --project-name "$CODEBUILD_PROJECT" \
    --no-cli-pager \
    --output json)

if [ "$HAS_JQ" = true ]; then
    BUILD_ID=$(echo "$BUILD_RESULT" | jq -r '.build.id')
else
    BUILD_ID=$(echo "$BUILD_RESULT" | grep -o '"id"[^"]*"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo "✅ Build started: $BUILD_ID"
echo ""

BUILD_URL="https://$AWS_REGION.console.aws.amazon.com/codesuite/codebuild/$AWS_ACCOUNT/projects/$CODEBUILD_PROJECT/build/$BUILD_ID"
echo "📊 Monitor build at:"
echo "   $BUILD_URL"
echo ""

# --------------------------------------------------
# 10. Monitor Build Progress
# --------------------------------------------------

read -rp "Monitor build progress? (y/n) [y]: " MONITOR
MONITOR=$(printf '%s' "$MONITOR" | tr '[:upper:]' '[:lower:]')
MONITOR=${MONITOR:-y}

if [[ "$MONITOR" == "y" || "$MONITOR" == "yes" ]]; then
    echo ""
    echo "⏳ Monitoring build (may take 10-15 minutes)..."
    echo ""
    
    LAST_PHASE=""
    while true; do
        BUILD_INFO=$(run_aws codebuild batch-get-builds --ids "$BUILD_ID" --output json)
        
        if [ "$HAS_JQ" = true ]; then
            BUILD_STATUS=$(echo "$BUILD_INFO" | jq -r '.builds[0].buildStatus')
            CURRENT_PHASE=$(echo "$BUILD_INFO" | jq -r '.builds[0].currentPhase // "UNKNOWN"')
        else
            BUILD_STATUS=$(echo "$BUILD_INFO" | grep -o '"buildStatus"[^"]*"[^"]*"' | cut -d'"' -f4)
            CURRENT_PHASE=$(echo "$BUILD_INFO" | grep -o '"currentPhase"[^"]*"[^"]*"' | cut -d'"' -f4 | head -1)
        fi
        
        if [ "$CURRENT_PHASE" != "$LAST_PHASE" ] && [ "$CURRENT_PHASE" != "UNKNOWN" ] && [ -n "$CURRENT_PHASE" ]; then
            echo "  📍 Phase: $CURRENT_PHASE ($(date '+%H:%M:%S'))"
            LAST_PHASE="$CURRENT_PHASE"
        fi
        
        case $BUILD_STATUS in
            "IN_PROGRESS")
                sleep 30
                ;;
            "SUCCEEDED")
                echo ""
                echo "🎉 ============================================="
                if [ "$ACTION" = "destroy" ]; then
                    echo "🎉 DESTRUCTION COMPLETED SUCCESSFULLY!"
                else
                    echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
                fi
                echo "🎉 ============================================="
                echo ""
                
                if [ "$ACTION" = "deploy" ]; then
                    echo "📥 Fetching deployment outputs..."
                    sleep 5
                    
                    # Query individual stacks with correct output keys
                    # Use aws directly instead of run_aws to avoid any scoping issues
                    if [ "$IS_CLOUDSHELL" = true ]; then
                        AWS_CMD="aws"
                    else
                        AWS_CMD="aws --profile $AWS_PROFILE"
                    fi
                    
                    WS_URL=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "WebSocketStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`WebSocketURL`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    REST_URL=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "RestApiStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    FRONTEND_URL=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "FrontendStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    CONVERSATIONS_TABLE=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "PLTWChatbotDynamoDBStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`ConversationsTableName`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    CONNECTIONS_TABLE=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "PLTWChatbotDynamoDBStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`ConnectionsTableName`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    USER_POOL_ID=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "CognitoStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    USER_POOL_CLIENT_ID=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "CognitoStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    ESCALATION_QUEUE_URL=$($AWS_CMD cloudformation describe-stacks \
                        --stack-name "SQSStack" \
                        --query 'Stacks[0].Outputs[?OutputKey==`EscalationQueueUrl`].OutputValue' \
                        --output text 2>/dev/null || echo "Not available")
                    
                    echo ""
                    echo "🌐 DEPLOYMENT URLS"
                    echo "=================="
                    echo "🖥️  Frontend:     $FRONTEND_URL"
                    echo "🔌 WebSocket:    $WS_URL"
                    echo "🔗 REST API:     $REST_URL"
                    echo ""
                    echo "📊 RESOURCES"
                    echo "============"
                    echo "💾 Conversations Table: $CONVERSATIONS_TABLE"
                    echo "💾 Connections Table:   $CONNECTIONS_TABLE"
                    echo "📬 Escalation Queue:    $ESCALATION_QUEUE_URL"
                    echo ""
                    echo "🔐 COGNITO"
                    echo "=========="
                    echo "👤 User Pool ID:        $USER_POOL_ID"
                    echo "🔑 User Pool Client ID: $USER_POOL_CLIENT_ID"
                    echo ""
                    echo "📝 NEXT STEPS"
                    echo "============="
                    echo "1. Create admin user in Cognito:"
                    if [ "$IS_CLOUDSHELL" = true ]; then
                        echo "   aws cognito-idp admin-create-user \\"
                        echo "     --user-pool-id $USER_POOL_ID \\"
                        echo "     --username admin@example.com \\"
                        echo "     --user-attributes Name=email,Value=admin@example.com \\"
                        echo "     --temporary-password 'TempPass123!'"
                    else
                        echo "   aws cognito-idp admin-create-user \\"
                        echo "     --user-pool-id $USER_POOL_ID \\"
                        echo "     --username admin@example.com \\"
                        echo "     --user-attributes Name=email,Value=admin@example.com \\"
                        echo "     --temporary-password 'TempPass123!' \\"
                        echo "     --profile $AWS_PROFILE"
                    fi
                    echo ""
                    echo "2. Test application: $FRONTEND_URL"
                    echo ""
                    echo "3. Monitor logs:"
                    if [ "$IS_CLOUDSHELL" = true ]; then
                        echo "   aws logs tail /aws/lambda/sendMessage --follow"
                    else
                        echo "   aws logs tail /aws/lambda/sendMessage --follow --profile $AWS_PROFILE"
                    fi
                    echo ""
                    
                    # Save outputs
                    OUTPUT_FILE=".deployment-outputs-${ENVIRONMENT}.txt"
                    cat > "$OUTPUT_FILE" <<EOF
# PLTW Chatbot Deployment Outputs
# Environment: $ENVIRONMENT
# Deployed: $(date)

# URLs
FRONTEND_URL=$FRONTEND_URL
WEBSOCKET_URL=$WS_URL
REST_API_URL=$REST_URL

# DynamoDB Tables
CONVERSATIONS_TABLE=$CONVERSATIONS_TABLE
CONNECTIONS_TABLE=$CONNECTIONS_TABLE

# SQS
ESCALATION_QUEUE_URL=$ESCALATION_QUEUE_URL

# Cognito
USER_POOL_ID=$USER_POOL_ID
USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID

# AWS
AWS_ACCOUNT=$AWS_ACCOUNT
AWS_REGION=$AWS_REGION
EOF
                    echo "✅ Outputs saved to: $OUTPUT_FILE"
                fi
                break
                ;;
            "FAILED"|"FAULT"|"TIMED_OUT"|"STOPPED")
                echo ""
                echo "❌ BUILD $BUILD_STATUS!"
                echo ""
                echo "Check logs at: $BUILD_URL"
                exit 1
                ;;
            *)
                sleep 30
                ;;
        esac
    done
fi

echo ""

# --------------------------------------------------
# 11. Cleanup Options (for destroy)
# --------------------------------------------------

if [ "$ACTION" = "destroy" ]; then
    echo ""
    echo "📋 Post-Destroy Cleanup Options"
    echo "================================"
    echo ""
    
    # Set AWS_CMD if not already set
    if [ "$IS_CLOUDSHELL" = true ]; then
        AWS_CMD="aws"
    else
        AWS_CMD="aws --profile $AWS_PROFILE"
    fi
    
    read -rp "Delete CodeBuild project and role? (y/n) [n]: " CLEANUP
    CLEANUP=$(printf '%s' "$CLEANUP" | tr '[:upper:]' '[:lower:]')
    
    if [[ "$CLEANUP" == "y" || "$CLEANUP" == "yes" ]]; then
        echo "Deleting CodeBuild project..."
        $AWS_CMD codebuild delete-project --name "$CODEBUILD_PROJECT" 2>/dev/null || echo "  Already deleted"
        
        echo "Deleting CodeBuild role..."
        $AWS_CMD iam detach-role-policy --role-name "$CODEBUILD_ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/AdministratorAccess 2>/dev/null || true
        $AWS_CMD iam delete-role --role-name "$CODEBUILD_ROLE_NAME" 2>/dev/null || echo "  Already deleted"
        
        echo "✅ CodeBuild cleanup completed"
    fi
    
    echo ""
    echo "⚠️  Note: The CDK destroy should have deleted the CloudFormation stacks."
    echo "   If any stacks remain, you can manually delete them:"
    echo ""
    echo "   Stacks to check:"
    echo "   - WebSocketStack"
    echo "   - RestApiStack"
    echo "   - FrontendStack"
    echo "   - CognitoStack"
    echo "   - PLTWChatbotDynamoDBStack"
    echo "   - SQSStack"
    echo ""
    echo "   To delete manually:"
    if [ "$IS_CLOUDSHELL" = true ]; then
        echo "   aws cloudformation delete-stack --stack-name <STACK_NAME>"
    else
        echo "   aws cloudformation delete-stack --stack-name <STACK_NAME> --profile $AWS_PROFILE"
    fi
    echo ""
    echo "   ⚠️  For S3 buckets, empty them first before deleting the stack:"
    if [ "$IS_CLOUDSHELL" = true ]; then
        echo "   aws s3 rm s3://pltw-chatbot-frontend-$AWS_ACCOUNT --recursive"
    else
        echo "   aws s3 rm s3://pltw-chatbot-frontend-$AWS_ACCOUNT --recursive --profile $AWS_PROFILE"
    fi
fi

echo ""
echo "🎯 ============================================="
echo "🎯 DEPLOYMENT SCRIPT COMPLETED!"
echo "🎯 ============================================="
echo ""

if [ "$ACTION" = "deploy" ]; then
    echo "📚 Useful Commands:"
    echo ""
    if [ "$IS_CLOUDSHELL" = true ]; then
        echo "  View stacks:"
        echo "    aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE"
        echo ""
        echo "  Monitor logs:"
        echo "    aws logs tail /aws/lambda/sendMessage --follow"
    else
        echo "  View stacks:"
        echo "    aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --profile $AWS_PROFILE"
        echo ""
        echo "  Monitor logs:"
        echo "    aws logs tail /aws/lambda/sendMessage --follow --profile $AWS_PROFILE"
    fi
fi

echo ""
echo "✅ Done!"