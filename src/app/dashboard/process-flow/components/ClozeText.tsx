'use client';

import { useState } from 'react';

interface ClozeTextProps {
  text: string;
  isTestMode: boolean;
  onReveal?: (word: string) => void;
}

function parseInlineMarkup(text: string): { type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'h1' | 'h2' | 'h3', content: string, url?: string }[] {
  const parts: { type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'h1' | 'h2' | 'h3', content: string, url?: string }[] = [];
  let currentText = '';
  let i = 0;
  while (i < text.length) {
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

  const renderPart = (part: any, index: number) => {
    if (part.type === 'ul') {
      return (
        <ul key={index} className="list-disc pl-6">
          {(part.content as string[]).map((item, i) => (
            <li key={i}>{parseInlineMarkup(item).map(renderPart)}</li>
          ))}
        </ul>
      );
    }
    if (part.type === 'line') {
      return (
        <div key={index} className="min-h-[1.2em]">{parseInlineMarkup(part.content).map(renderPart)}</div>
      );
    }
    // Inline markup rendering (same as before)
    if (part.type === 'text') {
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
    }
    if (part.type === 'h1') {
      return <h1 key={index} className="text-3xl font-bold">{renderPart({ type: 'text', content: part.content }, index)}</h1>;
    }
    if (part.type === 'h2') {
      return <h2 key={index} className="text-2xl font-bold">{renderPart({ type: 'text', content: part.content }, index)}</h2>;
    }
    if (part.type === 'h3') {
      return <h3 key={index} className="text-xl font-bold">{renderPart({ type: 'text', content: part.content }, index)}</h3>;
    }
    if (part.type === 'bold') {
      return <strong key={index}>{renderPart({ type: 'text', content: part.content }, index)}</strong>;
    }
    if (part.type === 'italic') {
      return <em key={index}>{renderPart({ type: 'text', content: part.content }, index)}</em>;
    }
    if (part.type === 'code') {
      return <code key={index} className="bg-gray-100 px-1 rounded">{part.content}</code>;
    }
    if (part.type === 'link') {
      return (
        <a
          key={index}
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {renderPart({ type: 'text', content: part.content }, index)}
        </a>
      );
    }
    return null;
  };

  const blocks = parseMarkup(text);
  return <span>{blocks.map(renderPart)}</span>;
} 