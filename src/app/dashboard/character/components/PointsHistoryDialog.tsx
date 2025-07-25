import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePointsHistory } from '@/hooks/usePointsHistory';
import { format } from 'date-fns';

interface PointsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  type: 'area' | 'subarea' | 'goal';
  title: string;
}

export function PointsHistoryDialog({ open, onOpenChange, id, type, title }: PointsHistoryDialogProps) {
  const { history, loading, error, fetchHistory } = usePointsHistory();

  useEffect(() => {
    if (open && id) {
      fetchHistory(id, type);
    }
  }, [open, id, type, fetchHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Points History - {title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 py-4">
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">Error loading history: {error.message}</div>}
          {!loading && !error && (
            <div className="overflow-auto max-h-full">
              <table className="w-full">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Points</th>
                    <th className="text-right py-2">Target</th>
                    <th className="text-right py-2">% of Target</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.date} className="border-b">
                      <td className="py-2">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                      <td className="text-right py-2">{entry.points}</td>
                      <td className="text-right py-2">{entry.target}</td>
                      <td className="text-right py-2">
                        {entry.target > 0 
                          ? `${Math.round((entry.points / entry.target) * 100)}%`
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 