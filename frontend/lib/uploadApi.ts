/**
 * Frontend upload API client for the file upload feature.
 * Handles presigned URL requests, S3 uploads, confirmations, and downloads.
 * 
 * Requirements: 2.1, 3.2, 5.3
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_REST_API_URL || '';

// Error codes matching backend error responses
export type UploadErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'FILE_NOT_FOUND'
  | 'UPLOAD_NOT_CONFIRMED'
  | 'PRESIGN_FAILED'
  | 'UPLOAD_FAILED'
  | 'CONFIRM_FAILED'
  | 'DOWNLOAD_URL_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Typed error class for upload operations
 */
export class UploadError extends Error {
  code: UploadErrorCode;
  details?: Record<string, unknown>;
  retryable: boolean;

  constructor(
    code: UploadErrorCode,
    message: string,
    details?: Record<string, unknown>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

// Request/Response interfaces matching backend types
export interface PresignRequest {
  filename: string;
  contentType: string;
  size: number;
  conversationId?: string;
}

export interface PresignResponse {
  presignedUrl: string;
  fileId: string;
  s3Key: string;
  expiresIn: number;
}

export interface ConfirmResponse {
  success: boolean;
  file: FileAttachment;
}

export interface DownloadResponse {
  presignedUrl: string;
  expiresIn: number;
}

export interface FileAttachment {
  fileId: string;
  conversationId: string;
  messageId?: string;
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  uploadedAt: number;
  status: 'pending' | 'uploaded' | 'deleted';
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Progress callback type for upload tracking
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Determines if an error code is retryable
 */
function isRetryableError(code: UploadErrorCode): boolean {
  return ['NETWORK_ERROR', 'PRESIGN_FAILED', 'UPLOAD_FAILED', 'CONFIRM_FAILED'].includes(code);
}

/**
 * Parses error response from API
 */
async function parseErrorResponse(response: Response): Promise<UploadError> {
  try {
    const errorData: ErrorResponse = await response.json();
    const code = (errorData.code as UploadErrorCode) || 'UNKNOWN_ERROR';
    return new UploadError(
      code,
      errorData.error || 'An unknown error occurred',
      errorData.details,
      isRetryableError(code)
    );
  } catch {
    return new UploadError(
      'UNKNOWN_ERROR',
      `Request failed with status ${response.status}`,
      undefined,
      false
    );
  }
}

/**
 * Requests a presigned URL for uploading a file to S3.
 * 
 * @param file - The File object to upload
 * @param conversationId - Optional conversation ID to associate with the file
 * @returns Promise resolving to presign response with URL, fileId, and s3Key
 * @throws UploadError if validation fails or request fails
 * 
 * Requirement 2.1: Generate presigned PUT URL
 */
export async function requestPresignedUrl(
  file: File,
  conversationId?: string
): Promise<PresignResponse> {
  const request: PresignRequest = {
    filename: file.name,
    contentType: file.type,
    size: file.size,
    conversationId,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/upload/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return response.json();
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    // Network or other errors
    throw new UploadError(
      'NETWORK_ERROR',
      'Failed to connect to upload service',
      undefined,
      true
    );
  }
}

/**
 * Uploads a file directly to S3 using a presigned URL.
 * 
 * @param presignedUrl - The presigned PUT URL from requestPresignedUrl
 * @param file - The File object to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns Promise resolving when upload completes
 * @throws UploadError if upload fails
 * 
 * Requirement 2.1: Direct upload to S3
 */
export async function uploadToS3(
  presignedUrl: string,
  file: File,
  onProgress?: ProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new UploadError(
            'UPLOAD_FAILED',
            `S3 upload failed with status ${xhr.status}`,
            undefined,
            true
          )
        );
      }
    });

    xhr.addEventListener('error', () => {
      reject(
        new UploadError(
          'NETWORK_ERROR',
          'Network error during S3 upload',
          undefined,
          true
        )
      );
    });

    xhr.addEventListener('abort', () => {
      reject(
        new UploadError(
          'UPLOAD_FAILED',
          'Upload was cancelled',
          undefined,
          false
        )
      );
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Confirms that a file upload has completed successfully.
 * Updates the file status from 'pending' to 'uploaded'.
 * 
 * @param fileId - The file ID returned from requestPresignedUrl
 * @returns Promise resolving to confirm response with updated file metadata
 * @throws UploadError if confirmation fails
 * 
 * Requirement 3.2: Update file status to uploaded
 */
export async function confirmUpload(fileId: string): Promise<ConfirmResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/upload/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return response.json();
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    throw new UploadError(
      'NETWORK_ERROR',
      'Failed to confirm upload',
      undefined,
      true
    );
  }
}

/**
 * Gets a presigned download URL for a file.
 * 
 * @param fileId - The file ID to download
 * @returns Promise resolving to download response with presigned URL
 * @throws UploadError if file not found or not uploaded
 * 
 * Requirement 5.3: Generate presigned GET URL for download
 */
export async function getDownloadUrl(fileId: string): Promise<DownloadResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/upload/download/${fileId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return response.json();
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    throw new UploadError(
      'NETWORK_ERROR',
      'Failed to get download URL',
      undefined,
      true
    );
  }
}

/**
 * Creates an AbortController for cancelling uploads.
 * Note: This is a helper for the useFileUpload hook to manage cancellation.
 * 
 * @returns AbortController instance
 */
export function createUploadAbortController(): AbortController {
  return new AbortController();
}
