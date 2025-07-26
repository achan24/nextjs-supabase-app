'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Person, Track } from '@/types/crm';
import { createClient } from '@/lib/supabase';
import { X } from 'lucide-react';

interface AssignTrackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  onTrackAssigned: () => void;
  availableTracks: {
    id: string;
    name: string;
    icon: any;
    description: string;
    stages: {
      name: string;
      description: string;
    }[];
  }[];
}

export function AssignTrackDialog({ isOpen, onClose, person, onTrackAssigned, availableTracks }: AssignTrackDialogProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // 1. Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.user?.id) throw new Error('No authenticated user');

      // 2. Get or create the track
      const track = availableTracks.find(t => t.id === selectedTrack);
      if (!track) throw new Error('Selected track not found');

      const { data: trackData, error: trackError } = await supabase
        .from('crm_tracks')
        .upsert({
          name: track.name,
          description: track.description,
          user_id: sessionData.session.user.id
        }, {
          onConflict: 'name,user_id'
        })
        .select()
        .single();

      if (trackError) throw trackError;

      // 3. Get or create the stage
      const stage = track.stages.find(s => s.name === selectedStage);
      if (!stage) throw new Error('Selected stage not found');

      const { data: stageData, error: stageError } = await supabase
        .from('crm_stages')
        .upsert({
          track_id: trackData.id,
          name: stage.name,
          description: stage.description,
          order_index: track.stages.findIndex(s => s.name === selectedStage)
        }, {
          onConflict: 'name,track_id'
        })
        .select()
        .single();

      if (stageError) throw stageError;

      // 4. Assign the person to the track with the selected stage
      const { error: assignError } = await supabase
        .from('crm_person_tracks')
        .upsert({
          person_id: person.id,
          track_id: trackData.id,
          current_stage_id: stageData.id
        }, {
          onConflict: 'person_id,track_id'
        });

      if (assignError) throw assignError;

      onTrackAssigned();
      onClose();
    } catch (err) {
      console.error('Error assigning track:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign track. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTrack = availableTracks.find(t => t.id === selectedTrack);
  const currentStage = currentTrack?.stages.find(s => s.name === selectedStage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Assign Track to {person.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                onClick={onClose}
              >
                <X className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1">
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="track" className="text-sm font-medium text-gray-700">
                  Select Track *
                </Label>
                <Select
                  value={selectedTrack}
                  onValueChange={(value) => {
                    setSelectedTrack(value);
                    setSelectedStage('');
                  }}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a relationship track" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTracks.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentTrack && (
                  <div className="text-sm text-gray-600 mt-1">
                    {currentTrack.description}
                  </div>
                )}
              </div>

              {selectedTrack && (
                <div className="space-y-2">
                  <Label htmlFor="stage" className="text-sm font-medium text-gray-700">
                    Current Stage *
                  </Label>
                  <Select
                    value={selectedStage}
                    onValueChange={setSelectedStage}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select current stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentTrack?.stages.map((stage) => (
                        <SelectItem key={stage.name} value={stage.name}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentStage && (
                    <div className="text-sm text-gray-600 mt-1">
                      {currentStage.description}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedTrack || !selectedStage}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Track'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 