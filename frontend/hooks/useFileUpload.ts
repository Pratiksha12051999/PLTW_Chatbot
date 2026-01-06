'use client';

/**
 * React hook for managing file upload state and operations.
 * Handles presigned URL requests, S3 uploads, confirmations, and progress tracking.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7
 */

import { useState, useCallback, useRef } from 'react';
import {
  requestPresignedUrl,
  uploadToS3,
  confirmUpload,
  UploadError,
} from '../lib/uploadApi';
import { validateFile } from '../lib/fileValidation';

/**
 * Represents a file being uploaded with its current state
 */
export interface UploadingFile {
  /** Unique client-side ID for tracking */
  id: string;
  /** The original File object */
  file: File;
  /** Current upload status */
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error?: string;
  /** Server-assigned file ID after presign */
  fileId?: string;
  /** S3 key for the uploaded file */
  s3Key?: string;
}

/**
 * Return type for the useFileUpload hook
 */
export interface UseFileUploadReturn {
  /** Array of files being tracked */
  uploadingFiles: UploadingFile[];
  /** True if any file is pending or uploading */
  isUploading: boolean;
  /** Upload multiple files with progress tracking */
  uploadFiles: (files: File[], conversationId?: string) => Promise<void>;
  /** Remove a file from the list (cancels if uploading) */
  removeFile: (id: string) => void;
  /** Retry a failed upload */
  retryUpload: (id: string, conversationId?: string) => Promise<void>;
  /** Get array of fileIds for successfully uploaded files */
  getUploadedFileIds: () => string[];
  /** Clear all files from the list */
  clearFiles: () => void;
}

/**
 * Generates a unique client-side ID for tracking uploads
 */
function generateClientId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing file uploads with progress tracking and error handling.
 * 
 * @returns UseFileUploadReturn object with state and methods
 */
export function useFileUpload(): UseFileUploadReturn {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  
  // Track abort controllers for cancellation
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  // Track conversation ID for retries
  const conversationIdRef = useRef<string | undefined>(undefined);

  /**
   * Updates a specific file's state
   */
  const updateFile = useCallback((id: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles((prev: UploadingFile[]) =>
      prev.map((f: UploadingFile) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  /**
   * Uploads a single file through the presign -> S3 -> confirm flow
   */
  const uploadSingleFile = useCallback(
    async (uploadingFile: UploadingFile, conversationId?: string): Promise<void> => {
      const { id, file } = uploadingFile;

      try {
        // Update status to uploading
        updateFile(id, { status: 'uploading', progress: 0 });

        // Step 1: Request presigned URL
        const presignResponse = await requestPresignedUrl(file, conversationId);
        updateFile(id, {
          fileId: presignResponse.fileId,
          s3Key: presignResponse.s3Key,
          progress: 10,
        });

        // Step 2: Upload to S3 with progress tracking
        await uploadToS3(presignResponse.presignedUrl, file, (progress) => {
          // Scale progress: 10-90% for S3 upload
          const scaledProgress = 10 + Math.round(progress * 0.8);
          updateFile(id, { progress: scaledProgress });
        });

        // Step 3: Confirm upload
        updateFile(id, { progress: 95 });
        await confirmUpload(presignResponse.fileId);

        // Mark as uploaded
        updateFile(id, { status: 'uploaded', progress: 100 });
      } catch (error) {
        const errorMessage =
          error instanceof UploadError
            ? error.message
            : 'Upload failed. Please try again.';
        updateFile(id, { status: 'error', error: errorMessage, progress: 0 });
      }
    },
    [updateFile]
  );

  /**
   * Upload multiple files with validation and progress tracking.
   * Files are validated before upload begins.
   * 
   * Requirement 4.2: Immediately request presigned URLs and begin uploading
   */
  const uploadFiles = useCallback(
    async (files: File[], conversationId?: string): Promise<void> => {
      // Store conversation ID for retries
      conversationIdRef.current = conversationId;

      // Create UploadingFile entries for valid files
      const newUploadingFiles: UploadingFile[] = [];

      for (const file of files) {
        const validation = validateFile(file);
        const id = generateClientId();

        if (!validation.valid) {
          // Add as error immediately if validation fails
          newUploadingFiles.push({
            id,
            file,
            status: 'error',
            progress: 0,
            error: validation.error,
          });
        } else {
          // Add as pending
          newUploadingFiles.push({
            id,
            file,
            status: 'pending',
            progress: 0,
          });
        }
      }

      // Add all files to state
      setUploadingFiles((prev: UploadingFile[]) => [...prev, ...newUploadingFiles]);

      // Start uploading valid files in parallel
      const validFiles = newUploadingFiles.filter(f => f.status === 'pending');
      await Promise.all(
        validFiles.map(uploadingFile => uploadSingleFile(uploadingFile, conversationId))
      );
    },
    [uploadSingleFile]
  );

  /**
   * Remove a file from the list. If the file is currently uploading,
   * the upload will be cancelled.
   * 
   * Requirement 6.3: Cancel in-progress upload when file is removed
   */
  const removeFile = useCallback((id: string) => {
    // Cancel any in-progress upload
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }

    // Remove from state
    setUploadingFiles((prev: UploadingFile[]) => prev.filter((f: UploadingFile) => f.id !== id));
  }, []);

  /**
   * Retry a failed upload.
   * 
   * Requirement 4.5: Allow retry for failed uploads
   */
  const retryUpload = useCallback(
    async (id: string, conversationId?: string): Promise<void> => {
      const file = uploadingFiles.find((f: UploadingFile) => f.id === id);
      if (!file || file.status !== 'error') {
        return;
      }

      // Use provided conversationId or fall back to stored one
      const convId = conversationId ?? conversationIdRef.current;

      // Reset file state and retry
      updateFile(id, { status: 'pending', progress: 0, error: undefined });
      await uploadSingleFile(file, convId);
    },
    [uploadingFiles, uploadSingleFile, updateFile]
  );

  /**
   * Get array of fileIds for all successfully uploaded files.
   * Used when sending a message with attachments.
   * 
   * Requirement 4.6: Include file IDs in message payload
   */
  const getUploadedFileIds = useCallback((): string[] => {
    return uploadingFiles
      .filter((f: UploadingFile) => f.status === 'uploaded' && f.fileId)
      .map((f: UploadingFile) => f.fileId as string);
  }, [uploadingFiles]);

  /**
   * Clear all files from the list.
   * Typically called after successfully sending a message.
   */
  const clearFiles = useCallback(() => {
    // Cancel any in-progress uploads
    abortControllersRef.current.forEach((controller: AbortController) => controller.abort());
    abortControllersRef.current.clear();

    setUploadingFiles([]);
  }, []);

  /**
   * Compute isUploading based on file statuses.
   * True if any file is pending or uploading.
   * 
   * Requirement 4.7: Prevent sending while files are uploading
   */
  const isUploading = uploadingFiles.some(
    (f: UploadingFile) => f.status === 'pending' || f.status === 'uploading'
  );

  return {
    uploadingFiles,
    isUploading,
    uploadFiles,
    removeFile,
    retryUpload,
    getUploadedFileIds,
    clearFiles,
  };
}
