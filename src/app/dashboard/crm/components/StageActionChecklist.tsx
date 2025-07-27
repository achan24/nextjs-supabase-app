'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { PersonWithMetadata } from '@/types/crm';
import { CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface StageActionChecklistProps {
  person: PersonWithMetadata;
  onActionCompleted?: () => void;
}

interface StageAction {
  id: string;
  title: string;
  description: string;
  importance: number;
  expected_outcome: string;
}

interface PersonStageAction {
  id: string;
  stage_action_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at: string | null;
  notes: string | null;
}

export function StageActionChecklist({ person, onActionCompleted }: StageActionChecklistProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stageActions, setStageActions] = useState<StageAction[]>([]);
  const [personActions, setPersonActions] = useState<PersonStageAction[]>([]);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    loadActions();
  }, [person]);

  const loadActions = async () => {
    try {
      setLoading(true);

      // Get current stage
      const currentTrack = person.tracks?.[0];
      console.log('Current track:', currentTrack);
      if (!currentTrack?.current_stage) {
        console.log('No current stage found');
        return;
      }

      // Get recommended actions for current stage
      const { data: actions, error: actionsError } = await supabase
        .from('crm_stage_actions')
        .select('*')
        .eq('stage_id', currentTrack.current_stage.id)
        .order('importance', { ascending: false });

      console.log('Stage actions:', actions);
      if (actionsError) {
        console.error('Stage actions error:', actionsError);
        throw actionsError;
      }

      // Get person's progress on these actions
      const { data: progress, error: progressError } = await supabase
        .from('crm_person_stage_actions')
        .select('*')
        .eq('person_id', person.id)
        .in('stage_action_id', actions?.map(a => a.id) || []);

      console.log('Person progress:', progress);
      if (progressError) {
        console.error('Progress error:', progressError);
        throw progressError;
      }

      setStageActions(actions || []);
      setPersonActions(progress || []);

      // Initialize notes
      const notes: Record<string, string> = {};
      progress?.forEach(p => {
        if (p.notes) notes[p.stage_action_id] = p.notes;
      });
      setActionNotes(notes);
    } catch (error) {
      console.error('Error loading actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateActionStatus = async (action: StageAction, status: PersonStageAction['status']) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user?.id) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('crm_person_stage_actions')
        .upsert({
          person_id: person.id,
          user_id: sessionData.session.user.id,
          stage_action_id: action.id,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          notes: actionNotes[action.id] || null,
        })
        .select();

      if (error) throw error;

      // Update local state
      setPersonActions(prev => {
        const existing = prev.find(p => p.stage_action_id === action.id);
        if (existing) {
          return prev.map(p => p.stage_action_id === action.id ? data[0] : p);
        }
        return [...prev, data[0]];
      });

      onActionCompleted?.();
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };

  const getActionStatus = (action: StageAction) => {
    return personActions.find(p => p.stage_action_id === action.id)?.status || 'pending';
  };

  const getImportanceLabel = (importance: number) => {
    switch (importance) {
      case 3: return 'Essential';
      case 2: return 'Recommended';
      default: return 'Optional';
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading actions...</div>;
  }

  if (!person.tracks?.[0]?.current_stage) {
    return <div className="text-gray-500">No current stage selected.</div>;
  }

  const stage = person.tracks[0].current_stage;
  const completedCount = personActions.filter(a => a.status === 'completed').length;
  const totalCount = stageActions.length;

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Stage Actions</h3>
          <div className="text-sm text-gray-500">
            {stage.name} Stage • {completedCount}/{totalCount} Complete
          </div>
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="grid gap-4">
          {stageActions.map((action) => {
            const status = getActionStatus(action);
            const isCompleted = status === 'completed';
            const isInProgress = status === 'in_progress';

            return (
              <Card key={action.id} className={`relative transition-colors ${
                isCompleted ? 'bg-green-50' : 
                isInProgress ? 'bg-blue-50' : 
                'bg-white'
              }`}>
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${
                  action.importance === 3 ? 'bg-blue-500' :
                  action.importance === 2 ? 'bg-blue-300' :
                  'bg-gray-200'
                }`} />
                
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full p-2 ${
                        isCompleted ? 'bg-green-100 text-green-600' :
                        isInProgress ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-400'
                      }`}
                      onClick={() => updateActionStatus(action, isCompleted ? 'pending' : 'completed')}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {action.title}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          action.importance === 3 ? 'bg-blue-100 text-blue-700' :
                          action.importance === 2 ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getImportanceLabel(action.importance)}
                        </span>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="pl-10 space-y-3">
                    <div className="text-sm">
                      <span className="text-gray-500">Expected Outcome:</span>
                      <span className="ml-2">{action.expected_outcome}</span>
                    </div>

                    <Textarea
                      placeholder="Add notes about your progress..."
                      value={actionNotes[action.id] || ''}
                      onChange={(e) => {
                        setActionNotes(prev => ({
                          ...prev,
                          [action.id]: e.target.value
                        }));
                      }}
                      onBlur={() => {
                        if (status !== 'pending') {
                          updateActionStatus(action, status);
                        }
                      }}
                      className="text-sm"
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateActionStatus(action, 'in_progress')}
                        disabled={isCompleted}
                      >
                        {isInProgress ? 'In Progress' : 'Start'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateActionStatus(action, 'skipped')}
                        disabled={isCompleted}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}