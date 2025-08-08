'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  User as UserIcon, 
  Settings, 
  Play, 
  Eye, 
  Code, 
  MessageSquare,
  Zap,
  Target,
  Brain,
  Layers,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PipelineStep {
  id: string;
  type: 'system' | 'context' | 'user' | 'assistant';
  content: string;
  metadata?: {
    tokens?: number;
    role?: string;
    template?: string;
    variables?: Record<string, any>;
  };
}

interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  contextTemplate: string;
  variables: string[];
  category: 'conversation' | 'analysis' | 'task' | 'creative';
}

export default function AIPipelineClient({ user }: { user: User }) {
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('visualizer');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Available models
  const availableModels = [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
    { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Balanced performance' },
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Open source option' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', description: 'Google\'s latest' },
  ];

  // Predefined templates
  const templates: PipelineTemplate[] = [
    {
      id: 'free-conversation',
      name: 'Free Conversation',
      description: 'Open-ended conversation with minimal constraints',
      systemPrompt: 'You are Guardian Angel, an AI assistant designed to help adults with ADHD manage their tasks and time more effectively.',
      contextTemplate: '',
      variables: [],
      category: 'conversation'
    },
    {
      id: 'task-analysis',
      name: 'Task Analysis',
      description: 'Analyze and break down complex tasks',
      systemPrompt: `You are a task analysis expert. Help break down complex tasks into manageable steps, considering ADHD challenges like time blindness and task initiation difficulties.`,
      contextTemplate: `Task to analyze: {task}
Current context: {context}
User's typical focus time: {focusTime} minutes`,
      variables: ['task', 'context', 'focusTime'],
      category: 'task'
    },
    {
      id: 'emotional-support',
      name: 'Emotional Support',
      description: 'Provide emotional support and encouragement',
      systemPrompt: `You are an empathetic AI companion. Provide emotional support, encouragement, and practical advice while being mindful of ADHD-related challenges.`,
      contextTemplate: `User's current emotional state: {emotion}
Recent challenges: {challenges}
What they need: {need}`,
      variables: ['emotion', 'challenges', 'need'],
      category: 'conversation'
    },
    {
      id: 'productivity-strategy',
      name: 'Productivity Strategy',
      description: 'Generate personalized productivity strategies',
      systemPrompt: `You are a productivity coach specializing in ADHD. Analyze patterns and suggest personalized strategies for better focus, time management, and task completion.`,
      contextTemplate: `Current productivity patterns: {patterns}
Recent successes: {successes}
Areas of struggle: {struggles}
Available time: {time}`,
      variables: ['patterns', 'successes', 'struggles', 'time'],
      category: 'analysis'
    }
  ];

  const addStep = (step: PipelineStep) => {
    setPipelineSteps(prev => [...prev, step]);
  };

  const removeStep = (stepId: string) => {
    setPipelineSteps(prev => prev.filter(step => step.id !== stepId));
  };

  const clearPipeline = () => {
    setPipelineSteps([]);
  };

  const loadTemplate = (template: PipelineTemplate) => {
    setSelectedTemplate(template);
    
    // Clear existing steps and add template steps
    const newSteps: PipelineStep[] = [
      {
        id: 'system-' + Date.now(),
        type: 'system',
        content: template.systemPrompt,
        metadata: {
          role: 'system',
          template: template.name
        }
      }
    ];

    if (template.contextTemplate) {
      newSteps.push({
        id: 'context-' + Date.now(),
        type: 'context',
        content: template.contextTemplate,
        metadata: {
          role: 'context',
          template: template.name,
          variables: template.variables
        }
      });
    }

    setPipelineSteps(newSteps);
  };

  const addUserMessage = () => {
    if (!currentInput.trim()) return;

    addStep({
      id: 'user-' + Date.now(),
      type: 'user',
      content: currentInput,
      metadata: {
        role: 'user'
      }
    });

    setCurrentInput('');
  };

  const runPipeline = async () => {
    if (pipelineSteps.length === 0) return;

    setIsRunning(true);

    try {
      // Create AI response step placeholder
      const aiMessage: PipelineStep = {
        id: 'assistant-' + Date.now(),
        type: 'assistant',
        content: '',
        metadata: {
          role: 'assistant'
        }
      };

      // Add placeholder immediately
      addStep(aiMessage);

      // Call the real AI pipeline API
      const response = await fetch('/api/ai-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steps: pipelineSteps,
          model: selectedModel,
          temperature: temperature,
          maxTokens: maxTokens,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  // Update the AI message content in real-time
                  setPipelineSteps(prev => 
                    prev.map(step => 
                      step.id === aiMessage.id 
                        ? { ...step, content: step.content + parsed.content }
                        : step
                    )
                  );
                }
                if (parsed.metadata) {
                  // Update metadata
                  setPipelineSteps(prev => 
                    prev.map(step => 
                      step.id === aiMessage.id 
                        ? { 
                            ...step, 
                            metadata: { 
                              ...step.metadata, 
                              tokens: parsed.metadata.totalTokens,
                              processingTime: parsed.metadata.processingTime
                            }
                          }
                        : step
                    )
                  );
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Pipeline execution error:', error);
      // Update the AI message with error
      setPipelineSteps(prev => 
        prev.map(step => 
          step.type === 'assistant' && step.content === ''
            ? { ...step, content: 'Sorry, I encountered an error. Please try again.' }
            : step
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  const copyPipeline = async () => {
    const pipelineData = {
      template: selectedTemplate?.name || 'Custom',
      steps: pipelineSteps,
      timestamp: new Date().toISOString()
    };

    await navigator.clipboard.writeText(JSON.stringify(pipelineData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'system': return <Settings className="w-4 h-4" />;
      case 'context': return <Layers className="w-4 h-4" />;
      case 'user': return <UserIcon className="w-4 h-4" />;
      case 'assistant': return <Bot className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'system': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'context': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'user': return 'bg-green-100 text-green-800 border-green-200';
      case 'assistant': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPromptPreview = () => {
    const messages = pipelineSteps.map(step => ({
      role: step.type === 'user' ? 'user' : step.type === 'assistant' ? 'assistant' : 'system',
      content: step.content
    }));

    // Add system message first if present
    const systemStep = pipelineSteps.find(step => step.type === 'system');
    if (systemStep) {
      messages.unshift({
        role: 'system',
        content: systemStep.content
      });
    }

    return {
      messages,
      config: {
        model: selectedModel,
        temperature,
        maxTokens,
        stream: true
      }
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Pipeline Visualizer</h1>
          <p className="text-gray-600">Visualize and test AI prompt construction and conversation flow</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visualizer" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visualizer
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Code View
            </TabsTrigger>
          </TabsList>

          {/* Visualizer Tab */}
          <TabsContent value="visualizer" className="space-y-4">
            {/* Prompt Preview */}
            {pipelineSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Prompt Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{JSON.stringify(getPromptPreview(), null, 2)}</pre>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pipeline Steps */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        Pipeline Steps
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearPipeline}
                          disabled={pipelineSteps.length === 0}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPipeline}
                          disabled={pipelineSteps.length === 0}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pipelineSteps.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No pipeline steps yet. Select a template or add steps manually.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pipelineSteps.map((step, index) => (
                          <div
                            key={step.id}
                            className={`p-4 rounded-lg border-2 ${getStepColor(step.type)} relative group`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex-shrink-0">
                                  {getStepIcon(step.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {step.type.toUpperCase()}
                                    </Badge>
                                    {step.metadata?.template && (
                                      <Badge variant="outline" className="text-xs">
                                        {step.metadata.template}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm font-mono bg-white/50 p-2 rounded border">
                                    {step.content}
                                  </div>
                                  {step.metadata?.tokens && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Tokens: {step.metadata.tokens}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStep(step.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </Button>
                            </div>
                            {index < pipelineSteps.length - 1 && (
                              <div className="flex justify-center mt-2">
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Template Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <Button
                          key={template.id}
                          variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => loadTemplate(template)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs opacity-75">{template.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* User Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="w-5 h-5" />
                      Add Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Enter your message..."
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={addUserMessage}
                      disabled={!currentInput.trim()}
                      className="w-full"
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      Add User Message
                    </Button>
                  </CardContent>
                </Card>

                {/* Model Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Model Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Model</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm"
                      >
                        {availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} - {model.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Temperature: {temperature}</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full mt-1"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Focused</span>
                        <span>Balanced</span>
                        <span>Creative</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Max Tokens: {maxTokens}</label>
                      <input
                        type="range"
                        min="100"
                        max="4000"
                        step="100"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full"
                    >
                      {showAdvanced ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                      Advanced Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Pipeline Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={runPipeline}
                      disabled={pipelineSteps.length === 0 || isRunning}
                      className="w-full"
                    >
                      {isRunning ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Run Pipeline
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </div>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500">System Prompt:</label>
                            <div className="text-sm bg-gray-50 p-2 rounded border font-mono">
                              {template.systemPrompt}
                            </div>
                          </div>
                          {template.contextTemplate && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">Context Template:</label>
                              <div className="text-sm bg-gray-50 p-2 rounded border font-mono">
                                {template.contextTemplate}
                              </div>
                            </div>
                          )}
                          {template.variables.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">Variables:</label>
                              <div className="flex flex-wrap gap-1">
                                {template.variables.map((variable) => (
                                  <Badge key={variable} variant="secondary" className="text-xs">
                                    {variable}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => loadTemplate(template)}
                          className="w-full mt-3"
                          size="sm"
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code View Tab */}
          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify({
                    template: selectedTemplate?.name || 'Custom',
                    steps: pipelineSteps,
                    metadata: {
                      totalSteps: pipelineSteps.length,
                      hasSystem: pipelineSteps.some(s => s.type === 'system'),
                      hasContext: pipelineSteps.some(s => s.type === 'context'),
                      userMessages: pipelineSteps.filter(s => s.type === 'user').length,
                      assistantMessages: pipelineSteps.filter(s => s.type === 'assistant').length
                    }
                  }, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
