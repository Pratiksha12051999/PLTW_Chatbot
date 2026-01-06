/**
 * File validation utilities for the file upload feature.
 * Validates file types, sizes, and generates S3 keys.
 */

// Configuration constants
export const FILE_UPLOAD_CONFIG = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  presignedUrlExpirySeconds: 300, // 5 minutes for upload
  downloadUrlExpirySeconds: 3600, // 1 hour for download
  pendingFileTtlSeconds: 86400, // 24 hours TTL for pending files
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
  ] as const,
  allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp'] as const,
};

export type AllowedMimeType = (typeof FILE_UPLOAD_CONFIG.allowedMimeTypes)[number];
export type AllowedExtension = (typeof FILE_UPLOAD_CONFIG.allowedExtensions)[number];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that the file type is in the allowed list.
 * Checks both MIME type and file extension.
 * 
 * @param contentType - The MIME type of the file
 * @param filename - The original filename
 * @returns ValidationResult with valid flag and error message if invalid
 */
export function validateFileType(contentType: string, filename: string): ValidationResult {
  const normalizedContentType = contentType.toLowerCase().trim();
  const normalizedFilename = filename.toLowerCase().trim();
  
  // Check MIME type
  const isMimeTypeAllowed = FILE_UPLOAD_CONFIG.allowedMimeTypes.includes(
    normalizedContentType as AllowedMimeType
  );
  
  // Check file extension
  const hasAllowedExtension = FILE_UPLOAD_CONFIG.allowedExtensions.some(ext =>
    normalizedFilename.endsWith(ext)
  );
  
  if (isMimeTypeAllowed && hasAllowedExtension) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: `File type not allowed. Allowed types: ${FILE_UPLOAD_CONFIG.allowedExtensions.join(', ')}`,
  };
}

/**
 * Validates that the file size does not exceed the maximum limit.
 * 
 * @param size - The file size in bytes
 * @returns ValidationResult with valid flag and error message if invalid
 */
export function validateFileSize(size: number): ValidationResult {
  if (size <= 0) {
    return {
      valid: false,
      error: 'File size must be greater than 0 bytes',
    };
  }
  
  if (size > FILE_UPLOAD_CONFIG.maxFileSizeBytes) {
    const maxSizeMB = FILE_UPLOAD_CONFIG.maxFileSizeBytes / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Generates an S3 key for the file following the pattern:
 * uploads/{conversationId}/{fileId}/{filename}
 * 
 * @param conversationId - The conversation ID
 * @param fileId - The unique file ID
 * @param filename - The original filename
 * @returns The S3 key string
 */
export function generateS3Key(conversationId: string, fileId: string, filename: string): string {
  // Sanitize filename to remove potentially problematic characters
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `uploads/${conversationId}/${fileId}/${sanitizedFilename}`;
}
