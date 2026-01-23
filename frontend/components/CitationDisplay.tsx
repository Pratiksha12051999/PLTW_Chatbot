'use client';

import { ExternalLink } from 'lucide-react';

/**
 * Parsed website source structure for display
 */
interface ParsedSource {
  title: string;
  url: string;
}

interface CitationDisplayProps {
  sources?: string[];
}

/**
 * Parses a raw source URI into a displayable format
 * Only returns website URLs (http/https), filters out documents and S3 URIs
 */
function parseSource(uri: string): ParsedSource | null {
  if (!uri || typeof uri !== 'string') {
    return null;
  }

  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    return null;
  }

  // Only process web URLs (http/https) - filter out everything else
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
        title: title || url.hostname,
        url: trimmedUri,
      };
    } catch {
      return {
        title: trimmedUri,
        url: trimmedUri,
      };
    }
  }

  // Return null for S3 URIs, documents, and any other non-website sources
  return null;
}

/**
 * Normalizes a URL for deduplication by removing trailing slashes,
 * query parameters, and fragments
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove query params and fragments, normalize path
    let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    // Remove trailing slash unless it's the root
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Parses and deduplicates an array of source URIs
 * Only returns website sources, filters out documents
 * Normalizes URLs to prevent duplicates with slight variations
 */
function parseSources(uris: string[]): ParsedSource[] {
  const seen = new Set<string>();
  const parsed: ParsedSource[] = [];

  for (const uri of uris) {
    const source = parseSource(uri);
    if (source) {
      const normalizedUrl = normalizeUrl(source.url);
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        parsed.push(source);
      }
    }
  }

  return parsed;
}

/**
 * CitationDisplay component renders source citations below assistant responses.
 * Only displays website sources as clickable links.
 * Document sources from the knowledge base are filtered out.
 */
export default function CitationDisplay({ sources }: CitationDisplayProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  const parsedSources = parseSources(sources);

  // Don't render anything if no website sources
  if (parsedSources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 mb-2">Sources</p>
      <div className="flex flex-wrap gap-2">
        {parsedSources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="max-w-[200px] truncate">{source.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
