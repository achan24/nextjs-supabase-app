'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Bot, Sun, Moon, Coffee, Brain, MessageCircle, Send } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'completed';
}

interface Goal {
  id: string;
  title: string;
  description?: string;
}

interface Subarea {
  id: string;
  name: string;
  goals: Goal[];
}

interface Area {
  id: string;
  name: string;
  subareas: Subarea[];
}

interface TopProgress {
  areaName: string;
  subareaName: string;
  goalId: string;
  goalTitle: string;
}

interface GuardianAngelAIProps {
  userEnergy?: number;  // 0-100
  timeOfDay?: string;
  currentFocus?: string;
  characterLevel?: number;
  characterXP?: number;
  starredTask?: Task | null;
  areas?: Area[];
  topProgress?: TopProgress | null;
}

export function GuardianAngelAI({ 
  userEnergy = 70, 
  timeOfDay = 'morning', 
  currentFocus,
  characterLevel = 1,
  characterXP = 0,
  starredTask = null,
  areas = [],
  topProgress = null
}: GuardianAngelAIProps) {
  const [message, setMessage] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isInConversation, setIsInConversation] = useState(false);
  const [icon, setIcon] = useState<JSX.Element>(<Bot className="w-6 h-6 text-blue-500" />);

  useEffect(() => {
    // Only generate template message if not in conversation
    if (!isInConversation) {
      generateConversationalMessage();
    }
  }, [timeOfDay, userEnergy, characterLevel, starredTask, areas, topProgress, isInConversation]);

  const generateConversationalMessage = () => {
    // Time-based icon selection
    switch(timeOfDay) {
      case 'morning':
        setIcon(<Sun className="w-6 h-6 text-yellow-500" />);
        break;
      case 'afternoon':
        setIcon(<Coffee className="w-6 h-6 text-orange-500" />);
        break;
      case 'evening':
        setIcon(<Moon className="w-6 h-6 text-purple-500" />);
        break;
      default:
        setIcon(<Bot className="w-6 h-6 text-blue-500" />);
    }

    // ADHD-focused: ONE clear action based on actual data analysis
    let focusedMessage = '';

    // Count total goals across all areas
    const totalGoals = areas.reduce((total, area) => 
      total + area.subareas.reduce((subTotal, subarea) => subTotal + subarea.goals.length, 0), 0
    );

    // Analyze actual data to provide warm but urgent guidance with personalized "why"
    if (starredTask) {
      // Point of Performance: They've already identified priority - warm greeting + urgency + why
      const dueDate = starredTask.due_date ? new Date(starredTask.due_date) : null;
      const isOverdue = dueDate && dueDate < new Date();
      
      // Generate personal "why" based on task content - what's in it for YOU
      let why = '';
      const taskTitle = starredTask.title.toLowerCase();
      if (taskTitle.includes('mobile') || taskTitle.includes('ui')) {
        why = 'You\'ll feel accomplished and this makes you more valuable as a developer.';
      } else if (taskTitle.includes('interview') || taskTitle.includes('job')) {
        why = 'This gets you closer to the income and career satisfaction you want.';
      } else if (taskTitle.includes('exercise') || taskTitle.includes('workout')) {
        why = 'You\'ll feel energized and proud of yourself afterward.';
      } else if (taskTitle.includes('learn') || taskTitle.includes('study')) {
        why = 'You\'ll feel smarter and more confident in your abilities.';
      } else if (taskTitle.includes('write') || taskTitle.includes('blog')) {
        why = 'You\'ll feel creative and this showcases your expertise to others.';
      } else if (taskTitle.includes('clean') || taskTitle.includes('organize')) {
        why = 'You\'ll feel calm and in control of your space.';
      } else if (taskTitle.includes('call') || taskTitle.includes('email')) {
        why = 'You\'ll feel relieved to have this off your mind.';
      } else {
        why = 'You\'ll feel productive and proud of making progress.';
      }
      
      if (isOverdue) {
        focusedMessage = `Good ${timeOfDay}! "${starredTask.title}" is overdue - time to tackle it RIGHT NOW for 15 minutes. ${why}`;
      } else {
        focusedMessage = `Hey there! Ready to crush "${starredTask.title}"? Start it now for 15 minutes. ${why}`;
      }
    } else if (totalGoals > 0) {
      // Performance Gap: They have goals but haven't prioritized
      if (topProgress) {
        focusedMessage = `Hello! You're working on "${topProgress.goalTitle}" - create a task for it RIGHT NOW. You'll feel more organized and in control.`;
      } else {
        // Find the first goal from their areas
        const firstArea = areas.find(area => area.subareas.length > 0);
        const firstSubarea = firstArea?.subareas.find(sub => sub.goals.length > 0);
        const firstGoal = firstSubarea?.goals[0];
        
        if (firstGoal) {
          focusedMessage = `Hi! You have "${firstGoal.title}" ready to go. Create a task for it RIGHT NOW. You'll feel like you're actually making progress.`;
        } else {
          focusedMessage = `Good ${timeOfDay}! Your goals need tasks. Create ONE task RIGHT NOW. You'll feel more focused and less overwhelmed.`;
        }
      }
    } else {
      // Externalize the planning step
      focusedMessage = `Hello! No goals set up yet. Go to GOAL System and create ONE goal RIGHT NOW. You'll feel more purposeful and less scattered.`;
    }

    // Add gentle energy-based support
    if (userEnergy < 50) {
      focusedMessage += ` No pressure - even 5 minutes counts.`;
    }

    setMessage(focusedMessage);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    setIsTyping(true);
    setIsInConversation(true); // Switch to conversation mode permanently
    const userMessage = userInput.toLowerCase();
    setUserInput('');

    // Actually listen and respond to what they're asking
    setTimeout(() => {
      let response = '';
      
      if (userMessage.includes('how do i start') || userMessage.includes('how to start')) {
        if (starredTask) {
          const taskTitle = starredTask.title.toLowerCase();
          if (taskTitle.includes('mobile') || taskTitle.includes('ui')) {
            response = `For "${starredTask.title}": 1) Open your code editor, 2) Find the mobile UI files, 3) Pick ONE small element to improve first. Just 15 minutes!`;
          } else if (taskTitle.includes('interview') || taskTitle.includes('job')) {
            response = `For "${starredTask.title}": 1) Open a document, 2) Write down 3 key points about yourself, 3) Practice saying them out loud. Start now!`;
          } else if (taskTitle.includes('exercise') || taskTitle.includes('workout')) {
            response = `For "${starredTask.title}": 1) Put on workout clothes, 2) Set a 15-minute timer, 3) Start with light movement. That's it!`;
          } else {
            response = `For "${starredTask.title}": 1) Open the relevant app/tool, 2) Set a 15-minute timer, 3) Do the smallest possible first step. You got this!`;
          }
        } else {
          response = `Start by picking ONE thing to focus on. Go to Tasks, create a task for your most important goal, and star it. Then come back and ask me again!`;
        }
      } else if (userMessage.includes('stuck') || userMessage.includes('overwhelmed')) {
        response = `Break it down smaller. Instead of the whole thing, what's just the first 5-minute piece? Even opening the right file counts as progress.`;
      } else if (userMessage.includes('procrastinating') || userMessage.includes('avoiding')) {
        response = `That's normal! Set a timer for just 2 minutes. Tell yourself you'll stop after 2 minutes. Often you'll keep going once you start.`;
      } else if (userMessage.includes('tired') || userMessage.includes('low energy')) {
        response = `Low energy day? Do the absolute minimum version. For coding: just open the file. For exercise: just put on the clothes. Small wins count.`;
      } else if (userMessage.includes('motivation') || userMessage.includes('why')) {
        if (starredTask) {
          response = `Remember: completing "${starredTask.title}" will make you feel accomplished and move you forward. You'll be proud you did it instead of putting it off.`;
        } else {
          response = `You're building the habit of following through on what you say you'll do. That's the foundation of everything else you want to achieve.`;
        }
      } else if (userMessage.includes('help')) {
        response = `I'm here! What specifically are you struggling with? Starting? Staying focused? Breaking it down? Just tell me what's blocking you.`;
      } else {
        // For anything else, acknowledge what they said and redirect to action
        response = `I hear you. ${starredTask ? `When you're ready, "${starredTask.title}" is waiting. What would help you take the first step?` : 'What\'s the one thing you most need to get done today?'}`;
      }
      
      setMessage(response);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
      <div className="flex items-center space-x-2">
        {icon}
        <div className="flex-1">
          <p className="text-lg font-medium text-blue-900">{isTyping ? "Thinking..." : message}</p>
          {showChat && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Quick question?"
                className="flex-1 px-3 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isTyping}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isInConversation && (
            <button 
              className="text-blue-500 hover:text-blue-700 text-xs"
              onClick={() => {
                setIsInConversation(false);
                setShowChat(false);
                generateConversationalMessage(); // Reset to template
              }}
            >
              Reset
            </button>
          )}
          <button 
            className="text-blue-600 hover:text-blue-800 text-sm"
            onClick={() => setShowChat(!showChat)}
          >
            {showChat ? 'Hide' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
}
