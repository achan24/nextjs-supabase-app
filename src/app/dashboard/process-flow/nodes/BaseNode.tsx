'use client';

import { memo, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
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
  description?: string | ReactNode;
  status?: 'ready' | 'active' | 'completed';
  isTestMode?: boolean;
  clozeStats?: Record<string, ClozeStats>;
  tags?: string[];
  value?: number;
  isCalculationNode?: boolean;
  isExpanded?: boolean; // Track if child nodes are visible
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
  attachment: {
    icon: '📎',
    bgClass: 'bg-pink-50',
    borderClass: 'border-pink-200',
    selectedBorderClass: 'border-pink-500',
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
  const imageRef = useRef<HTMLImageElement>(null);

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

  // Get natural image size on load
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setNaturalSize({ width: naturalWidth, height: naturalHeight });
      
      // If no size has been set yet, use the natural size (maintaining aspect ratio)
      if (!size.width || !size.height) {
        const maxInitialWidth = 500;
        let newWidth = naturalWidth;
        let newHeight = naturalHeight;
        
        if (naturalWidth > maxInitialWidth) {
          const scale = maxInitialWidth / naturalWidth;
          newWidth = maxInitialWidth;
          newHeight = naturalHeight * scale;
        }
        
        setSize({ width: newWidth, height: newHeight });
        onResize?.(newWidth, newHeight);
      }
    }
  };

  // Extract dimensions from src if present
  useEffect(() => {
    const dimensionMatch = src.match(/\|(\d+\.?\d*)x(\d+\.?\d*)/);
    if (dimensionMatch) {
      const [, width, height] = dimensionMatch;
      const newWidth = parseFloat(width);
      const newHeight = parseFloat(height);
      setSize({
        width: newWidth,
        height: newHeight
      });
    }
  }, [src]);

  if (!signedUrl) {
    return null;
  }

  const handleResize = (e: any, { size: { width } }: { size: { width: number } }) => {
    if (naturalSize) {
      const aspectRatio = naturalSize.width / naturalSize.height;
      const height = width / aspectRatio;
      setSize({ width, height });
      onResize?.(width, height);
    }
  };

  return (
      <ResizableBox
        width={size.width}
        height={size.height}
      minConstraints={[50, 50]}
      maxConstraints={[naturalSize ? Math.max(naturalSize.width, 1000) : 1000, naturalSize ? Math.max(naturalSize.height, 1000) : 1000]}
        lockAspectRatio={true}
        resizeHandles={['se']}
      className="nodrag nopan group relative"
      style={{ width: size.width, height: size.height, padding: 0, background: 'none', border: 'none' }}
        handle={
          <span 
            className="react-resizable-handle react-resizable-handle-se nodrag nopan absolute bottom-0 right-0 w-6 h-6 bg-white border-2 border-blue-500 rounded-full cursor-se-resize hover:bg-blue-500 z-[100]"
            onPointerDownCapture={e => e.stopPropagation()}
          />
        }
      onResize={handleResize}
      >
        <img 
        ref={imageRef}
          src={signedUrl}
          alt={alt}
          draggable={false}
        onLoad={handleImageLoad}
        className="w-full h-full object-fill select-none rounded-lg shadow-sm"
          crossOrigin="anonymous"
        style={{ display: 'block', width: '100%', height: '100%' }}
        />
          <button
        onClick={onDelete}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-opacity opacity-0 group-hover:opacity-100 z-[100]"
        style={{ top: 8, right: 8 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
      </ResizableBox>
  );
};

// Custom renderer for node content that handles images specially
const NodeContent = ({ 
  text, 
  isTestMode,
  onImageResize,
  onImageDelete
}: { 
  text: string | ReactNode; 
  isTestMode: boolean;
  onImageResize?: (originalMarkdown: string, width: number, height: number) => void;
  onImageDelete?: (originalMarkdown: string) => void;
}) => {
  // If text is a ReactNode, render it directly
  if (typeof text !== 'string') {
    return <div className="text-sm">{text}</div>;
  }

  // Handle string content with markdown and images
  const [content, setContent] = useState(text);
  
  useEffect(() => {
    setContent(text);
  }, [text]);

  const handleImageResize = useCallback((originalMarkdown: string, width: number, height: number) => {
    onImageResize?.(originalMarkdown, width, height);
  }, [onImageResize]);

  const handleImageDelete = useCallback((originalMarkdown: string) => {
    onImageDelete?.(originalMarkdown);
  }, [onImageDelete]);

  // Extract image markdown and replace with custom component
  const parts = content.split(/(!?\[.*?\]\(.*?\))/);
  
  return (
    <div className="text-sm">
      {parts.map((part, index) => {
        if (part.match(/^!\[.*?\]\(.*?\)$/)) {
          const alt = part.match(/\[(.*?)\]/)?.[1] || '';
          const src = part.match(/\((.*?)\)/)?.[1] || '';
          
          return (
            <ResizableImage
              key={index}
              src={src}
              alt={alt}
              onResize={(width, height) => handleImageResize(part, width, height)}
              onDelete={() => handleImageDelete(part)}
            />
          );
        }
        
        if (isTestMode && part.match(/\[.*?\]\(.*?\)/)) {
          return <ClozeText key={index} text={part} isTestMode={isTestMode} />;
        }
        
        return <span key={index}>{part}</span>;
      })}
    </div>
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
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(data.description || '');
  const [editedLabel, setEditedLabel] = useState(data.label || '');
  const [showHandles, setShowHandles] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 200, height: 'auto' });
  const nodeRef = useRef<HTMLDivElement>(null);

  // Get all child nodes recursively
  const getChildNodes = useCallback((nodeId: string, visited = new Set<string>()): string[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    
    const edges = getEdges();
    const childIds = edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);
    
    const allChildren = [...childIds];
    childIds.forEach(childId => {
      allChildren.push(...getChildNodes(childId, visited));
    });
    
    return allChildren;
  }, [getEdges]);

  // Toggle expansion state
  const toggleExpand = useCallback(() => {
    const isCurrentlyExpanded = data.isExpanded ?? true;
    const childNodeIds = getChildNodes(id);
    
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            isExpanded: !isCurrentlyExpanded
          }
        };
      }
      if (childNodeIds.includes(node.id)) {
        return {
          ...node,
          hidden: isCurrentlyExpanded
        };
      }
      return node;
    }));
  }, [id, data.isExpanded, getChildNodes, setNodes]);

  // Only apply string operations if description is a string
  const handleImageResize = useCallback((originalMarkdown: string, width: number, height: number) => {
    if (typeof data.description === 'string') {
      const newDescription = data.description.replace(
        originalMarkdown,
        originalMarkdown.replace(/\)$/, `|${width}x${height})`)
      );
      setEditedDescription(newDescription);
    }
  }, [data.description]);

  const handleImageDelete = useCallback((originalMarkdown: string) => {
    if (typeof data.description === 'string') {
      const newDescription = data.description.replace(originalMarkdown, '');
      setEditedDescription(newDescription);
    }
  }, [data.description]);

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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{styles.icon}</span>
          <div className="flex flex-col">
            <div className="text-sm font-bold">{data.label}</div>
          </div>
        </div>
        {getEdges().some(edge => edge.source === id) && (
          <button
            onClick={toggleExpand}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
            title={data.isExpanded ? "Collapse child nodes" : "Expand child nodes"}
          >
            {data.isExpanded ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 9L12 15L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="mt-2">
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