import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { FileAttachment } from '../types/index.js';
import {
  FILE_UPLOAD_CONFIG,
  generateS3Key,
  validateFileType,
  validateFileSize,
} from '../utils/fileValidation.js';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET!;
const FILE_ATTACHMENTS_TABLE = process.env.FILE_ATTACHMENTS_TABLE!;

export interface PresignParams {
  filename: string;
  contentType: string;
  size: number;
  conversationId: string;
}

export interface PresignResult {
  presignedUrl: string;
  fileId: string;
  s3Key: string;
  expiresIn: number;
}

export class UploadService {
  /**
   * Generates a presigned PUT URL for uploading a file to S3.
   * Also creates a pending file metadata record in DynamoDB.
   * 
   * @param params - The presign parameters including filename, contentType, size, and conversationId
   * @returns PresignResult with presignedUrl, fileId, s3Key, and expiresIn
   * @throws Error if file validation fails
   */
  async generatePresignedUploadUrl(params: PresignParams): Promise<PresignResult> {
    const { filename, contentType, size, conversationId } = params;

    // Validate file type
    const typeValidation = validateFileType(contentType, filename);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    // Validate file size
    const sizeValidation = validateFileSize(size);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    // Generate unique file ID and S3 key
    const fileId = uuidv4();
    const s3Key = generateS3Key(conversationId, fileId, filename);

    // Generate presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: UPLOADS_BUCKET,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: size,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: FILE_UPLOAD_CONFIG.presignedUrlExpirySeconds,
    });

    // Create pending file metadata
    await this.createFileMetadata({
      fileId,
      conversationId,
      filename,
      contentType,
      size,
      s3Key,
      uploadedAt: Date.now(),
      status: 'pending',
      ttl: Math.floor(Date.now() / 1000) + FILE_UPLOAD_CONFIG.pendingFileTtlSeconds,
    });

    return {
      presignedUrl,
      fileId,
      s3Key,
      expiresIn: FILE_UPLOAD_CONFIG.presignedUrlExpirySeconds,
    };
  }

  /**
   * Generates a presigned GET URL for downloading a file from S3.
   * 
   * @param s3Key - The S3 object key
   * @returns The presigned download URL
   */
  async generatePresignedDownloadUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: UPLOADS_BUCKET,
      Key: s3Key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: FILE_UPLOAD_CONFIG.downloadUrlExpirySeconds,
    });

    return presignedUrl;
  }

  /**
   * Generates a presigned GET URL for a citation source from S3.
   * Parses S3 URIs (s3://bucket/key) and generates presigned URLs.
   * 
   * @param s3Uri - The S3 URI (e.g., s3://bucket-name/path/to/file.pdf)
   * @returns The presigned download URL
   */
  async generateCitationPresignedUrl(s3Uri: string): Promise<string> {
    // Parse S3 URI: s3://bucket-name/path/to/file.pdf
    const match = s3Uri.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error('Invalid S3 URI format');
    }

    const [, bucket, key] = match;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: FILE_UPLOAD_CONFIG.downloadUrlExpirySeconds,
    });

    return presignedUrl;
  }

  /**
   * Creates a file metadata record in DynamoDB.
   * 
   * @param metadata - The file attachment metadata to store
   */
  async createFileMetadata(metadata: FileAttachment): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: FILE_ATTACHMENTS_TABLE,
        Item: metadata,
      })
    );
  }

  /**
   * Updates the status of a file attachment.
   * Used to transition from 'pending' to 'uploaded' after successful upload.
   * Removes TTL when status changes to 'uploaded'.
   * 
   * @param fileId - The unique file ID
   * @param status - The new status ('pending' | 'uploaded' | 'deleted')
   * @returns The updated FileAttachment
   */
  async updateFileStatus(
    fileId: string,
    status: 'pending' | 'uploaded' | 'deleted'
  ): Promise<FileAttachment> {
    const updateExpression =
      status === 'uploaded'
        ? 'SET #status = :status REMOVE #ttl'
        : 'SET #status = :status';

    const result = await docClient.send(
      new UpdateCommand({
        TableName: FILE_ATTACHMENTS_TABLE,
        Key: { fileId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: {
          '#status': 'status',
          ...(status === 'uploaded' ? { '#ttl': 'ttl' } : {}),
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as FileAttachment;
  }

  /**
   * Retrieves file metadata by file ID.
   * 
   * @param fileId - The unique file ID
   * @returns The FileAttachment or null if not found
   */
  async getFileMetadata(fileId: string): Promise<FileAttachment | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: FILE_ATTACHMENTS_TABLE,
        Key: { fileId },
      })
    );

    return (result.Item as FileAttachment) || null;
  }

  /**
   * Retrieves all files associated with a conversation.
   * Uses the ConversationIdIndex GSI for efficient querying.
   * 
   * @param conversationId - The conversation ID
   * @returns Array of FileAttachment records
   */
  async getFilesByConversation(conversationId: string): Promise<FileAttachment[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: FILE_ATTACHMENTS_TABLE,
        IndexName: 'ConversationIdIndex',
        KeyConditionExpression: 'conversationId = :conversationId',
        ExpressionAttributeValues: {
          ':conversationId': conversationId,
        },
      })
    );

    return (result.Items as FileAttachment[]) || [];
  }
}
