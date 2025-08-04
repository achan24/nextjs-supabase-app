'use client';

import React, { useState } from 'react';
import { FileAttachment, FileAttachmentManager } from '@/components/FileAttachment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clearFileCache, getFileCacheStats } from '@/lib/fileCache';
import { FileText, Trash2 } from 'lucide-react';

export function FileAttachmentExample() {
  const [attachments, setAttachments] = useState<Array<{ url: string; filename?: string }>>([
    // Example image attachment (CORS-friendly)
    {
      url: 'https://picsum.photos/800/600',
      filename: 'sample-image.jpg'
    },
    // Example JSON file (CORS-friendly)
    {
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      filename: 'sample-data.json'
    }
  ]);

  const handleAddFile = (url: string, filename?: string) => {
    setAttachments(prev => [...prev, { url, filename }]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearCache = () => {
    clearFileCache();
    // Force re-render to show updated stats
    window.location.reload();
  };

  const stats = getFileCacheStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>File Attachments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="attachments" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="manager">File Manager</TabsTrigger>
              <TabsTrigger value="cache">Cache Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="attachments" className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                These files are cached locally and won't be re-downloaded unless refreshed or expired.
              </div>
              
              {attachments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No attachments yet. Add some files using the File Manager tab.
                </div>
              ) : (
                <div className="space-y-4">
                  {attachments.map((attachment, index) => (
                    <FileAttachment
                      key={`${attachment.url}-${index}`}
                      url={attachment.url}
                      filename={attachment.filename}
                      onRemove={() => handleRemoveFile(index)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manager" className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Add file URLs to attach them to your notes. Files will be cached locally for offline access.
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <strong>💡 Tip:</strong> Use these CORS-friendly URLs for testing:
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• <code>https://picsum.photos/800/600</code> (Random image)</li>
                  <li>• <code>https://httpbin.org/image/png</code> (Test image)</li>
                  <li>• <code>https://jsonplaceholder.typicode.com/posts/1</code> (JSON data)</li>
                </ul>
              </div>
              
              <FileAttachmentManager
                files={attachments}
                onAddFile={handleAddFile}
                onRemoveFile={handleRemoveFile}
              />
            </TabsContent>

            <TabsContent value="cache" className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Monitor your local file cache usage and manage storage.
              </div>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Files Cached</div>
                      <div className="text-2xl font-bold">{stats.fileCount}</div>
                    </div>
                    <div>
                      <div className="font-medium">Total Size</div>
                      <div className="text-2xl font-bold">
                        {(stats.totalSize / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Max Cache Size</div>
                      <div className="text-2xl font-bold">
                        {(stats.maxSize / (1024 * 1024)).toFixed(0)} MB
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Usage</div>
                      <div className="text-2xl font-bold">
                        {((stats.totalSize / stats.maxSize) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(stats.totalSize / stats.maxSize) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleClearCache}
                      className="flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All Cached Files</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 