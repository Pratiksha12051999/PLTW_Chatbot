#!/usr/bin/env python3
"""
Test PLTW Bedrock Agent
Uses boto3 SDK which is more reliable than AWS CLI
"""

import boto3
import json
import sys
import os
from datetime import datetime

def load_env():
    """Load agent IDs from .env file if available"""
    agent_id = None
    alias_id = None
    
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('BEDROCK_AGENT_ID='):
                    agent_id = line.split('=')[1].strip()
                elif line.startswith('BEDROCK_AGENT_ALIAS_ID='):
                    alias_id = line.split('=')[1].strip()
    
    return agent_id, alias_id

def test_agent():
    """Test the Bedrock agent"""
    print("🤖 Testing PLTW Bedrock Agent")
    print("=" * 50)
    print()
    
    # Load from .env or prompt
    agent_id, alias_id = load_env()
    
    if not agent_id:
        agent_id = input("Enter Bedrock Agent ID: ").strip()
    if not alias_id:
        alias_id = input("Enter Bedrock Agent Alias ID: ").strip()
    
    print(f"Agent ID: {agent_id[:10]}...")
    print(f"Alias ID: {alias_id[:10]}...")
    
    # Get AWS region
    region = os.environ.get('AWS_REGION', 'us-east-1')
    print(f"Region: {region}")
    print()
    
    # Get test question
    question = input("Enter your question (or press Enter for default): ").strip()
    if not question:
        question = "What is PLTW?"
    
    print()
    print(f"Sending: {question}")
    print()
    
    # Generate session ID
    session_id = f"test-{int(datetime.now().timestamp())}"
    
    try:
        # Create Bedrock Agent Runtime client
        client = boto3.client('bedrock-agent-runtime', region_name=region)
        
        print("Invoking agent...")
        print("-" * 50)
        
        # Invoke agent
        response = client.invoke_agent(
            agentId=agent_id,
            agentAliasId=alias_id,
            sessionId=session_id,
            inputText=question
        )
        
        # Parse streaming response
        completion = ""
        for event in response.get('completion', []):
            if 'chunk' in event:
                chunk = event['chunk']
                if 'bytes' in chunk:
                    text = chunk['bytes'].decode('utf-8')
                    completion += text
                    print(text, end='', flush=True)
        
        print()
        print("-" * 50)
        
        if completion:
            # Save to file
            output_file = f"response-{int(datetime.now().timestamp())}.txt"
            with open(output_file, 'w') as f:
                f.write(completion)
            
            print()
            print(f"✅ Response saved to: {output_file}")
            print()
            
            # Show metadata
            print("📊 Response Metadata:")
            print(f"   Length: {len(completion)} characters")
            print(f"   Session ID: {session_id}")
        else:
            print()
            print("⚠️  Received empty response")
    
    except client.exceptions.ResourceNotFoundException:
        print()
        print("❌ Error: Agent not found")
        print()
        print("Troubleshooting:")
        print("1. Check Agent ID and Alias ID are correct")
        print("2. Verify agent exists in the region:", region)
        print("3. Make sure agent is in PREPARED state")
        sys.exit(1)
    
    except client.exceptions.AccessDeniedException:
        print()
        print("❌ Error: Access denied")
        print()
        print("Troubleshooting:")
        print("1. Check your AWS credentials are configured")
        print("2. Verify IAM permissions include:")
        print("   - bedrock:InvokeAgent")
        print("   - bedrock-agent-runtime:InvokeAgent")
        sys.exit(1)
    
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        print()
        print("Troubleshooting:")
        print("1. Check AWS credentials: aws sts get-caller-identity")
        print("2. Verify region is correct")
        print("3. Ensure boto3 is installed: pip install boto3")
        sys.exit(1)

if __name__ == "__main__":
    test_agent()