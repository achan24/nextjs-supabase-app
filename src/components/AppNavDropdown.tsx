'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  Star,
  BarChart3,
  FolderKanban,
  CheckSquare,
  StickyNote,
  GitFork,
  Timer,
  Calendar,
  LineChart,
  Bot,
  Users,
  Repeat,
  Lightbulb,
  Target,
  User,
  BookOpen,
  Brain,
  Network,
  Heart
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { PostgrestResponse } from '@supabase/supabase-js';

const apps = [
  { 
    name: 'Character', 
    href: '/dashboard/character', 
    description: 'View and level up your character',
    icon: User
  },
  { 
    name: 'GOAL System', 
    href: '/dashboard/goal', 
    description: 'Growth, Objectives, Areas, Life-metrics - Track and achieve your life goals',
    icon: Target
  },
  { 
    name: 'Obsidian', 
    href: '/dashboard/obsidian', 
    description: 'Note-taking and knowledge management',
    icon: BookOpen
  },
  { 
    name: 'Tasks', 
    href: '/dashboard/tasks', 
    description: 'Track your daily tasks',
    icon: CheckSquare
  },
  { 
    name: 'Notes', 
    href: '/dashboard/notes', 
    description: 'Organize your thoughts and ideas',
    icon: StickyNote
  },
  { 
    name: 'Skills', 
    href: '/dashboard/skills', 
    description: 'Track and develop your skills',
    icon: Brain
  },
  { 
    name: 'Process Flow', 
    href: '/dashboard/process-flow', 
    description: 'Visualize your learning progress',
    icon: GitFork
  },
  { 
    name: 'Process Timer', 
    href: '/dashboard/process-flow/timer', 
    description: 'Time and track your process sequences',
    icon: Timer
  },
  { 
    name: 'Process Mapper', 
    href: '/dashboard/process-mapper', 
    description: 'Map and analyze your processes',
    icon: Network
  },
  { 
    name: 'Calendar', 
    href: '/dashboard/calendar', 
    description: 'View your schedule',
    icon: Calendar
  },
  { 
    name: 'Relationship CRM', 
    href: '/dashboard/crm', 
    description: 'Track and grow meaningful relationships',
    icon: Users
  },
  { 
    name: 'Habits', 
    href: '/dashboard/habits', 
    description: 'Build and track your habits',
    icon: Repeat
  },
  { 
    name: 'Insights', 
    href: '/dashboard/insights',
    description: 'Get productivity insights',
    icon: LineChart
  },
  { 
    name: 'AI Assistant', 
    href: '/dashboard/ai', 
    description: 'Get AI-powered help',
    icon: Bot
  },
  { 
    name: 'Recommendations', 
    href: '/dashboard/recommendations', 
    description: 'Get personalized recommendations',
    icon: Lightbulb
  },
  { 
    name: 'Projects', 
    href: '/dashboard/projects', 
    description: 'Manage your projects and goals',
    icon: FolderKanban
  },
  { 
    name: 'Overview', 
    href: '/dashboard/overview', 
    description: 'Track and manage all your targets and progress',
    icon: BarChart3
  }
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

  return (
    <div className="flex items-center gap-2">
      {/* Apps Button */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
        >
          Apps
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Apps Dropdown */}
        {isOpen && (
          <div className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {apps.map((app) => {
                const Icon = app.icon;
                return (
                  <Link
                    key={app.href}
                    href={app.href}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{app.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{app.description}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hotlinks Button */}
      <div className="relative" ref={hotlinksRef}>
        <button
          onClick={() => setIsHotlinksOpen(!isHotlinksOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
        >
          <Star className="w-4 h-4" />
          Hotlinks
          <ChevronDown className={`w-4 h-4 transition-transform ${isHotlinksOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Hotlinks Dropdown */}
        {isHotlinksOpen && (
          <div className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {favoriteFlows.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No favorite flows yet. Star a flow to add it here.
                </div>
              ) : (
                favoriteFlows.map((flow) => (
                  <Link
                    key={flow.id}
                    href={`/dashboard/process-flow?flowId=${flow.id}`}
                    className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setIsHotlinksOpen(false)}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{flow.title}</div>
                    {flow.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{flow.description}</div>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 