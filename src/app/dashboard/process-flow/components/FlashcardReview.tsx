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
  const [isRandomized, setIsRandomized] = useState(false);

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

    // Filter out adjacent clozes
    const filteredCards = cards.filter((card, index) => {
      if (index === 0) return true;
      const prevCard = cards[index - 1];
      return !card.context.includes(prevCard.content);
    });

    // Randomize if requested
    if (isRandomized) {
      for (let i = filteredCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredCards[i], filteredCards[j]] = [filteredCards[j], filteredCards[i]];
      }
    }

    setFlashcards(filteredCards);
    setCurrentCardIndex(0);
    setIsRevealed(false);
    setSessionStats({ correct: 0, incorrect: 0 });
    setIsFinished(false);
  }, [node.data.description, isRandomized]);

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

  const handleNext = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsRevealed(false);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsRevealed(false);
    }
  };

  const toggleRandomize = () => {
    setIsRandomized(!isRandomized);
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
      <DialogContent className="sm:max-w-2xl bg-white h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-4 sticky top-0 bg-white z-10">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-gray-900">Flashcard Review</span>
            {!isFinished && <span className="text-sm text-gray-600">{progress}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isFinished ? (
            <div className="py-4">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Review Complete!</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="text-base">
                    <span className="text-green-600 font-semibold">Correct: {sessionStats.correct}</span>
                    <span className="mx-2">|</span>
                    <span className="text-red-600 font-semibold">Incorrect: {sessionStats.incorrect}</span>
                  </div>
                  <div className="text-gray-600">
                    Accuracy: {Math.round((sessionStats.correct / flashcards.length) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-4 my-2 shadow-inner">
                <div className="text-center space-y-4">
                  <pre className="text-base text-gray-900 whitespace-pre-wrap font-mono bg-white p-3 rounded-lg shadow-sm">
                    {currentCard.context.replace(currentCard.content, '_'.repeat(currentCard.content.length))}
                  </pre>
                  {isRevealed && (
                    <div className="text-xl font-bold text-blue-600 bg-white p-3 rounded-lg shadow-sm">
                      {currentCard.content}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600 text-center mt-2 border-t pt-2">
                <div>Session: {sessionStats.correct} correct, {sessionStats.incorrect} incorrect</div>
                <div>Total: {currentCard.stats.correctCount} correct, {currentCard.stats.incorrectCount} incorrect</div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t pt-4 pb-2">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrevious}
              disabled={currentCardIndex === 0}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={toggleRandomize}
              className={`px-3 py-1 text-sm rounded ${
                isRandomized ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {isRandomized ? 'Sequential' : 'Random'}
            </button>
            <button
              onClick={handleNext}
              disabled={currentCardIndex === flashcards.length - 1}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
          {isFinished ? (
            <div className="flex justify-center space-x-2">
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
              >
                Review Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex justify-center space-x-2">
              {!isRevealed ? (
                <button
                  onClick={() => setIsRevealed(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleAnswer(false)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
                  >
                    Incorrect
                  </button>
                  <button
                    onClick={() => handleAnswer(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                  >
                    Correct
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 