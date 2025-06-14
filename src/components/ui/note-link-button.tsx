import { useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Link as LinkIcon } from 'lucide-react';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Note } from '@/types/goal';

interface NoteLinkButtonProps {
  type: 'area' | 'subarea' | 'goal';
  id: string;
  name: string;
}

export function NoteLinkButton({ type, id, name }: NoteLinkButtonProps) {
  const [isLinkingNote, setIsLinkingNote] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const supabase = createClient();
  
  const {
    linkNoteToArea,
    linkNoteToSubarea,
    linkNoteToGoal,
  } = useGoalSystem();

  const fetchAvailableNotes = async () => {
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setAvailableNotes(notes || []);
  };

  const handleLinkNote = async () => {
    if (!selectedNoteId) return;

    try {
      switch (type) {
        case 'area':
          await linkNoteToArea(id, selectedNoteId);
          break;
        case 'subarea':
          await linkNoteToSubarea(id, selectedNoteId);
          break;
        case 'goal':
          await linkNoteToGoal(id, selectedNoteId);
          break;
      }
      toast.success('Note linked successfully');
      setIsLinkingNote(false);
      setSelectedNoteId('');
    } catch (error) {
      console.error('Error linking note:', error);
      toast.error('Failed to link note');
    }
  };

  const getDialogTitle = () => {
    switch (type) {
      case 'area':
        return `Link Note to ${name} Area`;
      case 'subarea':
        return `Link Note to ${name} Subarea`;
      case 'goal':
        return `Link Note to Goal: ${name}`;
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={async () => {
          await fetchAvailableNotes();
          setIsLinkingNote(true);
        }}
      >
        <LinkIcon className="w-4 h-4" />
      </Button>

      <Dialog open={isLinkingNote} onOpenChange={(open) => {
        if (!open) {
          setIsLinkingNote(false);
          setSelectedNoteId('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="note-select" className="text-sm font-medium">
                Select Note
              </label>
              <Select
                value={selectedNoteId}
                onValueChange={setSelectedNoteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a note..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNotes.map(note => (
                    <SelectItem key={note.id} value={note.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{note.title}</span>
                        <span className="text-sm text-gray-500 truncate">
                          {note.content}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setIsLinkingNote(false);
              setSelectedNoteId('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkNote}
              disabled={!selectedNoteId}
            >
              Link Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 