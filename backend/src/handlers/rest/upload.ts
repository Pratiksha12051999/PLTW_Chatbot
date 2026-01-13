import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UploadService } from '../../services/upload.service.js';
import { validateFileType, validateFileSize, FILE_UPLOAD_CONFIG } from '../../utils/fileValidation.js';
import { PresignRequest, ConfirmRequest } from '../../types/index.js';

const uploadService = new UploadService();

// Standard CORS headers
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

/**
 * Error response helper
 */
function errorResponse(statusCode: number, code: string, error: string, details?: Record<string, unknown>): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ error, code, ...(details && { details }) }),
  };
}

/**
 * Success response helper
 */
function successResponse<T>(data: T): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(data),
  };
}

/**
 * Unified Upload Handler - routes requests based on path and method
 * Handles: 
 *   POST /upload/presign
 *   POST /upload/confirm
 *   GET /upload/download/{fileId}
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const path = event.path;
  const method = event.httpMethod;

  console.log(`Upload handler: ${method} ${path}`);

  try {
    // Route based on path and method
    if (path.endsWith('/presign') && method === 'POST') {
      return await presignUpload(event);
    } else if (path.endsWith('/confirm') && method === 'POST') {
      return await confirmUpload(event);
    } else if (path.includes('/download/') && method === 'GET') {
      return await getDownloadUrl(event);
    } else {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Not found' }),
      };
    }
  } catch (error) {
    console.error('Upload handler error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

/**
 * POST /upload/presign
 * Generates a presigned URL for uploading a file to S3.
 * 
 * Request body:
 * - filename: string (required)
 * - contentType: string (required)
 * - size: number (required)
 * - conversationId: string (optional, defaults to 'default')
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1
 */
export const presignUpload = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    let request: PresignRequest;
    try {
      request = JSON.parse(event.body);
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Invalid JSON in request body');
    }

    const { filename, contentType, size, conversationId } = request;

    // Validate required fields
    if (!filename || typeof filename !== 'string') {
      return errorResponse(400, 'MISSING_FILENAME', 'filename is required and must be a string');
    }

    if (!contentType || typeof contentType !== 'string') {
      return errorResponse(400, 'MISSING_CONTENT_TYPE', 'contentType is required and must be a string');
    }

    if (size === undefined || size === null || typeof size !== 'number') {
      return errorResponse(400, 'MISSING_SIZE', 'size is required and must be a number');
    }

    // Validate file type (Requirement 2.2, 2.4)
    const typeValidation = validateFileType(contentType, filename);
    if (!typeValidation.valid) {
      return errorResponse(400, 'INVALID_FILE_TYPE', typeValidation.error!, {
        allowedTypes: FILE_UPLOAD_CONFIG.allowedExtensions,
      });
    }

    // Validate file size (Requirement 2.3, 2.5)
    const sizeValidation = validateFileSize(size);
    if (!sizeValidation.valid) {
      return errorResponse(400, 'FILE_TOO_LARGE', sizeValidation.error!, {
        maxSizeBytes: FILE_UPLOAD_CONFIG.maxFileSizeBytes,
        maxSizeMB: FILE_UPLOAD_CONFIG.maxFileSizeBytes / (1024 * 1024),
      });
    }

    // Generate presigned URL and create pending metadata (Requirement 2.1, 2.6, 3.1)
    const result = await uploadService.generatePresignedUploadUrl({
      filename,
      contentType,
      size,
      conversationId: conversationId || 'default',
    });

    return successResponse({
      presignedUrl: result.presignedUrl,
      fileId: result.fileId,
      s3Key: result.s3Key,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return errorResponse(500, 'PRESIGN_FAILED', 'Failed to generate presigned URL');
  }
};


/**
 * POST /upload/confirm
 * Confirms that a file upload has completed successfully.
 * Updates the file status from 'pending' to 'uploaded'.
 * 
 * Request body:
 * - fileId: string (required)
 * 
 * Requirements: 3.2
 */
export const confirmUpload = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    let request: ConfirmRequest;
    try {
      request = JSON.parse(event.body);
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Invalid JSON in request body');
    }

    const { fileId } = request;

    // Validate required fields
    if (!fileId || typeof fileId !== 'string') {
      return errorResponse(400, 'MISSING_FILE_ID', 'fileId is required and must be a string');
    }

    // Check if file exists
    const existingFile = await uploadService.getFileMetadata(fileId);
    if (!existingFile) {
      return errorResponse(404, 'FILE_NOT_FOUND', 'File not found');
    }

    // Check if file is in pending status
    if (existingFile.status !== 'pending') {
      return errorResponse(400, 'INVALID_STATUS', `File is already in '${existingFile.status}' status`);
    }

    // Update file status to uploaded (Requirement 3.2)
    const updatedFile = await uploadService.updateFileStatus(fileId, 'uploaded');

    return successResponse({
      success: true,
      file: updatedFile,
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return errorResponse(500, 'CONFIRM_FAILED', 'Failed to confirm upload');
  }
};

/**
 * GET /upload/download/{fileId}
 * Generates a presigned GET URL for downloading a file.
 * 
 * Path parameters:
 * - fileId: string (required)
 * 
 * Requirements: 5.3, 5.4
 */
export const getDownloadUrl = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get fileId from path parameters
    const fileId = event.pathParameters?.fileId;

    if (!fileId) {
      return errorResponse(400, 'MISSING_FILE_ID', 'fileId path parameter is required');
    }

    // Get file metadata
    const file = await uploadService.getFileMetadata(fileId);
    if (!file) {
      return errorResponse(404, 'FILE_NOT_FOUND', 'File not found');
    }

    // Validate file is uploaded (not pending or deleted)
    if (file.status !== 'uploaded') {
      return errorResponse(400, 'UPLOAD_NOT_CONFIRMED', 'File upload has not been confirmed');
    }

    // Generate presigned download URL (Requirement 5.3, 5.4 - 1 hour validity)
    const presignedUrl = await uploadService.generatePresignedDownloadUrl(file.s3Key);

    return successResponse({
      presignedUrl,
      expiresIn: FILE_UPLOAD_CONFIG.downloadUrlExpirySeconds,
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return errorResponse(500, 'DOWNLOAD_URL_FAILED', 'Failed to generate download URL');
  }
};
