#!/usr/bin/env python3
"""
AWS Bedrock Agent and Knowledge Base Information Extractor

This script extracts detailed information about all Bedrock Agents and their
connected Knowledge Bases from an AWS account.

Requirements:
    pip install boto3 --break-system-packages

Usage:
    python extract_bedrock_agents.py [--region REGION] [--profile PROFILE] [--output OUTPUT_FILE]
"""

import boto3
import json
import argparse
from datetime import datetime
from typing import Dict, List, Any


class BedrockAgentExtractor:
    def __init__(self, region_name: str = None, profile_name: str = None):
        """
        Initialize the Bedrock Agent Extractor
        
        Args:
            region_name: AWS region name (default: us-east-1)
            profile_name: AWS profile name (default: default profile)
        """
        session_kwargs = {}
        if profile_name:
            session_kwargs['profile_name'] = profile_name
        if region_name:
            session_kwargs['region_name'] = region_name
        else:
            session_kwargs['region_name'] = 'us-east-1'
            
        self.session = boto3.Session(**session_kwargs)
        self.bedrock_agent_client = self.session.client('bedrock-agent')
        self.region = session_kwargs['region_name']
        
    def get_all_agents(self) -> List[Dict[str, Any]]:
        """
        Retrieve all Bedrock Agents in the account
        
        Returns:
            List of agent summaries
        """
        agents = []
        try:
            paginator = self.bedrock_agent_client.get_paginator('list_agents')
            for page in paginator.paginate():
                agents.extend(page.get('agentSummaries', []))
            print(f"Found {len(agents)} Bedrock Agent(s)")
        except Exception as e:
            print(f"Error listing agents: {str(e)}")
        
        return agents
    
    def get_agent_details(self, agent_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific agent
        
        Args:
            agent_id: The agent ID
            
        Returns:
            Agent details dictionary
        """
        try:
            response = self.bedrock_agent_client.get_agent(agentId=agent_id)
            return response.get('agent', {})
        except Exception as e:
            print(f"Error getting agent details for {agent_id}: {str(e)}")
            return {}
    
    def get_agent_knowledge_bases(self, agent_id: str, agent_version: str = 'DRAFT') -> List[Dict[str, Any]]:
        """
        Get Knowledge Bases associated with an agent
        
        Args:
            agent_id: The agent ID
            agent_version: Agent version (default: DRAFT)
            
        Returns:
            List of associated knowledge bases
        """
        knowledge_bases = []
        try:
            paginator = self.bedrock_agent_client.get_paginator('list_agent_knowledge_bases')
            for page in paginator.paginate(agentId=agent_id, agentVersion=agent_version):
                knowledge_bases.extend(page.get('agentKnowledgeBaseSummaries', []))
        except Exception as e:
            print(f"Error listing knowledge bases for agent {agent_id}: {str(e)}")
        
        return knowledge_bases
    
    def get_knowledge_base_details(self, knowledge_base_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a Knowledge Base
        
        Args:
            knowledge_base_id: The knowledge base ID
            
        Returns:
            Knowledge base details dictionary
        """
        try:
            response = self.bedrock_agent_client.get_knowledge_base(knowledgeBaseId=knowledge_base_id)
            return response.get('knowledgeBase', {})
        except Exception as e:
            print(f"Error getting knowledge base details for {knowledge_base_id}: {str(e)}")
            return {}
    
    def get_data_sources(self, knowledge_base_id: str) -> List[Dict[str, Any]]:
        """
        Get data sources for a Knowledge Base
        
        Args:
            knowledge_base_id: The knowledge base ID
            
        Returns:
            List of data sources
        """
        data_sources = []
        try:
            paginator = self.bedrock_agent_client.get_paginator('list_data_sources')
            for page in paginator.paginate(knowledgeBaseId=knowledge_base_id):
                data_sources.extend(page.get('dataSourceSummaries', []))
        except Exception as e:
            print(f"Error listing data sources for KB {knowledge_base_id}: {str(e)}")
        
        return data_sources
    
    def get_agent_aliases(self, agent_id: str) -> List[Dict[str, Any]]:
        """
        Get aliases for an agent
        
        Args:
            agent_id: The agent ID
            
        Returns:
            List of agent aliases
        """
        aliases = []
        try:
            paginator = self.bedrock_agent_client.get_paginator('list_agent_aliases')
            for page in paginator.paginate(agentId=agent_id):
                aliases.extend(page.get('agentAliasSummaries', []))
        except Exception as e:
            print(f"Error listing aliases for agent {agent_id}: {str(e)}")
        
        return aliases
    
    def get_agent_action_groups(self, agent_id: str, agent_version: str = 'DRAFT') -> List[Dict[str, Any]]:
        """
        Get action groups for an agent
        
        Args:
            agent_id: The agent ID
            agent_version: Agent version (default: DRAFT)
            
        Returns:
            List of action groups
        """
        action_groups = []
        try:
            paginator = self.bedrock_agent_client.get_paginator('list_agent_action_groups')
            for page in paginator.paginate(agentId=agent_id, agentVersion=agent_version):
                action_groups.extend(page.get('actionGroupSummaries', []))
        except Exception as e:
            print(f"Error listing action groups for agent {agent_id}: {str(e)}")
        
        return action_groups
    
    def extract_all_information(self) -> Dict[str, Any]:
        """
        Extract all information about Bedrock Agents and Knowledge Bases
        
        Returns:
            Complete information dictionary
        """
        print("\n" + "="*60)
        print("AWS Bedrock Agent Information Extraction")
        print("="*60)
        print(f"Region: {self.region}")
        print(f"Timestamp: {datetime.utcnow().isoformat()}")
        print("="*60 + "\n")
        
        all_data = {
            'metadata': {
                'region': self.region,
                'extraction_timestamp': datetime.utcnow().isoformat(),
            },
            'agents': []
        }
        
        # Get all agents
        agent_summaries = self.get_all_agents()
        
        for agent_summary in agent_summaries:
            agent_id = agent_summary['agentId']
            agent_name = agent_summary['agentName']
            
            print(f"\nProcessing Agent: {agent_name} ({agent_id})")
            print("-" * 60)
            
            # Get detailed agent information
            agent_details = self.get_agent_details(agent_id)
            
            # Get agent aliases
            aliases = self.get_agent_aliases(agent_id)
            print(f"  - Found {len(aliases)} alias(es)")
            
            # Get agent action groups
            action_groups = self.get_agent_action_groups(agent_id)
            print(f"  - Found {len(action_groups)} action group(s)")
            
            # Get associated knowledge bases
            knowledge_bases = self.get_agent_knowledge_bases(agent_id)
            print(f"  - Found {len(knowledge_bases)} knowledge base(s)")
            
            # Get detailed information for each knowledge base
            kb_details = []
            for kb_summary in knowledge_bases:
                kb_id = kb_summary['knowledgeBaseId']
                kb_info = self.get_knowledge_base_details(kb_id)
                
                # Get data sources for this knowledge base
                data_sources = self.get_data_sources(kb_id)
                kb_info['dataSources'] = data_sources
                print(f"    - KB {kb_id}: {len(data_sources)} data source(s)")
                
                kb_details.append(kb_info)
            
            # Compile agent information
            agent_info = {
                'summary': agent_summary,
                'details': agent_details,
                'aliases': aliases,
                'actionGroups': action_groups,
                'knowledgeBases': kb_details
            }
            
            all_data['agents'].append(agent_info)
        
        print("\n" + "="*60)
        print("Extraction Complete!")
        print("="*60 + "\n")
        
        return all_data


def main():
    parser = argparse.ArgumentParser(
        description='Extract AWS Bedrock Agent and Knowledge Base information'
    )
    parser.add_argument(
        '--region',
        type=str,
        default='us-east-1',
        help='AWS region (default: us-east-1)'
    )
    parser.add_argument(
        '--profile',
        type=str,
        default=None,
        help='AWS profile name (default: default profile)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='bedrock_agents_info.json',
        help='Output JSON file (default: bedrock_agents_info.json)'
    )
    
    args = parser.parse_args()
    
    # Create extractor and extract information
    extractor = BedrockAgentExtractor(
        region_name=args.region,
        profile_name=args.profile
    )
    
    data = extractor.extract_all_information()
    
    # Save to JSON file
    with open(args.output, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"Information saved to: {args.output}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  Total Agents: {len(data['agents'])}")
    total_kbs = sum(len(agent['knowledgeBases']) for agent in data['agents'])
    print(f"  Total Knowledge Bases: {total_kbs}")


if __name__ == '__main__':
    main()