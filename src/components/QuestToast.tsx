import React, { useEffect, useState } from 'react';
import { QuestTextResult } from '@/services/questTextService';
import { toast } from 'sonner';
import { Coins, Sparkles, Trophy, Star } from 'lucide-react';

interface QuestToastProps {
  questText: QuestTextResult;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function QuestToast({ 
  questText, 
  onClose, 
  autoClose = true, 
  duration = 4000 
}: QuestToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTokenBonus, setShowTokenBonus] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
    
    // Show token bonus after a short delay
    if (questText.tokenBonus) {
      setTimeout(() => setShowTokenBonus(true), 500);
    }

    // Auto close
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [questText, autoClose, duration, onClose]);

  const getMotivationalStyle = () => {
    switch (questText.motivationalLevel) {
      case 'celebratory':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-300';
      case 'inspiring':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300';
      default:
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-300';
    }
  };

  const getIcon = () => {
    if (questText.tokenBonus) {
      return <Coins className="w-5 h-5 text-yellow-200" />;
    }
    switch (questText.motivationalLevel) {
      case 'celebratory':
        return <Trophy className="w-5 h-5 text-yellow-200" />;
      case 'inspiring':
        return <Star className="w-5 h-5 text-purple-200" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-200" />;
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`rounded-lg shadow-lg border-2 p-4 ${getMotivationalStyle()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{questText.emoji}</span>
            <h3 className="font-bold text-lg">{questText.title}</h3>
          </div>
          {getIcon()}
        </div>

        {/* Message */}
        <p className="text-sm mb-3 leading-relaxed">{questText.message}</p>

        {/* Token Bonus Animation */}
        {questText.tokenBonus && (
          <div
            className={`flex items-center gap-2 p-2 bg-white/20 rounded-lg transition-all duration-500 ${
              showTokenBonus ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <Coins className="w-4 h-4 text-yellow-200" />
            <span className="font-semibold text-yellow-200">
              +{questText.tokenBonus} Bonus Tokens!
            </span>
          </div>
        )}

        {/* Close button */}
        {!autoClose && (
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// Hook to easily show quest toasts
export function useQuestToast() {
  const showQuestToast = (questText: QuestTextResult) => {
    toast.custom((t) => (
      <QuestToast 
        questText={questText} 
        onClose={() => toast.dismiss(t)} 
        autoClose={true}
      />
    ), {
      duration: 5000,
      position: 'top-right',
    });
  };

  return { showQuestToast };
}

// Convenience function for showing quest toasts
export function showQuestToast(questText: QuestTextResult) {
  toast.custom((t) => (
    <QuestToast 
      questText={questText} 
      onClose={() => toast.dismiss(t)} 
      autoClose={true}
    />
  ), {
    duration: 5000,
    position: 'top-right',
  });
}
