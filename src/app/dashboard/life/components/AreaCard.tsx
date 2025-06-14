import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Target } from 'lucide-react';
import { LifeGoalArea } from '@/types/goal';

interface AreaCardProps {
  area: LifeGoalArea;
  onEdit: () => void;
  onDelete: () => void;
}

export function AreaCard({ area, onEdit, onDelete }: AreaCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{area.name}</span>
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
        {area.subareas.map(subarea => (
          <div key={subarea.id} className="mb-6 last:mb-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">{subarea.name}</h3>
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
                {subarea.goals.map(goal => (
                  <li 
                    key={goal.id}
                    onClick={() => router.push(`/dashboard/goal?goal=${goal.id}`)}
                    className="flex justify-between items-start p-2 -mx-2 rounded cursor-pointer transition-colors hover:bg-gray-100 border border-transparent hover:border-gray-200"
                  >
                    <div>
                      <span className="font-medium text-blue-600 hover:text-blue-800">{goal.title}</span>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
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
        ))}
      </CardContent>
    </Card>
  );
} 