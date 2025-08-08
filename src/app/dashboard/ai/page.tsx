'use client';

import { GuardianAngelAI } from '@/components/GuardianAngelAI';

export default function AIAssistantPage() {
  // In a real implementation, these would come from user data/context
  const currentHour = new Date().getHours();
  let timeOfDay = 'morning';
  if (currentHour >= 12 && currentHour < 17) {
    timeOfDay = 'afternoon';
  } else if (currentHour >= 17) {
    timeOfDay = 'evening';
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">AI Assistant</h1>
      
      <GuardianAngelAI 
        userEnergy={75}
        timeOfDay={timeOfDay}
        currentFocus="Exploring Guardian Angel"
      />

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">How I Can Help</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-medium mb-2">Task Management</h3>
              <p className="text-gray-600">I can help break down complex tasks, suggest prioritization, and keep you focused on what matters most.</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-medium mb-2">Time Management</h3>
              <p className="text-gray-600">Get help with scheduling, time blocking, and maintaining focus during your work sessions.</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-medium mb-2">ADHD Strategies</h3>
              <p className="text-gray-600">Access proven techniques for managing attention, reducing distractions, and building sustainable habits.</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-medium mb-2">Progress Tracking</h3>
              <p className="text-gray-600">I'll help monitor your progress, celebrate wins, and identify areas for improvement.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 mb-4">Customize how I interact with you throughout the app. Coming soon:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Interaction frequency preferences</li>
              <li>Notification settings</li>
              <li>Focus mode settings</li>
              <li>Communication style preferences</li>
              <li>Priority area focus</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
