import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface SQSStackProps extends cdk.StackProps {
  conversationsTable: dynamodb.Table;
}

export class SQSStack extends cdk.Stack {
  public readonly escalationQueue: sqs.Queue;
  public readonly escalationDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: SQSStackProps) {
    super(scope, id, props);

    // Dead Letter Queue for failed messages (FIFO)
    this.escalationDLQ = new sqs.Queue(this, 'EscalationDLQ', {
      queueName: 'pltw-escalation-dlq.fifo',
      fifo: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Main Escalation Queue (FIFO)
    this.escalationQueue = new sqs.Queue(this, 'EscalationQueue', {
      queueName: 'pltw-escalation-queue.fifo',
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: cdk.Duration.minutes(5),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: this.escalationDLQ,
        maxReceiveCount: 3,
      },
    });

    new cdk.CfnOutput(this, 'EscalationQueueUrl', {
      value: this.escalationQueue.queueUrl,
      description: 'Escalation Queue URL',
      exportName: 'EscalationQueueUrl',
    });

    new cdk.CfnOutput(this, 'EscalationQueueArn', {
      value: this.escalationQueue.queueArn,
      description: 'Escalation Queue ARN',
      exportName: 'EscalationQueueArn',
    });
  }
}
