'use client';

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import ClozeText from '../components/ClozeText';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { createClient } from '@/lib/supabase';

interface ClozeStats {
  id: string;
  content: string;
  context: string;
  stats: {
    correctCount: number;
    incorrectCount: number;
    lastReviewed?: number;
  }
}

export interface BaseNodeData {
  label: string;
  description?: string;
  status?: 'ready' | 'active' | 'completed';
  isTestMode?: boolean;
  clozeStats?: Record<string, ClozeStats>;
  tags?: string[];
  value?: number;
  isCalculationNode?: boolean;
}

const nodeTypeStyles = {
  task: {
    icon: '🔨',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    selectedBorderClass: 'border-blue-500',
  },
  note: {
    icon: '📋',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    selectedBorderClass: 'border-yellow-500',
  },
  process: {
    icon: '🔄',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    selectedBorderClass: 'border-purple-500',
  },
  calculation: {
    icon: '🧮',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
    selectedBorderClass: 'border-teal-500',
  },
  skill: {
    icon: '🎯',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    selectedBorderClass: 'border-green-500',
  },
  technique: {
    icon: '⚡',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    selectedBorderClass: 'border-orange-500',
  },
  analytics: {
    icon: '📊',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    selectedBorderClass: 'border-indigo-500',
  },
  checklist: {
    icon: '✅',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    selectedBorderClass: 'border-green-500',
  },
};

const ResizableImage = ({ 
  src, 
  alt,
  initialWidth = 200,
  initialHeight = 200,
  onResize,
  onDelete
}: { 
  src: string; 
  alt: string;
  initialWidth?: number;
  initialHeight?: number;
  onResize?: (width: number, height: number) => void;
  onDelete?: () => void;
}) => {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [naturalSize, setNaturalSize] = useState<{ width: number, height: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const supabase = createClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Get signed URL for Supabase images
  useEffect(() => {
    const getSignedUrl = async () => {
      if (!src.startsWith('supabase://')) {
        setSignedUrl(src);
        return;
      }

      try {
        // Extract the base URL without dimensions
        const baseUrl = src.split('|')[0];
        const [bucketName, ...pathParts] = baseUrl.replace('supabase://', '').split('/');
        const filePath = pathParts.join('/');
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          return;
        }

        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error processing URL:', src, error);
      }
    };

    getSignedUrl();
  }, [src]);

  // Extract dimensions from src if present
  useEffect(() => {
    const dimensionMatch = src.match(/\|(\d+\.?\d*)x(\d+\.?\d*)/);
    if (dimensionMatch) {
      const [, width, height] = dimensionMatch;
      setSize({
        width: parseFloat(width),
        height: parseFloat(height)
      });
    }
  }, [src]);

  const handleDelete = async () => {
    if (!src.startsWith('supabase://')) {
      // For non-Supabase images, just call onDelete
      onDelete?.();
      return;
    }

    try {
      const [bucketName, ...pathParts] = src.replace('supabase://', '').split('/');
      const filePath = pathParts.join('/');
      
      // Delete from Supabase storage
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting image:', error);
        throw error;
      }

      // Call onDelete to update the node's description
      onDelete?.();
    } catch (error) {
      console.error('Error handling delete:', error);
      alert('Failed to delete image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (!signedUrl) {
    return null;
  }

  return (
    <div 
      className="my-2 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ResizableBox
        width={size.width}
        height={size.height}
        minConstraints={[100, 100]}
        maxConstraints={[500, 500]}
        lockAspectRatio={true}
        resizeHandles={['se']}
        className="nodrag nopan relative"
        handle={
          <span 
            className="react-resizable-handle react-resizable-handle-se nodrag nopan absolute bottom-0 right-0 w-6 h-6 bg-white border-2 border-blue-500 rounded-full cursor-se-resize hover:bg-blue-500 z-[100]"
            onPointerDownCapture={e => e.stopPropagation()}
          />
        }
        onResizeStop={(e, data) => {
          const newSize = {
            width: data.size.width,
            height: data.size.height
          };
          setSize(newSize);
          onResize?.(newSize.width, newSize.height);
        }}
      >
        <img 
          src={signedUrl}
          alt={alt}
          draggable={false}
          className="w-full h-full object-contain select-none rounded-lg shadow-sm"
          crossOrigin="anonymous"
        />
        {isHovered && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-opacity opacity-0 group-hover:opacity-100 z-[100]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </ResizableBox>
    </div>
  );
};

// Custom renderer for node content that handles images specially
const NodeContent = ({ 
  text, 
  isTestMode,
  onImageResize,
  onImageDelete
}: { 
  text: string; 
  isTestMode: boolean;
  onImageResize?: (originalMarkdown: string, width: number, height: number) => void;
  onImageDelete?: (originalMarkdown: string) => void;
}) => {
  // Find image markdown in the text - fixed regex without escaped backslashes
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Match both standard markdown and markdown with dimensions
        const imageMatch = part.match(/!\[(.*?)\]\((.*?)(?:\|(\d+)x(\d+))?\)/);
        if (imageMatch) {
          const [fullMatch, alt, src, width, height] = imageMatch;
          return (
            <ResizableImage 
              key={index} 
              src={src} 
              alt={alt}
              initialWidth={width ? parseInt(width) : 200}
              initialHeight={height ? parseInt(height) : 200}
              onResize={(width, height) => {
                onImageResize?.(fullMatch, width, height);
              }}
              onDelete={() => {
                onImageDelete?.(fullMatch);
              }}
            />
          );
        }
        return (
          <ClozeText 
            key={index}
            text={part} 
            isTestMode={isTestMode}
          />
        );
      })}
    </>
  );
};

const BaseNode = ({
  data,
  id,
  isConnectable,
  selected,
  type = 'task',
}: NodeProps<BaseNodeData>) => {
  const styles = nodeTypeStyles[type as keyof typeof nodeTypeStyles] || nodeTypeStyles.task;
  const { setNodes } = useReactFlow();

  const handleImageResize = useCallback((originalMarkdown: string, width: number, height: number) => {
    if (!data.description) return;
    
    // Extract the alt and src from the original markdown, handling both formats
    const match = originalMarkdown.match(/!\[(.*?)(?:\|[^]*)?\]\((.*?)(?:\|[\dx\.]*?)?\)/);
    if (!match) return;
    
    const [_, alt, src] = match;
    
    // Create new markdown with the width and height as style parameters
    const newMarkdown = `![${alt}|width=${Math.round(width)}px height=${Math.round(height)}px](${src})`;
    const newDescription = data.description.replace(originalMarkdown, newMarkdown);
    
    setNodes(nodes => 
      nodes.map(node => 
        node.id === id ? { ...node, data: { ...node.data, description: newDescription } } : node
      )
    );
  }, [data.description, id, setNodes]);

  const handleImageDelete = useCallback((originalMarkdown: string) => {
    if (!data.description) return;
    
    // Remove the image markdown from the description
    const newDescription = data.description.replace(originalMarkdown, '');
    
    setNodes(nodes => 
      nodes.map(node => 
        node.id === id ? { ...node, data: { ...node.data, description: newDescription } } : node
      )
    );
  }, [data.description, id, setNodes]);

  const statusColors = {
    ready: 'bg-yellow-100 border-yellow-400',
    active: 'bg-blue-100 border-blue-400',
    completed: 'bg-green-100 border-green-400',
    default: `${styles.bgClass} ${styles.borderClass}`,
  };

  const borderColor = selected ? styles.selectedBorderClass : styles.borderClass;
  const bgColor = data.status ? statusColors[data.status] : statusColors.default;

  return (
    <div className={`relative px-4 py-2 shadow-md rounded-md border-2 ${borderColor} ${bgColor}`}>
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
      
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />

      <div className="flex items-center space-x-2">
        <span className="text-xl">{styles.icon}</span>
        <div className="flex flex-col">
          <div className="text-sm font-bold">{data.label}</div>
          {data.description && (
            <div className="text-xs text-black whitespace-pre-wrap">
              <NodeContent 
                text={data.description} 
                isTestMode={!!data.isTestMode}
                onImageResize={handleImageResize}
                onImageDelete={handleImageDelete}
              />
            </div>
          )}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map((tag, index) => (
                <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />

      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-gray-500"
      />
    </div>
  );
};

export default memo(BaseNode); 