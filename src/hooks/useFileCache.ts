import { useState, useEffect, useCallback } from 'react';
import { fileCache, CachedFile, getFileCacheStats } from '@/lib/fileCache';

export interface UseFileCacheOptions {
  autoDownload?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (file: CachedFile) => void;
}

export interface UseFileCacheReturn {
  file: CachedFile | null;
  loading: boolean;
  error: Error | null;
  download: (url: string, filename?: string) => Promise<void>;
  refresh: () => Promise<void>;
  remove: () => void;
  stats: ReturnType<typeof getFileCacheStats>;
}

export function useFileCache(
  url: string | null,
  options: UseFileCacheOptions = {}
): UseFileCacheReturn {
  const [file, setFile] = useState<CachedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState(getFileCacheStats());

  const { autoDownload = true, onError, onSuccess } = options;

  const download = useCallback(async (downloadUrl: string, filename?: string) => {
    if (!downloadUrl) return;

    setLoading(true);
    setError(null);

    try {
      const cachedFile = await fileCache.getOrDownload(downloadUrl, filename);
      setFile(cachedFile);
      onSuccess?.(cachedFile);
      setStats(getFileCacheStats());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [onError, onSuccess]);

  const refresh = useCallback(async () => {
    if (!url) return;
    await download(url);
  }, [url, download]);

  const remove = useCallback(() => {
    if (!url) return;
    fileCache.removeFile(url);
    setFile(null);
    setStats(getFileCacheStats());
  }, [url]);

  // Auto-download when URL changes
  useEffect(() => {
    if (url && autoDownload) {
      download(url);
    }
  }, [url, autoDownload, download]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getFileCacheStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    file,
    loading,
    error,
    download,
    refresh,
    remove,
    stats
  };
}

// Hook for managing multiple files
export function useFileCacheMultiple(
  urls: string[],
  options: UseFileCacheOptions = {}
) {
  const [files, setFiles] = useState<Map<string, CachedFile>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const [stats, setStats] = useState(getFileCacheStats());

  const { autoDownload = true, onError, onSuccess } = options;

  const download = useCallback(async (url: string, filename?: string) => {
    if (!url) return;

    setLoading(prev => new Set(prev).add(url));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(url);
      return newErrors;
    });

    try {
      const cachedFile = await fileCache.getOrDownload(url, filename);
      setFiles(prev => new Map(prev).set(url, cachedFile));
      onSuccess?.(cachedFile);
      setStats(getFileCacheStats());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setErrors(prev => new Map(prev).set(url, error));
      onError?.(error);
    } finally {
      setLoading(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(url);
        return newLoading;
      });
    }
  }, [onError, onSuccess]);

  const remove = useCallback((url: string) => {
    fileCache.removeFile(url);
    setFiles(prev => {
      const newFiles = new Map(prev);
      newFiles.delete(url);
      return newFiles;
    });
    setStats(getFileCacheStats());
  }, []);

  const clearAll = useCallback(() => {
    fileCache.clear();
    setFiles(new Map());
    setErrors(new Map());
    setStats(getFileCacheStats());
  }, []);

  // Auto-download when URLs change
  useEffect(() => {
    if (autoDownload) {
      urls.forEach(url => {
        if (url && !files.has(url) && !loading.has(url)) {
          download(url);
        }
      });
    }
  }, [urls, autoDownload, files, loading, download]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getFileCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    files: Array.from(files.values()),
    filesMap: files,
    loading: Array.from(loading),
    errors: Array.from(errors.entries()),
    download,
    remove,
    clearAll,
    stats
  };
} 