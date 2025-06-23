'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGoalSystem } from '@/hooks/useGoalSystem';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ProcessFlow {
  id: string;
  title: string;
  description?: string;
}

interface ProcessFlowLinkButtonProps {
  goalId: string;
  goalTitle: string;
}

export function ProcessFlowLinkButton({ goalId, goalTitle }: ProcessFlowLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [flows, setFlows] = useState<ProcessFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const { linkProcessFlow } = useGoalSystem();
  const supabase = createClient();

  useEffect(() => {
    const loadFlows = async () => {
      try {
        const { data, error } = await supabase
          .from('process_flows')
          .select('id, title, description')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFlows(data || []);
      } catch (err) {
        console.error('Error loading process flows:', err);
        toast.error('Failed to load process flows');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadFlows();
    }
  }, [isOpen, supabase]);

  const handleLinkFlow = async (flowId: string) => {
    try {
      await linkProcessFlow(goalId, flowId);
      toast.success('Process flow linked successfully');
      setIsOpen(false);
    } catch (err) {
      console.error('Error linking process flow:', err);
      toast.error('Failed to link process flow');
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Process Flow to {goalTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : flows.length > 0 ? (
              <div className="space-y-2">
                {flows.map((flow) => (
                  <div
                    key={flow.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-600 cursor-pointer transition-colors"
                    onClick={() => handleLinkFlow(flow.id)}
                  >
                    <div>
                      <h3 className="font-medium">{flow.title}</h3>
                      {flow.description && (
                        <p className="text-sm text-gray-600">{flow.description}</p>
                      )}
                    </div>
                    <Plus className="w-4 h-4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No process flows available
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t bg-white sticky bottom-0 z-10">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 