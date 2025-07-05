'use client';

import { memo, useState, ReactNode } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';
import { DocumentViewer } from '@/components/ui/document-viewer';
import dynamic from 'next/dynamic';

const PDFInlineViewer = dynamic(() => import('@/components/ui/pdf-inline-viewer').then(mod => mod.PDFInlineViewer), { ssr: false });

export interface AttachmentNodeData extends Omit<BaseNodeData, 'description'> {
  description?: ReactNode;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

const AttachmentNode = (props: NodeProps<AttachmentNodeData>) => {
  const { data, ...rest } = props;
  const attachments = data.attachments || [];
  const [selectedFile, setSelectedFile] = useState<{name: string; url: string; type: string} | null>(null);
  
  // Render inline previews for PDFs and images
  const description = attachments.length > 0
    ? attachments.map(att => {
        if (att.type === 'application/pdf') {
          return (
            <div key={att.name} className="my-2">
              <PDFInlineViewer url={att.url} height={200} />
              <div className="text-xs text-center text-gray-500 mt-1">{att.name}</div>
            </div>
          );
        }
        if (att.type.startsWith('image/')) {
          return (
            <div key={att.name} className="my-2">
              <img src={att.url} alt={att.name} className="max-w-full max-h-40 mx-auto" />
              <div className="text-xs text-center text-gray-500 mt-1">{att.name}</div>
            </div>
          );
        }
        // For other types, show a clickable icon
        return (
          <div 
            key={att.name}
            className="flex items-center cursor-pointer hover:text-pink-500"
            onClick={e => {
              e.stopPropagation();
              setSelectedFile(att);
            }}
          >
            📎 {att.name}
          </div>
        );
      })
    : 'No attachments';

  return (
    <>
      <BaseNode
        {...rest}
        type="attachment"
        data={{
          ...data,
          description,
        }}
      />
      {selectedFile && (
        <DocumentViewer
          url={selectedFile.url}
          type={selectedFile.type}
          name={selectedFile.name}
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </>
  );
};

export default memo(AttachmentNode); 