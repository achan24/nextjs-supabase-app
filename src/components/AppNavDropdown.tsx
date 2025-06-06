'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { PostgrestResponse } from '@supabase/supabase-js';

const apps = [
  { name: 'Projects', href: '/dashboard/projects', description: 'Manage your projects and goals' },
  { name: 'Tasks', href: '/dashboard/tasks', description: 'Track your daily tasks' },
  { name: 'Notes', href: '/dashboard/notes', description: 'Organize your thoughts and ideas' },
  { name: 'Process Flow', href: '/dashboard/process-flow', description: 'Visualize your learning progress' },
  { name: 'Calendar', href: '/dashboard/calendar', description: 'View your schedule' },
  { name: 'Insights', href: '/dashboard/insights', description: 'Get productivity insights' },
  { name: 'AI Assistant', href: '/dashboard/ai', description: 'Get AI-powered help' },
  { name: 'Relationship CRM', href: '/dashboard/crm', description: 'Track and grow meaningful relationships' },
];

interface ProcessFlow {
  id: string;
  title: string;
  description?: string;
}

interface FavoriteFlow extends ProcessFlow {
  created_at: string;
}

interface ProcessFlowFavorite {
  flow_id: string;
  created_at: string;
  process_flows: ProcessFlow;
}

export function AppNavDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isHotlinksOpen, setIsHotlinksOpen] = useState(false);
  const [favoriteFlows, setFavoriteFlows] = useState<FavoriteFlow[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hotlinksRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchFavoriteFlows() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('process_flow_favorites')
        .select(`
          flow_id,
          created_at,
          process_flows (
            id,
            title,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as PostgrestResponse<{
          flow_id: string;
          created_at: string;
          process_flows: ProcessFlow;
        }>;

      if (error) {
        console.error('Error fetching favorite flows:', error);
        return;
      }

      if (!data) return;

      const flows = data.map(fav => ({
        id: fav.process_flows.id,
        title: fav.process_flows.title,
        description: fav.process_flows.description,
        created_at: fav.created_at
      }));

      setFavoriteFlows(flows);
    }

    fetchFavoriteFlows();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (hotlinksRef.current && !hotlinksRef.current.contains(event.target as Node)) {
        setIsHotlinksOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFlowClick = (flowId: string) => {
    console.log('Navigating to flow:', flowId);
    setIsHotlinksOpen(false);
    
    // Get the current pathname
    const currentPath = window.location.pathname;
    const isInProcessFlow = currentPath === '/dashboard/process-flow';
    
    if (isInProcessFlow) {
      // If we're already in process flow, just update the URL without a full navigation
      window.history.pushState({}, '', `/dashboard/process-flow?flowId=${flowId}`);
      // Dispatch a popstate event to trigger the URL parameter watcher
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      // If we're not in process flow, do a full navigation
      router.replace(`/dashboard/process-flow?flowId=${flowId}`);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Apps Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
        >
          Apps
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {apps.map((app) => (
              <Link
                key={app.href}
                href={app.href}
                className="flex flex-col px-4 py-2 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <span className="font-medium text-gray-900">{app.name}</span>
                <span className="text-sm text-gray-500">{app.description}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Hotlinks Dropdown */}
      <div className="relative" ref={hotlinksRef}>
        <button
          onClick={() => setIsHotlinksOpen(!isHotlinksOpen)}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
        >
          <Star className="h-4 w-4" />
          Hotlinks
          <ChevronDown className={`h-4 w-4 transition-transform ${isHotlinksOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isHotlinksOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {favoriteFlows.length > 0 ? (
              favoriteFlows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => handleFlowClick(flow.id)}
                  className="w-full text-left flex flex-col px-4 py-2 hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{flow.title}</span>
                  {flow.description && (
                    <span className="text-sm text-gray-500">{flow.description}</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                No favorited process maps yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 