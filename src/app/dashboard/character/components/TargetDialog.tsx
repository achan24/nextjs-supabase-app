import { Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from 'react';

interface TargetDialogProps {
  title: string;
  currentTarget: number;
  maxTarget?: number;
  onUpdateTarget: (newTarget: number) => void;
}

export function TargetDialog({
  title,
  currentTarget,
  maxTarget,
  onUpdateTarget
}: TargetDialogProps) {
  const [target, setTarget] = useState(currentTarget);

  const handleSubmit = () => {
    onUpdateTarget(target);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0.5">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Target for {title}</DialogTitle>
          <DialogDescription>
            Set your daily target points for this area. This represents how many points you aim to achieve each day.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={0}
              max={maxTarget}
              value={target}
              onChange={(e) => setTarget(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-32"
              aria-label={`Daily target points for ${title}`}
            />
            <span className="text-sm text-gray-500">points</span>
          </div>
          {maxTarget && (
            <p className="text-sm text-gray-500 mt-2">
              Maximum allowed: {maxTarget} points
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>
            Save Target
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 