/**
 * Frontend file validation utilities for the file upload feature.
 * Validates file types and sizes to match backend validation logic.
 */

// Configuration constants - must match backend exactly
export const FILE_UPLOAD_CONFIG = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
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
 * @param file - The File object to validate
 * @returns ValidationResult with valid flag and error message if invalid
 */
export function validateFileType(file: File): ValidationResult {
  const normalizedContentType = file.type.toLowerCase().trim();
  const normalizedFilename = file.name.toLowerCase().trim();
  
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
 * @param file - The File object to validate
 * @returns ValidationResult with valid flag and error message if invalid
 */
export function validateFileSize(file: File): ValidationResult {
  if (file.size <= 0) {
    return {
      valid: false,
      error: 'File size must be greater than 0 bytes',
    };
  }
  
  if (file.size > FILE_UPLOAD_CONFIG.maxFileSizeBytes) {
    const maxSizeMB = FILE_UPLOAD_CONFIG.maxFileSizeBytes / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Validates both file type and size in a single call.
 * 
 * @param file - The File object to validate
 * @returns ValidationResult with valid flag and error message if invalid
 */
export function validateFile(file: File): ValidationResult {
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return { valid: true };
}

/**
 * Gets the maximum file size in a human-readable format.
 * 
 * @returns String representation of max file size (e.g., "10MB")
 */
export function getMaxFileSizeDisplay(): string {
  const maxSizeMB = FILE_UPLOAD_CONFIG.maxFileSizeBytes / (1024 * 1024);
  return `${maxSizeMB}MB`;
}

/**
 * Gets the allowed file extensions as a comma-separated string.
 * 
 * @returns String of allowed extensions (e.g., ".pdf, .doc, .docx, ...")
 */
export function getAllowedExtensionsDisplay(): string {
  return FILE_UPLOAD_CONFIG.allowedExtensions.join(', ');
}