'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Person, Track } from '@/types/crm';

interface TrackWithStages {
  id: string;
  name: string;
  icon: any;
  description: string;
  stages: {
    name: string;
    description: string;
  }[];
}

interface AssignTrackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  onTrackAssigned: () => void;
  availableTracks: TrackWithStages[];
}

export function AssignTrackDialog({ isOpen, onClose, person, onTrackAssigned, availableTracks }: AssignTrackDialogProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setSelectedTrack('');
    setSelectedStage('');
    onClose();
  };

  const handleAssign = async () => {
    if (!person || !selectedTrack || !selectedStage) return;

    try {
      setIsLoading(true);
      const supabase = createClient();

      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user?.id) throw new Error('No authenticated user');

      // Create person track
      const { error } = await supabase
        .from('crm_person_tracks')
        .upsert({
          person_id: person.id,
          track_id: selectedTrack,
          current_stage_id: selectedStage,
          started_at: new Date().toISOString(),
          last_progress_at: new Date().toISOString()
        }, {
          onConflict: 'person_id,track_id'
        });

      if (error) throw error;

      onTrackAssigned();
      handleClose();
    } catch (error) {
      console.error('Error assigning track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTrack = availableTracks.find(t => t.id === selectedTrack);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Track to {person?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Track</label>
            <Select
              value={selectedTrack}
              onValueChange={setSelectedTrack}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a track" />
              </SelectTrigger>
              <SelectContent>
                {availableTracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentTrack && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Stage</label>
              <Select
                value={selectedStage}
                onValueChange={setSelectedStage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {currentTrack.stages.map((stage) => (
                    <SelectItem key={stage.name} value={stage.name}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedTrack || !selectedStage || isLoading}
          >
            {isLoading ? 'Assigning...' : 'Assign Track'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 