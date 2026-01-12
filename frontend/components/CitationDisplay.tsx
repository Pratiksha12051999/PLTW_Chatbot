'use client';

import { ExternalLink, FileText } from 'lucide-react';

/**
 * Parsed source structure for display
 */
interface ParsedSource {
  type: 'website' | 'document';
  title: string;
  url?: string;
  originalUri: string;
}

interface CitationDisplayProps {
  sources?: string[];
}

/**
 * Parses a raw source URI into a displayable format
 */
function parseSource(uri: string): ParsedSource | null {
  if (!uri || typeof uri !== 'string') {
    return null;
  }

  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    return null;
  }

  // Check if it's a web URL (http/https)
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    // Extract a friendly title from the URL
    try {
      const url = new URL(trimmedUri);
      let title = url.pathname.split('/').filter(Boolean).pop() || url.hostname;
      // Clean up the title
      title = title.replace(/[-_]/g, ' ').replace(/\.(html?|php|aspx?)$/i, '');
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
      
      return {
        type: 'website',
        title: title || url.hostname,
        url: trimmedUri,
        originalUri: trimmedUri,
      };
    } catch {
      return {
        type: 'website',
        title: trimmedUri,
        url: trimmedUri,
        originalUri: trimmedUri,
      };
    }
  }

  // Check if it's an S3 URI (document)
  if (trimmedUri.startsWith('s3://')) {
    // Extract filename from S3 path
    const parts = trimmedUri.split('/');
    const filename = parts[parts.length - 1] || 'Document';
    // Clean up filename for display
    const title = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '');
    
    return {
      type: 'document',
      title: title || 'Document',
      originalUri: trimmedUri,
    };
  }

  // Check for document extensions in the URI
  const docExtensions = ['.pdf', '.doc', '.docx', '.txt'];
  const isDocument = docExtensions.some(ext => trimmedUri.toLowerCase().endsWith(ext));
  
  if (isDocument) {
    const parts = trimmedUri.split('/');
    const filename = parts[parts.length - 1] || 'Document';
    const title = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '');
    
    return {
      type: 'document',
      title: title || 'Document',
      originalUri: trimmedUri,
    };
  }

  // Default to document type for unknown formats
  return {
    type: 'document',
    title: trimmedUri.split('/').pop() || 'Source',
    originalUri: trimmedUri,
  };
}

/**
 * Parses and deduplicates an array of source URIs
 */
function parseSources(uris: string[]): ParsedSource[] {
  const seen = new Set<string>();
  const parsed: ParsedSource[] = [];

  for (const uri of uris) {
    const source = parseSource(uri);
    if (source && !seen.has(source.originalUri)) {
      seen.add(source.originalUri);
      parsed.push(source);
    }
  }

  return parsed;
}

/**
 * CitationDisplay component renders source citations below assistant responses.
 * Website sources are displayed as clickable links, document sources as text labels.
 */
export default function CitationDisplay({ sources }: CitationDisplayProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  const parsedSources = parseSources(sources);

  if (parsedSources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 mb-2">Sources</p>
      <div className="flex flex-wrap gap-2">
        {parsedSources.map((source, index) => (
          source.type === 'website' && source.url ? (
            <a
              key={`${source.originalUri}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="max-w-[200px] truncate">{source.title}</span>
            </a>
          ) : (
            <span
              key={`${source.originalUri}-${index}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg"
            >
              <FileText className="w-3 h-3" />
              <span className="max-w-[200px] truncate">{source.title}</span>
            </span>
          )
        ))}
      </div>
    </div>
  );
}
