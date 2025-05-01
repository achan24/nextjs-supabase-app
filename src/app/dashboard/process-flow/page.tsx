'use client';

import Link from 'next/link';
import ProcessFlowEditor from './ProcessFlowEditor';

export default function ProcessFlowPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
            <h1 className="text-2xl font-semibold text-gray-900">Process Flow</h1>
            <div className="w-[140px]"></div> {/* Spacer to balance the layout */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ProcessFlowEditor />
      </div>
    </div>
  );
} 