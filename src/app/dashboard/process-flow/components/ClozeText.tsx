'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface ClozeTextProps {
  text: string;
  isTestMode: boolean;
  onReveal?: (word: string) => void;
}

function parseInlineMarkup(text: string): { type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'h1' | 'h2' | 'h3' | 'image', content: string, url?: string, style?: Record<string, string> }[] {
  const parts: { type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'h1' | 'h2' | 'h3' | 'image', content: string, url?: string, style?: Record<string, string> }[] = [];
  let currentText = '';
  let i = 0;
  while (i < text.length) {
    // Handle images first (since they also start with !)
    if (text.slice(i, i + 2) === '![') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endBracket = text.indexOf(']', i);
      if (endBracket === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      const startParen = text.indexOf('(', endBracket);
      const endParen = text.indexOf(')', startParen);
      if (startParen === -1 || endParen === -1) {
        currentText += text[i];
        i++;
        continue;
      }

      // Parse image parameters from alt text (e.g., "alt text|width=400px height=auto")
      const altText = text.slice(i + 2, endBracket);
      console.log('Parsing image markdown. Full text:', text);
      console.log('Alt text with params:', altText);
      const [content, ...params] = altText.split('|');
      const style: Record<string, string> = {};
      
      if (params.length > 0) {
        console.log('Raw params:', params[0]); // Debug log
        const paramPairs = params[0].split(' ');
        console.log('Param pairs:', paramPairs);
        paramPairs.forEach(param => {
          const [key, value] = param.split('=');
          console.log('Processing param:', { key, value });
          if (key && value) {
            // Remove any quotes from the value
            const cleanValue = value.replace(/['"]/g, '');
            // For width and height, ensure we keep the units
            if (key === 'width' || key === 'height') {
              style[key] = cleanValue;
              console.log('Added style:', key, cleanValue);
            }
          }
        });
      }

      console.log('Final style object:', style);
      parts.push({
        type: 'image',
        content,
        url: text.slice(startParen + 1, endParen),
        style
      });
      i = endParen + 1;
      continue;
    }
    // Handle heading tags
    if (text.slice(i, i + 4) === '<h1>') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('</h1>', i);
      if (endIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({ type: 'h1', content: text.slice(i + 4, endIndex) });
      i = endIndex + 5;
      continue;
    }
    if (text.slice(i, i + 4) === '<h2>') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('</h2>', i);
      if (endIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({ type: 'h2', content: text.slice(i + 4, endIndex) });
      i = endIndex + 5;
      continue;
    }
    if (text.slice(i, i + 4) === '<h3>') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('</h3>', i);
      if (endIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({ type: 'h3', content: text.slice(i + 4, endIndex) });
      i = endIndex + 5;
      continue;
    }
    // Handle cloze deletions first
    if (text.slice(i, i + 2) === '{{') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('}}', i);
      if (endIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({ type: 'text', content: text.slice(i, endIndex + 2) });
      i = endIndex + 2;
      continue;
    }
    // Handle bold
    if (text.slice(i, i + 2) === '**') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('**', i + 2);
      if (endIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({ type: 'bold', content: text.slice(i + 2, endIndex) });
      i = endIndex + 2;
      continue;
    }
    // Handle italic
    if (text.slice(i, i + 1) === '*') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('*', i + 1);
      if (endIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({ type: 'italic', content: text.slice(i + 1, endIndex) });
      i = endIndex + 1;
      continue;
    }
    // Handle code
    if (text.slice(i, i + 1) === '`') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('`', i + 1);
      if (endIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({ type: 'code', content: text.slice(i + 1, endIndex) });
      i = endIndex + 1;
      continue;
    }
    // Handle links
    if (text.slice(i, i + 1) === '[') {
      if (currentText) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      const endBracket = text.indexOf(']', i);
      if (endBracket === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      const startParen = text.indexOf('(', endBracket);
      const endParen = text.indexOf(')', startParen);
      if (startParen === -1 || endParen === -1) {
        currentText += text[i];
        i++;
        continue;
      }
      parts.push({
        type: 'link',
        content: text.slice(i + 1, endBracket),
        url: text.slice(startParen + 1, endParen)
      });
      i = endParen + 1;
      continue;
    }
    currentText += text[i];
    i++;
  }
  if (currentText) {
    parts.push({ type: 'text', content: currentText });
  }
  return parts;
}

function parseMarkup(text: string): { type: 'ul' | 'line', content: string }[] {
  const lines = text.split(/\r?\n/);
  const blocks: { type: 'ul' | 'line', content: string | string[] }[] = [];
  let listItems: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*[-*] /.test(line)) {
      listItems.push(line.replace(/^\s*[-*] /, ''));
    } else {
      if (listItems.length > 0) {
        blocks.push({ type: 'ul', content: listItems });
        listItems = [];
      }
      // Always add the line, even if it's empty
      blocks.push({ type: 'line', content: line });
    }
  }
  if (listItems.length > 0) {
    blocks.push({ type: 'ul', content: listItems });
  }
  return blocks as { type: 'ul' | 'line', content: string }[];
}

export default function ClozeText({ text, isTestMode, onReveal }: ClozeTextProps) {
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const supabase = createClient();

  useEffect(() => {
    // Find all image URLs in the text
    const imageUrls = parseInlineMarkup(text)
      .filter(part => part.type === 'image')
      .map(part => part.url)
      .filter((url): url is string => !!url);

    // Create signed URLs for all images
    const refreshSignedUrls = async () => {
      const newSignedUrls = new Map<string, string>();
      
      for (const url of imageUrls) {
        try {
          // Skip if not a Supabase URL
          if (!url.includes('supabase') && !url.startsWith('supabase://')) {
            newSignedUrls.set(url, url);
            continue;
          }

          // If it's already a signed URL with a token, keep using it
          if (url.includes('token=')) {
            newSignedUrls.set(url, url);
            continue;
          }

          let bucketName: string;
          let filePath: string;

          // Handle old public URLs
          const publicUrlMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
          if (publicUrlMatch) {
            [, bucketName, filePath] = publicUrlMatch;
          } else {
            // Handle new custom format (supabase://bucket-name/path)
            const customMatch = url.match(/^supabase:\/\/([^/]+)\/(.+)$/);
            if (!customMatch) {
              console.error('Unrecognized URL format:', url);
              continue;
            }
            [, bucketName, filePath] = customMatch;
          }

          console.log('Creating signed URL:', { bucketName, filePath });

          // Create signed URL with retry
          let retryCount = 0;
          let signedUrl: string | null = null;
          
          while (retryCount < 3 && !signedUrl) {
            try {
              const { data, error } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

              if (error) {
                console.error('Error creating signed URL:', error);
                retryCount++;
                if (retryCount < 3) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                  continue;
                }
                break;
              }

              signedUrl = data.signedUrl;
            } catch (error) {
              console.error('Error in createSignedUrl:', error);
              retryCount++;
              if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                continue;
              }
              break;
            }
          }

          if (signedUrl) {
            // Verify the URL is accessible
            try {
              const response = await fetch(signedUrl, { method: 'HEAD' });
              if (response.ok) {
                newSignedUrls.set(url, signedUrl);
              } else {
                console.error('URL verification failed:', response.status);
              }
            } catch (error) {
              console.error('URL verification error:', error);
            }
          }
        } catch (error) {
          console.error('Error processing URL:', url, error);
        }
      }

      setSignedUrls(newSignedUrls);
    };

    refreshSignedUrls();
  }, [text]);

  const getImageUrl = (originalUrl: string) => {
    const signedUrl = signedUrls.get(originalUrl);
    if (signedUrl) {
      return signedUrl;
    }
    return originalUrl;
  };

  const toggleReveal = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();  // Prevent event from bubbling up
    if (isTestMode) {
      const newRevealed = new Set(revealedWords);
      if (newRevealed.has(word)) {
        newRevealed.delete(word);
      } else {
        newRevealed.add(word);
        onReveal?.(word);
      }
      setRevealedWords(newRevealed);
    }
  };

  const handleImageError = (url: string) => {
    setImageErrors(prev => new Set(prev).add(url));
  };

  const renderPart = (part: any, index: number) => {
    if (part.type === 'ul') {
      return (
        <ul key={index} className="list-disc pl-6">
          {(part.content as string[]).map((item, i) => (
            <li key={i}>{parseInlineMarkup(item).map((p, j) => renderInlinePart(p, `${i}-${j}`))}</li>
          ))}
        </ul>
      );
    }
    if (part.type === 'line') {
      return (
        <div key={index} className="min-h-[1.2em]">
          {parseInlineMarkup(part.content).map((p, i) => renderInlinePart(p, `${index}-${i}`))}
        </div>
      );
    }
    return renderInlinePart(part, index);
  };

  const renderInlinePart = (part: any, index: number | string) => {
    switch (part.type) {
      case 'image':
        const imageUrl = part.url ? getImageUrl(part.url) : '';
        
        return imageErrors.has(imageUrl) ? (
          <span key={index} className="text-red-500">[Failed to load image]</span>
        ) : (
          <ResizableBox
            key={index}
            width={200}
            height={200}
            minConstraints={[100, 100]}
            maxConstraints={[500, 500]}
            lockAspectRatio={true}
            resizeHandles={['se']}
            className="relative"
          >
            <img 
              src={imageUrl}
              alt={part.content}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              className="rounded-lg shadow-sm"
              onError={() => {
                console.error('Image failed to load:', imageUrl);
                handleImageError(imageUrl);
              }}
              crossOrigin="anonymous"
            />
          </ResizableBox>
        );
      case 'text':
      const textContent = typeof part.content === 'string' ? part.content : '';
      const clozeParts = textContent.split(/(\{\{.*?\}\})/g);
      return (
        <span key={index}>
          {clozeParts.map((clozePart: string, clozeIndex: number) => {
            if (clozePart.startsWith('{{') && clozePart.endsWith('}}')) {
              const word = clozePart.slice(2, -2);
              const isRevealed = revealedWords.has(word);
              if (isTestMode && !isRevealed) {
                return (
                  <span
                    key={`${index}-${clozeIndex}`}
                    onClick={(e) => toggleReveal(word, e)}
                    className="inline-block px-1 mx-0.5 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
                  >
                    {'_'.repeat(word.length)}
                  </span>
                );
              }
              return (
                <span
                  key={`${index}-${clozeIndex}`}
                  onClick={(e) => toggleReveal(word, e)}
                  className={`inline-block px-1 mx-0.5 rounded cursor-pointer ${
                    isTestMode ? 'bg-green-100 hover:bg-green-200' : ''
                  }`}
                >
                  {word}
                </span>
              );
            }
            return <span key={`${index}-${clozeIndex}`}>{clozePart}</span>;
          })}
        </span>
      );
      case 'bold':
        return <strong key={index}>{renderInlinePart({ type: 'text', content: part.content }, `${index}-bold`)}</strong>;
      case 'italic':
        return <em key={index}>{renderInlinePart({ type: 'text', content: part.content }, `${index}-italic`)}</em>;
      case 'code':
      return <code key={index} className="bg-gray-100 px-1 rounded">{part.content}</code>;
      case 'link':
      return (
        <a
          key={index}
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
            {renderInlinePart({ type: 'text', content: part.content }, `${index}-link`)}
        </a>
      );
      case 'h1':
        return <h1 key={index} className="text-3xl font-bold">{renderInlinePart({ type: 'text', content: part.content }, `${index}-h1`)}</h1>;
      case 'h2':
        return <h2 key={index} className="text-2xl font-bold">{renderInlinePart({ type: 'text', content: part.content }, `${index}-h2`)}</h2>;
      case 'h3':
        return <h3 key={index} className="text-xl font-bold">{renderInlinePart({ type: 'text', content: part.content }, `${index}-h3`)}</h3>;
      default:
    return null;
    }
  };

  const blocks = parseMarkup(text);
  return (
    <>
      <style>
        {`
          .react-resizable-handle {
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 12px;
            height: 12px;
            background: white;
            border: 2px solid #4299e1;
            border-radius: 50%;
            cursor: se-resize;
            z-index: 10;
          }
          .react-resizable-handle:hover {
            background: #4299e1;
          }
        `}
      </style>
      <div className="whitespace-pre-wrap">{blocks.map((block, i) => renderPart(block, i))}</div>
    </>
  );
} 