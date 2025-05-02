'use client';

import { useState } from 'react';

interface ClozeTextProps {
  text: string;
  isTestMode: boolean;
  onReveal?: (word: string) => void;
}

export default function ClozeText({ text, isTestMode, onReveal }: ClozeTextProps) {
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());

  const toggleReveal = (word: string) => {
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

  // Split text into parts: regular text and cloze deletions
  const parts = text.split(/(\{\{.*?\}\})/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const word = part.slice(2, -2);
          const isRevealed = revealedWords.has(word);
          
          if (isTestMode && !isRevealed) {
            return (
              <span
                key={index}
                onClick={() => toggleReveal(word)}
                className="inline-block px-1 mx-0.5 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
              >
                {'_'.repeat(word.length)}
              </span>
            );
          }
          
          return (
            <span
              key={index}
              onClick={() => toggleReveal(word)}
              className={`inline-block px-1 mx-0.5 rounded cursor-pointer ${
                isTestMode ? 'bg-green-100 hover:bg-green-200' : ''
              }`}
            >
              {word}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
} 