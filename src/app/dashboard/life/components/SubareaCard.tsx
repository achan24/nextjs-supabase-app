import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Target } from 'lucide-react';
import { LifeGoal, LifeGoalSubarea } from '@/types/goal';

interface SubareaCardProps {
  subarea: LifeGoalSubarea;
  onEdit: () => void;
  onDelete: () => void;
}

export function SubareaCard({ subarea, onEdit, onDelete }: SubareaCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{subarea.name}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-500">Goals</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/goal?subarea=${subarea.id}`)}
              >
                View Goals ({subarea.goals?.length || 0})
              </Button>
            </div>
            {subarea.goals && subarea.goals.length > 0 ? (
              <ul className="space-y-2">
                {subarea.goals.map((goal: LifeGoal) => (
                  <li 
                    key={goal.id}
                    onClick={() => router.push(`/dashboard/goal?goal=${goal.id}`)}
                    className="flex justify-between items-start cursor-pointer hover:bg-gray-50 rounded p-2 -mx-2"
                  >
                    <div>
                      <span className="font-medium">{goal.title}</span>
                      {goal.description && (
                        <p className="text-sm text-gray-600">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Target className="w-3 h-3" />
                      <span>{goal.milestones?.length || 0} milestone{goal.milestones?.length !== 1 ? 's' : ''}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No goals yet</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 