'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import ProcessFlowEditor from './ProcessFlowEditor';
import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function ProcessFlowLayout({ user }: { user: User }) {
  const [flowTitle, setFlowTitle] = useState('Untitled Flow');
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Check if the current flow is starred
    async function checkIfStarred() {
      if (!currentFlowId) return;

      const { data, error } = await supabase
        .from('process_flow_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('flow_id', currentFlowId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error);
      }

      setIsStarred(!!data);
    }

    checkIfStarred();
  }, [currentFlowId, user.id]);

  const toggleStar = async () => {
    if (!currentFlowId) return;

    try {
      if (isStarred) {
        // Remove from favorites
        const { error } = await supabase
          .from('process_flow_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('flow_id', currentFlowId);

        if (error) throw error;
        setIsStarred(false);
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('process_flow_favorites')
          .insert({
            user_id: user.id,
            flow_id: currentFlowId
          });

        if (error) throw error;
        setIsStarred(true);
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 w-full p-0 m-0" style={{margin:0,padding:0}}>
        <div className="px-4 sm:px-6 lg:px-8 w-full py-4" style={{margin:0}}>
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard" 
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg 
                className="h-5 w-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
              Back to Guardian Angel
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-gray-900">{flowTitle}</h1>
              {currentFlowId && (
                <button
                  onClick={toggleStar}
                  className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${isStarred ? 'text-yellow-500' : 'text-gray-400'}`}
                  title={isStarred ? 'Remove from hotlinks' : 'Add to hotlinks'}
                >
                  <Star className="h-5 w-5" fill={isStarred ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
            <div className="w-[140px]"></div> {/* Spacer to balance the layout */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 min-w-0 w-full h-full overflow-hidden bg-white p-0 m-0" style={{margin:0,padding:0}}>
        <ProcessFlowEditor 
          user={user} 
          flowTitle={flowTitle} 
          setFlowTitle={setFlowTitle} 
          onFlowChange={setCurrentFlowId}
        />
      </div>
    </div>
  );
} 