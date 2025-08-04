'use client';

import React, { useState } from 'react';
import { useFileCache } from '@/hooks/useFileCache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  Trash2, 
  RefreshCw,
  ExternalLink,
  HardDrive
} from 'lucide-react';

interface FileAttachmentProps {
  url: string;
  filename?: string;
  onRemove?: () => void;
  showPreview?: boolean;
  className?: string;
}

export function FileAttachment({ 
  url, 
  filename, 
  onRemove, 
  showPreview = true,
  className = '' 
}: FileAttachmentProps) {
  const { file, loading, error, download, refresh, remove, stats } = useFileCache(url, {
    onError: (error) => {
      console.error('[FileAttachment] Error loading file:', error);
    }
  });

  const [showStats, setShowStats] = useState(false);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="w-4 h-4" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="w-4 h-4" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="w-4 h-4" />;
    if (mimeType === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRemove = () => {
    remove();
    onRemove?.();
  };

  const renderPreview = () => {
    if (!file || !showPreview) return null;

    if (file.mimeType.startsWith('image/')) {
      return (
        <div className="mt-2">
          <img 
            src={file.data ? `data:${file.mimeType};base64,${file.data}` : url}
            alt={file.filename}
            className="max-w-full h-auto rounded border"
            style={{ maxHeight: '200px' }}
          />
        </div>
      );
    }

    if (file.mimeType === 'application/pdf') {
      return (
        <div className="mt-2">
          <iframe
            src={file.data ? `data:${file.mimeType};base64,${file.data}` : url}
            title={file.filename}
            className="w-full border rounded"
            style={{ height: '300px' }}
          />
        </div>
      );
    }

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded border">
        <p className="text-sm text-gray-600">
          Preview not available for this file type.
        </p>
      </div>
    );
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {file ? getFileIcon(file.mimeType) : <FileText className="w-4 h-4" />}
            <CardTitle className="text-sm font-medium">
              {file?.filename || filename || 'Loading...'}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-1">
            {file && (
              <Badge variant="secondary" className="text-xs">
                {formatFileSize(file.size)}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="h-6 w-6 p-0"
            >
              <HardDrive className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Downloading...</span>
              <span>{formatFileSize(stats.totalSize)} / {formatFileSize(stats.maxSize)}</span>
            </div>
            <Progress value={(stats.totalSize / stats.maxSize) * 100} className="h-1" />
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm mb-2">
            Error: {error.message}
          </div>
        )}

        {showStats && (
          <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>Files cached: {stats.fileCount}</div>
              <div>Total size: {formatFileSize(stats.totalSize)}</div>
              <div>Max size: {formatFileSize(stats.maxSize)}</div>
              <div>Usage: {((stats.totalSize / stats.maxSize) * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {!file && !loading && (
            <Button
              size="sm"
              onClick={() => download(url, filename)}
              disabled={loading}
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          )}

          {file && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="destructive"
            onClick={handleRemove}
            disabled={loading}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remove
          </Button>
        </div>

        {renderPreview()}
      </CardContent>
    </Card>
  );
}

// Component for managing multiple file attachments
export function FileAttachmentManager({ 
  files, 
  onAddFile, 
  onRemoveFile 
}: {
  files: Array<{ url: string; filename?: string }>;
  onAddFile: (url: string, filename?: string) => void;
  onRemoveFile: (index: number) => void;
}) {
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');

  const handleAddFile = () => {
    if (newFileUrl.trim()) {
      onAddFile(newFileUrl.trim(), newFileName.trim() || undefined);
      setNewFileUrl('');
      setNewFileName('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <input
          type="url"
          placeholder="File URL"
          value={newFileUrl}
          onChange={(e) => setNewFileUrl(e.target.value)}
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <input
          type="text"
          placeholder="Filename (optional)"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          className="w-32 px-3 py-2 border rounded text-sm"
        />
        <Button onClick={handleAddFile} disabled={!newFileUrl.trim()}>
          Add File
        </Button>
      </div>

      <div className="space-y-2">
        {files.map((file, index) => (
          <FileAttachment
            key={`${file.url}-${index}`}
            url={file.url}
            filename={file.filename}
            onRemove={() => onRemoveFile(index)}
          />
        ))}
      </div>
    </div>
  );
} 