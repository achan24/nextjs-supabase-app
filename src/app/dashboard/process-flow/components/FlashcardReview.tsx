'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface FlashcardReviewProps {
  node: Node;
  updateNode: (nodeId: string, data: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function FlashcardReview({ node, updateNode, isOpen, onClose }: FlashcardReviewProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [flashcards, setFlashcards] = useState<ClozeStats[]>([]);
  const [sessionStats, setSessionStats] = useState<{correct: number, incorrect: number}>({ correct: 0, incorrect: 0 });
  const [isFinished, setIsFinished] = useState(false);

  // Extract clozes and their context from the description
  useEffect(() => {
    if (!node.data.description) return;

    const clozeRegex = /\{\{(.*?)\}\}/g;
    const matches = [...node.data.description.matchAll(clozeRegex)];
    
    const cards = matches.map((match) => {
      const content = match[1];
      const matchStart = match.index || 0;
      const matchEnd = matchStart + match[0].length;
      
      // Get context with preserved whitespace
      // Find the start of the line containing the cloze
      let contextStart = matchStart;
      while (contextStart > 0 && node.data.description[contextStart - 1] !== '\n') {
        contextStart--;
      }
      
      // Find the end of the line containing the cloze
      let contextEnd = matchEnd;
      while (contextEnd < node.data.description.length && node.data.description[contextEnd] !== '\n') {
        contextEnd++;
      }
      
      // Get just one line before and after for context
      let beforeLines = '';
      let currentPos = contextStart;
      let lineCount = 0;
      while (currentPos > 0 && lineCount < 1) {
        currentPos--;
        if (node.data.description[currentPos] === '\n') {
          lineCount++;
        }
      }
      if (currentPos > 0) {
        beforeLines = node.data.description.slice(currentPos + 1, contextStart);
      }
      
      let afterLines = '';
      currentPos = contextEnd;
      lineCount = 0;
      while (currentPos < node.data.description.length && lineCount < 1) {
        if (node.data.description[currentPos] === '\n') {
          lineCount++;
        }
        currentPos++;
      }
      afterLines = node.data.description.slice(contextEnd, currentPos);

      // Generate a stable ID based on content and position
      const id = `cloze-${content}-${matchStart}`;
      
      // Get existing stats or create new ones
      const existingStats = node.data.clozeStats?.[id];
      
      return {
        id,
        content,
        context: beforeLines + node.data.description.slice(contextStart, contextEnd) + afterLines,
        stats: existingStats?.stats || {
          correctCount: 0,
          incorrectCount: 0
        }
      };
    });

    setFlashcards(cards);
    setCurrentCardIndex(0);
    setIsRevealed(false);
    setSessionStats({ correct: 0, incorrect: 0 });
    setIsFinished(false);
  }, [node.data.description]);

  const handleAnswer = (correct: boolean) => {
    const currentCard = flashcards[currentCardIndex];
    if (!currentCard) return;

    // Update stats for this card
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex] = {
      ...currentCard,
      stats: {
        ...currentCard.stats,
        correctCount: currentCard.stats.correctCount + (correct ? 1 : 0),
        incorrectCount: currentCard.stats.incorrectCount + (correct ? 0 : 1),
        lastReviewed: Date.now()
      }
    };
    setFlashcards(updatedCards);

    // Update session stats
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));

    // Update node data with new stats
    const newClozeStats = {
      ...node.data.clozeStats,
      [currentCard.id]: updatedCards[currentCardIndex]
    };
    updateNode(node.id, { clozeStats: newClozeStats });

    // Move to next card or finish
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsRevealed(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsRevealed(false);
    setSessionStats({ correct: 0, incorrect: 0 });
    setIsFinished(false);
  };

  if (flashcards.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>No Flashcards</DialogTitle>
          </DialogHeader>
          <div className="text-center text-gray-600 py-4">
            No flashcards found in this node.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentCard = flashcards[currentCardIndex];
  const progress = `${currentCardIndex + 1}/${flashcards.length}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-gray-900">Flashcard Review</span>
            {!isFinished && <span className="text-sm text-gray-600">{progress}</span>}
          </DialogTitle>
        </DialogHeader>

        {isFinished ? (
          <div className="py-8">
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Review Complete!</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="text-lg">
                  <span className="text-green-600 font-semibold">Correct: {sessionStats.correct}</span>
                  <span className="mx-4">|</span>
                  <span className="text-red-600 font-semibold">Incorrect: {sessionStats.incorrect}</span>
                </div>
                <div className="text-gray-600">
                  Accuracy: {Math.round((sessionStats.correct / flashcards.length) * 100)}%
                </div>
              </div>
              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
                >
                  Review Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-8 min-h-[200px] my-4 shadow-inner">
              <div className="text-center space-y-6">
                <pre className="text-lg text-gray-900 whitespace-pre-wrap font-mono bg-white p-4 rounded-lg shadow-sm">
                  {currentCard.context.replace(currentCard.content, '_'.repeat(currentCard.content.length))}
                </pre>
                {isRevealed && (
                  <div className="text-2xl font-bold text-blue-600 bg-white p-4 rounded-lg shadow-sm">
                    {currentCard.content}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center space-x-4 mt-6">
              {!isRevealed ? (
                <button
                  onClick={() => setIsRevealed(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleAnswer(false)}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-sm"
                  >
                    Incorrect
                  </button>
                  <button
                    onClick={() => handleAnswer(true)}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium shadow-sm"
                  >
                    Correct
                  </button>
                </>
              )}
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600 text-center mt-4 border-t pt-4">
              <div>Session: {sessionStats.correct} correct, {sessionStats.incorrect} incorrect</div>
              <div>Total: {currentCard.stats.correctCount} correct, {currentCard.stats.incorrectCount} incorrect</div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 