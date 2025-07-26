'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Person } from '@/types/crm';
import { createClient } from '@/lib/supabase';
import { X, Heart, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TrackSignalsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  onSignalAdded: () => void;
}

const signals = {
  romantic: [
    { name: 'Extended eye contact', description: 'Holding eye contact longer than usual' },
    { name: 'Physical proximity', description: 'Sitting/standing closer than normal friend distance' },
    { name: 'Playful touch', description: 'Light touches on arm, shoulder, etc.' },
    { name: 'Personal questions', description: 'Asking about relationships, future plans, deeper topics' },
    { name: 'Making time', description: 'Prioritizing 1:1 time, quick responses' },
    { name: 'Future hints', description: 'Mentioning future activities or plans together' },
    { name: 'Body language', description: 'Facing you, mirroring movements, open posture' },
    { name: 'Seeking opinion', description: 'Asking what you think about dating-related topics' },
  ],
  friendship: [
    { name: 'Casual sharing', description: 'Sharing daily life updates and thoughts' },
    { name: 'Group inclusion', description: 'Including in friend group activities' },
    { name: 'Platonic plans', description: 'Making plans in group settings or daytime activities' },
    { name: 'Friend references', description: 'Referring to you as a friend or mentioning other friends' },
    { name: 'Normal distance', description: 'Maintaining typical friend physical boundaries' },
    { name: 'Open networking', description: 'Introducing to other friends without hesitation' },
    { name: 'Activity focus', description: 'Focus on shared interests and activities rather than personal connection' },
    { name: 'Friend dynamics', description: 'Treating you similarly to their other friends' },
  ]
};

export function TrackSignalsDialog({ isOpen, onClose, person, onSignalAdded }: TrackSignalsDialogProps) {
  const [selectedSignals, setSelectedSignals] = useState<{[key: string]: boolean}>({});
  const [notes, setNotes] = useState('');
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

      // 2. Save the signals and notes
      const selectedSignalsList = Object.entries(selectedSignals)
        .filter(([_, selected]) => selected)
        .map(([signal]) => signal);

      console.log('Saving signals:', {
        person_id: person.id,
        signals: selectedSignalsList,
        notes,
      });

      const { data: metadata, error: signalError } = await supabase
        .from('crm_person_metadata')
        .insert({
          person_id: person.id,
          category: 'signals',
          key: new Date().toISOString(),
          value: JSON.stringify({
            signals: selectedSignalsList,
            notes,
            timestamp: new Date().toISOString()
          })
        })
        .select();

      if (signalError) {
        console.error('Error details:', signalError);
        throw signalError;
      }

      console.log('Saved metadata:', metadata);

      // 3. Verify the save by fetching it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('crm_person_metadata')
        .select('*')
        .eq('person_id', person.id)
        .eq('category', 'signals')
        .order('created_at', { ascending: false })
        .limit(1);

      if (verifyError) {
        console.error('Verify error:', verifyError);
      } else {
        console.log('Verified metadata:', verifyData);
      }

      onSignalAdded();
      onClose();
      setSelectedSignals({});
      setNotes('');
    } catch (err) {
      console.error('Error saving signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to save signals. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Track Signals for {person.name}
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-5 w-5 text-rose-500" />
                    <h3 className="font-medium text-gray-900">Romantic Signals</h3>
                  </div>
                  <div className="space-y-2">
                    {signals.romantic.map((signal) => (
                      <div
                        key={signal.name}
                        className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSignals(prev => ({
                          ...prev,
                          [signal.name]: !prev[signal.name]
                        }))}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSignals[signal.name] || false}
                          onChange={() => {}} // Handled by div click
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">{signal.name}</div>
                          <div className="text-xs text-gray-500">{signal.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium text-gray-900">Friendship Signals</h3>
                  </div>
                  <div className="space-y-2">
                    {signals.friendship.map((signal) => (
                      <div
                        key={signal.name}
                        className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSignals(prev => ({
                          ...prev,
                          [signal.name]: !prev[signal.name]
                        }))}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSignals[signal.name] || false}
                          onChange={() => {}} // Handled by div click
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">{signal.name}</div>
                          <div className="text-xs text-gray-500">{signal.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any other observations or context..."
                  className="min-h-[100px]"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
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
                disabled={isSubmitting || (Object.keys(selectedSignals).length === 0 && !notes)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Signals'}
              </Button>
            </div>
          </form>
        </DialogContent>
    </Dialog>
  );
} 