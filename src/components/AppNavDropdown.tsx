'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

const apps = [
  { name: 'Projects', href: '/dashboard/projects', description: 'Manage your projects and goals' },
  { name: 'Tasks', href: '/dashboard/tasks', description: 'Track your daily tasks' },
  { name: 'Notes', href: '/dashboard/notes', description: 'Organize your thoughts and ideas' },
  { name: 'Process Flow', href: '/dashboard/process-flow', description: 'Visualize your learning progress' },
  { name: 'Calendar', href: '/dashboard/calendar', description: 'View your schedule' },
  { name: 'Insights', href: '/dashboard/insights', description: 'Get productivity insights' },
  { name: 'AI Assistant', href: '/dashboard/ai', description: 'Get AI-powered help' },
];

export function AppNavDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
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
  );
} 