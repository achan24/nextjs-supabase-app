export interface CachedFile {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64 encoded
  lastAccessed: number;
  createdAt: number;
  etag?: string;
  expiresAt?: number;
}

export interface FileCacheOptions {
  maxSize?: number; // in bytes
  maxAge?: number; // in milliseconds
  maxFiles?: number;
}

class FileCache {
  private cache: Map<string, CachedFile> = new Map();
  private readonly maxSize: number;
  private readonly maxAge: number;
  private readonly maxFiles: number;
  private readonly storageKey = 'obsidian_file_cache';

  constructor(options: FileCacheOptions = {}) {
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
    this.maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days default
    this.maxFiles = options.maxFiles || 100; // 100 files default
    
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(data);
        this.cleanup(); // Clean up expired files on load
      }
    } catch (error) {
      console.error('[FileCache] Error loading from storage:', error);
      this.cache.clear();
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[FileCache] Error saving to storage:', error);
      // If storage is full, try to clean up and retry
      this.cleanup();
      try {
        const data = Array.from(this.cache.entries());
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (retryError) {
        console.error('[FileCache] Failed to save even after cleanup:', retryError);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired files
    const validEntries = entries.filter(([_, file]) => {
      if (file.expiresAt && file.expiresAt < now) {
        return false;
      }
      if (file.lastAccessed + this.maxAge < now) {
        return false;
      }
      return true;
    });

    // Sort by last accessed (oldest first)
    validEntries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest files if we exceed limits
    let totalSize = 0;
    const filesToKeep: [string, CachedFile][] = [];

    for (const [id, file] of validEntries) {
      if (filesToKeep.length >= this.maxFiles) break;
      if (totalSize + file.size > this.maxSize) break;
      
      filesToKeep.push([id, file]);
      totalSize += file.size;
    }

    this.cache = new Map(filesToKeep);
    this.saveToStorage();
  }

  async getFile(url: string, options?: { forceRefresh?: boolean; etag?: string }): Promise<CachedFile | null> {
    const id = this.generateFileId(url);
    const cached = this.cache.get(id);

    if (!options?.forceRefresh && cached) {
      // Check if file is still valid
      const now = Date.now();
      if (cached.expiresAt && cached.expiresAt < now) {
        this.cache.delete(id);
        this.saveToStorage();
      } else if (cached.lastAccessed + this.maxAge < now) {
        this.cache.delete(id);
        this.saveToStorage();
      } else {
        // Update last accessed time
        cached.lastAccessed = now;
        this.saveToStorage();
        return cached;
      }
    }

    return null;
  }

  async downloadAndCache(url: string, filename?: string): Promise<CachedFile> {
    const id = this.generateFileId(url);
    
    try {
      console.log('[FileCache] Downloading file:', url);
      
      let response: Response;
      
      try {
        // First try direct fetch
        response = await fetch(url);
      } catch (error) {
        console.log('[FileCache] Direct fetch failed, trying local proxy...');
        // If direct fetch fails due to CORS, try with local proxy
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = this.arrayBufferToBase64(arrayBuffer);
      
      const file: CachedFile = {
        id,
        url,
        filename: filename || this.extractFilename(url, response),
        mimeType: response.headers.get('content-type') || 'application/octet-stream',
        size: arrayBuffer.byteLength,
        data: base64,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
        etag: response.headers.get('etag') || undefined,
        expiresAt: this.calculateExpiry(response.headers.get('cache-control'))
      };

      // Check if we have space for this file
      if (file.size > this.maxSize) {
        throw new Error(`File too large: ${file.size} bytes (max: ${this.maxSize} bytes)`);
      }

      // Clean up before adding new file
      this.cleanup();

      // Add file to cache
      this.cache.set(id, file);
      this.saveToStorage();

      console.log('[FileCache] Successfully cached file:', filename || url);
      return file;

    } catch (error) {
      console.error('[FileCache] Error downloading file:', error);
      throw error;
    }
  }

  async getOrDownload(url: string, filename?: string): Promise<CachedFile> {
    // Try to get from cache first
    const cached = await this.getFile(url);
    if (cached) {
      console.log('[FileCache] Serving from cache:', cached.filename);
      return cached;
    }

    // Download if not cached
    return this.downloadAndCache(url, filename);
  }

  getFileAsBlob(file: CachedFile): Blob {
    const binaryString = atob(file.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: file.mimeType });
  }

  getFileAsDataURL(file: CachedFile): string {
    return `data:${file.mimeType};base64,${file.data}`;
  }

  removeFile(url: string): boolean {
    const id = this.generateFileId(url);
    const removed = this.cache.delete(id);
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.storageKey);
  }

  getStats(): { fileCount: number; totalSize: number; maxSize: number } {
    let totalSize = 0;
    const files = Array.from(this.cache.values());
    for (const file of files) {
      totalSize += file.size;
    }
    
    return {
      fileCount: this.cache.size,
      totalSize,
      maxSize: this.maxSize
    };
  }

  private generateFileId(url: string): string {
    // Create a hash of the URL to use as cache key
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private extractFilename(url: string, response: Response): string {
    // Try to get filename from Content-Disposition header
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch) {
        return filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Extract from URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      return lastPart;
    }

    // Fallback
    return 'unknown-file';
  }

  private calculateExpiry(cacheControl: string | null): number | undefined {
    if (!cacheControl) return undefined;
    
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1]) * 1000; // Convert to milliseconds
      return Date.now() + maxAge;
    }
    
    return undefined;
  }
}

// Create a singleton instance
export const fileCache = new FileCache();

// Export utility functions
export const getFileFromCache = (url: string) => fileCache.getFile(url);
export const downloadAndCacheFile = (url: string, filename?: string) => fileCache.downloadAndCache(url, filename);
export const getOrDownloadFile = (url: string, filename?: string) => fileCache.getOrDownload(url, filename);
export const removeFileFromCache = (url: string) => fileCache.removeFile(url);
export const clearFileCache = () => fileCache.clear();
export const getFileCacheStats = () => fileCache.getStats(); 