'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Plus, Minus, ChevronRight, ChevronDown, Settings2, Target, BarChart2 } from 'lucide-react'
import { useGoalSystem } from '@/hooks/useGoalSystem'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LifeGoalArea, LifeGoalSubarea, LifeGoal } from '@/types/goal';
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { resetAllDailyPoints, savePointsToDate } from '@/services/characterProgressService'
import { updateXPFromPoints } from '@/services/characterService'
import { PointsHistoryDialog } from './PointsHistoryDialog'
import { format } from 'date-fns'
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const areaIcons: Record<string, string> = {
  'Work & Learning': '📚',
  'Health & Fitness': '💪',
  'Relationships': '❤️',
  'Environment & Hygiene': '🌿',
  'Finances': '💰',
  'Mental Health & Reflection': '🧘',
  'Play & Hobbies': '🎮'
}

interface TargetDialogProps {
  title: string;
  currentTarget: number;
  onUpdateTarget: (newTarget: number) => void;
}

function TargetDialog({ title, currentTarget = 1, onUpdateTarget }: TargetDialogProps) {
  const [newTarget, setNewTarget] = useState(currentTarget.toString())

  useEffect(() => {
    setNewTarget(currentTarget.toString())
  }, [currentTarget])

  const handleSave = () => {
    const parsedTarget = Math.max(1, parseInt(newTarget) || 1)
    onUpdateTarget(parsedTarget)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="target-dialog-description">
        <DialogHeader>
          <DialogTitle>Set Target for {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4" id="target-dialog-description">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min="1"
              value={newTarget}
              onChange={(e) => setNewTarget(e.currentTarget.value)}
              className="w-24"
            />
            <span>points</span>
          </div>
          <Button onClick={handleSave}>Save Target</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SetTargetsDialogProps {
  areas: LifeGoalArea[];
  onUpdateTargets: (areaId: string, target: number, type: 'area' | 'subarea' | 'goal') => void;
}

function SetTargetsDialog({ areas, onUpdateTargets }: SetTargetsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="h-4 w-4" />
          Set Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set Daily Targets</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {areas.map((area) => (
            <div key={area.id} className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-bold flex-1">{area.name}</span>
                <Input
                  type="number"
                  min="0"
                  defaultValue={area.target_points}
                  className="w-24"
                  onChange={(e) => onUpdateTargets(area.id, parseInt(e.target.value) || 0, 'area')}
                />
                <span className="text-sm text-gray-500 w-12">points</span>
              </div>
              {area.subareas.map((subarea) => (
                <div key={subarea.id} className="ml-6 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="flex-1">{subarea.name}</span>
                    <Input
                      type="number"
                      min="0"
                      defaultValue={subarea.target_points}
                      className="w-24"
                      onChange={(e) => onUpdateTargets(subarea.id, parseInt(e.target.value) || 0, 'subarea')}
                    />
                    <span className="text-sm text-gray-500 w-12">points</span>
                  </div>
                  {subarea.goals.map((goal) => (
                    <div key={goal.id} className="ml-6 flex items-center gap-4">
                      <span className="flex-1 text-sm text-gray-700">{goal.title}</span>
                      <Input
                        type="number"
                        min="0"
                        defaultValue={goal.target_points}
                        className="w-24"
                        onChange={(e) => onUpdateTargets(goal.id, parseInt(e.target.value) || 0, 'goal')}
                      />
                      <span className="text-sm text-gray-500 w-12">points</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ProgressItemProps {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  level: 'area' | 'subarea' | 'goal';
  icon?: string;
  isExpanded: boolean;
  hasChildren: boolean;
  completionLikelihood?: number;
  onToggle: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onUpdateTarget?: (newTarget: number) => void;
  onClick?: () => void;
}

function ProgressItem({
  id,
  title,
  currentValue,
  targetValue,
  level,
  icon,
  isExpanded,
  hasChildren,
  completionLikelihood,
  onToggle,
  onIncrement,
  onDecrement,
  onUpdateTarget,
  onClick
}: ProgressItemProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const progressPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

  // Check if item is completed whenever currentValue or targetValue changes
  useEffect(() => {
    const completed = targetValue > 0 && currentValue >= targetValue;
    if (completed && !isCompleted) {
      // Item just got completed
      setIsCompleted(true);
      toast.success(`${title} completed! 🎉`);
    } else if (!completed && isCompleted) {
      // Item is no longer completed
      setIsCompleted(false);
    }
  }, [currentValue, targetValue, title, isCompleted]);

  return (
    <div 
      className={`
        pl-${level === 'goal' ? 8 : level === 'subarea' ? 4 : 0} 
        transition-all duration-500 
        group
        ${isCompleted ? 'opacity-0 hover:opacity-100 focus-within:opacity-100' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1">
            {hasChildren && (
              <button
                onClick={onToggle}
                className="p-0.5 hover:bg-gray-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <div
              className={`flex items-center gap-2 flex-1 ${onClick ? 'cursor-pointer hover:text-blue-600' : ''}`}
              onClick={onClick}
            >
              {icon && <span className={level === 'area' ? 'text-lg' : ''}>{icon}</span>}
              <span className={`
                ${level === 'area' ? 'text-lg font-bold' : ''}
                ${level === 'subarea' ? 'font-medium' : ''}
                ${level === 'goal' ? 'text-sm text-gray-600' : ''}
              `}>{title}</span>
              {isCompleted && (
                <span className="text-green-500 text-sm font-medium ml-2">
                  ✓ Complete
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`${level === 'area' ? 'h-7 w-7' : 'h-6 w-6'}`}
            onClick={onDecrement}
          >
            <Minus className={`${level === 'area' ? 'h-5 w-5' : 'h-4 w-4'}`} />
          </Button>
          <div className="flex flex-col items-center">
            <span className={`text-sm w-12 text-center ${level === 'goal' ? 'text-gray-600' : ''}`}>
              {currentValue} / {targetValue}
            </span>
            {completionLikelihood !== undefined && (
              <span className="text-xs text-blue-600 font-medium">
                {completionLikelihood < 0.5 ? '0' : completionLikelihood.toFixed(0)}%
                {title === 'Dancing' && ` (${completionLikelihood}%)`}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`${level === 'area' ? 'h-7 w-7' : 'h-6 w-6'}`}
            onClick={onIncrement}
          >
            <Plus className={`${level === 'area' ? 'h-5 w-5' : 'h-4 w-4'}`} />
          </Button>
          {onUpdateTarget && (
            <>
              <TargetDialog
                title={title}
                currentTarget={targetValue}
                onUpdateTarget={onUpdateTarget}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setHistoryOpen(true)}
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <Progress 
        value={progressPercentage} 
        className={`h-1 mt-0.5 transition-all duration-500 ${
          isCompleted ? 'bg-green-100' : ''
        }`}
      />
      <PointsHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        id={id}
        type={level}
        title={title}
      />
    </div>
  );
}

// Add these helper types and functions at the top of the file
interface VisibilityCheck {
  daily_points?: number;
  target_points?: number;
  status?: string;
}

const isComplete = (item: VisibilityCheck): boolean => {
  const current = item.daily_points || 0;
  const target = item.target_points || 0;
  return target > 0 && current >= target;
};

const isVisible = (showCompleted: boolean) => 
  (item: VisibilityCheck & { status?: string }) => {
    if (!showCompleted) {
      // For goals, check active status
      if ('status' in item && item.status !== 'active') {
        return false;
      }
      // Hide if complete
      return !isComplete(item);
    }
    return true;
  };

// Custom Tick Component for two-line date display
// Add completion likelihood calculation function
function calculateCompletionLikelihood(history: Array<{date: string, completed: boolean}>): number {
  console.log(`[CALCULATION DEBUG] Input history:`, history);
  
  if (history.length === 0) {
    console.log(`[CALCULATION DEBUG] No history data, returning 0%`);
    return 0; // No data = never completed = 0% chance
  }
  
  const recentWeight = 0.5; // 50% weight to recent days
  const consistencyWeight = 0.5; // 50% weight to overall consistency
  
  // Recent completion rate (last 7 days)
  const recentDays = history.slice(-7);
  const recentRate = recentDays.length > 0 ? 
    recentDays.filter(h => h.completed).length / recentDays.length : 0;
  
  // Overall completion rate
  const overallRate = history.filter(h => h.completed).length / history.length;
  
  // Current streak bonus
  let currentStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].completed) {
      currentStreak++;
    } else {
      break;
    }
  }
  const streakBonus = Math.min(currentStreak / 10, 0.1); // Max 10% bonus for 10+ day streak
  
  console.log(`[CALCULATION DEBUG] Recent days: ${recentDays.length}, Recent rate: ${recentRate}`);
  console.log(`[CALCULATION DEBUG] Overall rate: ${overallRate}, Current streak: ${currentStreak}, Streak bonus: ${streakBonus}`);
  
  // Calculate likelihood
  const likelihood = (recentRate * recentWeight + overallRate * consistencyWeight) * 100 + streakBonus * 100;
  
  console.log(`[CALCULATION DEBUG] Calculation breakdown:`);
  console.log(`  - Recent contribution: ${recentRate * recentWeight * 100}%`);
  console.log(`  - Overall contribution: ${overallRate * consistencyWeight * 100}%`);
  console.log(`  - Streak bonus: ${streakBonus * 100}%`);
  console.log(`  - Final likelihood: ${likelihood}%`);
  
  return Math.min(Math.max(likelihood, 0), 98);
}

const CustomTick = ({ x, y, payload }: any) => {
  if (!payload || !payload.value) return null;
  
  const [date, day] = payload.value.split('\n');
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={10}>
        {date}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="#999" fontSize={9}>
        {day}
      </text>
    </g>
  );
};

// Progress Graph Component
function ProgressGraph({ areas }: { areas: LifeGoalArea[] }) {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [dailyBreakdowns, setDailyBreakdowns] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const supabase = createClient();

  // Calculate current total score and target
  const currentScore = areas.reduce((total, area) => total + (area.daily_points || 0), 0);
  const targetScore = areas.reduce((total, area) => total + (area.target_points || 0), 0);

  // Get areas with points for today's breakdown
  const areasWithPoints = areas.filter(area => (area.daily_points || 0) > 0);

  // Create a map for quick lookup of area order
  const areaOrderMap = new Map(areas.map((area, index) => [area.id, index]));

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        // Get the last 9 days of history (we'll add today separately)
        const nineDaysAgo = new Date();
        nineDaysAgo.setDate(nineDaysAgo.getDate() - 9);
        
        const { data, error } = await supabase
          .from('area_points_history')
          .select('*')
          .gte('date', nineDaysAgo.toISOString().split('T')[0])
          .lt('date', new Date().toISOString().split('T')[0]) // Exclude today
          .order('date', { ascending: true });

        if (error) throw error;

        // Group by date and sum total points
        const groupedData = data?.reduce((acc: any, record: any) => {
          const date = record.date;
          if (!acc[date]) {
            acc[date] = { date, totalPoints: 0 };
          }
          acc[date].totalPoints += record.points || 0;
          return acc;
        }, {});

        // Create array with exactly 10 days (9 historical + today)
        const chartData = [];
        
        for (let i = 9; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dateLabel = format(date, 'MMM d');
          const dayLabel = format(date, 'EEE');
          
          if (i === 0) {
            // Today - use current score
            chartData.push({
              date: `${dateLabel}\n${dayLabel}`,
              points: currentScore,
              dateStr: dateStr
            });
          } else {
            // Historical days - use data from database or 0
            const historicalPoints = groupedData?.[dateStr]?.totalPoints || 0;
            chartData.push({
              date: `${dateLabel}\n${dayLabel}`,
              points: historicalPoints,
              dateStr: dateStr
            });
          }
        }

        setHistoryData(chartData);
      } catch (error) {
        console.error('Error fetching history:', error);
        // Create fallback data with exactly 10 days
        const fallbackData = [];
        
        for (let i = 9; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dateLabel = format(date, 'MMM d');
          const dayLabel = format(date, 'EEE');
          
          fallbackData.push({
            date: `${dateLabel}\n${dayLabel}`,
            points: i === 0 ? currentScore : 0,
            dateStr: dateStr
          });
        }
        
        setHistoryData(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [areas, currentScore]);

  // Function to fetch breakdown data for a specific date
  const fetchBreakdownForDate = async (dateStr: string) => {
    if (dailyBreakdowns[dateStr]) {
      return; // Already loaded
    }

    try {
      // Check if it's today
      const today = new Date().toISOString().split('T')[0];
      if (dateStr === today) {
        // Today's breakdown from current areas
        const todayBreakdown = areasWithPoints.map(area => ({
          name: area.name,
          points: area.daily_points || 0,
          target: area.target_points || 0
        }));
        // Sort today's breakdown to match areas order
        todayBreakdown.sort((a, b) => {
          const orderA = areaOrderMap.get(areas.find(area => area.name === a.name)?.id || '');
          const orderB = areaOrderMap.get(areas.find(area => area.name === b.name)?.id || '');
          return (orderA !== undefined ? orderA : Infinity) - (orderB !== undefined ? orderB : Infinity);
        });
        setDailyBreakdowns(prev => ({ ...prev, [dateStr]: todayBreakdown }));
        return;
      }

      // Historical breakdown from database
      const { data, error } = await supabase
        .from('area_points_history')
        .select(`
          area_id,
          points,
          target,
          life_goal_areas!inner(name)
        `)
        .eq('date', dateStr);

      if (error) throw error;

      const breakdown = data?.map((record: any) => ({
        name: record.life_goal_areas.name,
        points: record.points || 0,
        target: record.target || 0
      })) || [];

      // Sort historical breakdown to match areas order
      breakdown.sort((a, b) => {
        const orderA = areaOrderMap.get(areas.find(area => area.name === a.name)?.id || '');
        const orderB = areaOrderMap.get(areas.find(area => area.name === b.name)?.id || '');
        return (orderA !== undefined ? orderA : Infinity) - (orderB !== undefined ? orderB : Infinity);
      });

      setDailyBreakdowns(prev => ({ ...prev, [dateStr]: breakdown }));
    } catch (error) {
      console.error('Error fetching breakdown for date:', dateStr, error);
      setDailyBreakdowns(prev => ({ ...prev, [dateStr]: [] }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Daily Progress</h3>
          <div className="relative group">
            <div className="text-sm text-gray-600 cursor-help">
              {currentScore}/{targetScore} points
            </div>
            {/* Hover tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              <div className="font-medium mb-1">Today's Points Breakdown:</div>
              {areasWithPoints.length > 0 ? (
                <div className="space-y-1">
                  {areasWithPoints.map((area) => (
                    <div key={area.id} className="flex justify-between gap-2">
                      <span>{area.name}:</span>
                      <span className="font-medium">{area.daily_points} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-300">No points earned today</div>
              )}
              <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
        <div className="h-[120px] flex items-center justify-center text-gray-500">
          Loading history...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Daily Progress</h3>
        <div className="relative group">
          <div className="text-sm text-gray-600 cursor-help">
            {currentScore}/{targetScore} points
          </div>
          {/* Hover tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            <div className="font-medium mb-1">Today's Points Breakdown:</div>
            {areasWithPoints.length > 0 ? (
              <div className="space-y-1">
                {areasWithPoints.map((area) => (
                  <div key={area.id} className="flex justify-between gap-2">
                    <span>{area.name}:</span>
                    <span className="font-medium">{area.daily_points} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-300">No points earned today</div>
            )}
            <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={historyData} margin={{ left: 10, right: 10, top: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={<CustomTick />}
            interval={0} // Show all 10 days
          />
          <YAxis 
            tick={{ fontSize: 10 }}
            domain={[0, 'dataMax + 2']}
          />
          <Tooltip 
            content={({ active, payload, label }: any) => {
              if (active && payload && payload.length) {
                const dataPoint = payload[0].payload;
                const dateStr = dataPoint.dateStr;
                const totalPoints = dataPoint.points;
                
                // Fetch breakdown data when hovering
                if (!dailyBreakdowns[dateStr]) {
                  fetchBreakdownForDate(dateStr);
                }
                
                const breakdown = dailyBreakdowns[dateStr] || [];
                
                return (
                  <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-800">
                    <div className="font-medium mb-2">Date: {label}</div>
                    <div className="font-medium mb-2">Total Points: {totalPoints} points</div>
                    {breakdown.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300 mb-1">Breakdown:</div>
                        {breakdown.map((area: any, index: number) => (
                          <div key={index} className="flex justify-between gap-2 text-xs">
                            <span>{area.name}:</span>
                            <span className="font-medium">{area.points} pts</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-300">
                        {dailyBreakdowns[dateStr] ? 'No points earned' : 'Loading...'}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Line 
            type="monotone" 
            dataKey="points" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ProgressBars() {
  const router = useRouter();
  const { areas, loading, updateArea, updateSubarea, updateGoal, fetchAreas } = useGoalSystem();
  const supabase = createClient();
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [expandedSubareas, setExpandedSubareas] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [saveYesterdayDialogOpen, setSaveYesterdayDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completionLikelihoods, setCompletionLikelihoods] = useState<Record<string, number>>({});

  // Add check for all targets complete
  const allTargetsComplete = React.useMemo(() => {
    return areas.every(area => {
      if (!area.target_points) return true;
      return area.daily_points >= area.target_points;
    });
  }, [areas]);

  // Keep existing visibleAreas computation
  const visibleAreas = React.useMemo(() => {
    return areas.map(area => {
      return {
        ...area,
        subareas: area.subareas.map(subarea => ({
          ...subarea,
          goals: subarea.goals.filter(goal => goal.status === 'active')
        }))
      };
    });
  }, [areas]);

  // Function to fetch history and calculate likelihood for an item
  const fetchItemLikelihood = async (id: string, type: 'area' | 'subarea' | 'goal') => {
    try {
      let tableName: string;
      let idColumn: string;
      
      switch (type) {
        case 'area':
          tableName = 'area_points_history';
          idColumn = 'area_id';
          break;
        case 'subarea':
          tableName = 'subarea_points_history';
          idColumn = 'subarea_id';
          break;
        case 'goal':
          tableName = 'goal_points_history';
          idColumn = 'goal_id';
          break;
        default:
          return;
      }
      
      console.log(`[LIKELIHOOD DEBUG] Fetching ${type} ${id} from ${tableName}`);
      
      // Get ALL history from the first entry, not just last 30 days
      const { data, error } = await supabase
        .from(tableName)
        .select('date, points')
        .eq(idColumn, id)
        .order('date', { ascending: true });

      if (error) throw error;

      console.log(`[LIKELIHOOD DEBUG] Raw data for ${type} ${id}:`, data);

      if (!data || data.length === 0) {
        console.log(`[LIKELIHOOD DEBUG] No data found for ${type} ${id}`);
        setCompletionLikelihoods(prev => ({
          ...prev,
          [id]: 0
        }));
        return;
      }

      // Get the date range from first to last entry
      const firstDate = new Date(data[0].date);
      const lastDate = new Date(data[data.length - 1].date);
      const today = new Date();
      
      // Create a complete history with all days from first entry to today
      const completionHistory = [];
      const currentDate = new Date(firstDate);
      
      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const record = data.find(d => d.date === dateStr);
        
        completionHistory.push({
          date: dateStr,
          completed: record ? record.points > 0 : false // false for missing days
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`[LIKELIHOOD DEBUG] Complete history for ${type} ${id}:`, completionHistory);
      
      // Debug for Dancing specifically
      if (type === 'subarea' && id === '2f865010-1cd9-4d2f-8384-aa248f60b692') {
        console.log(`[DANCING DEBUG] Raw data:`, data);
        console.log(`[DANCING DEBUG] Completion history:`, completionHistory);
        console.log(`[DANCING DEBUG] Completed days:`, completionHistory.filter(h => h.completed));
        console.log(`[DANCING DEBUG] Total days:`, completionHistory.length);
      }

      // Calculate likelihood
      const likelihood = calculateCompletionLikelihood(completionHistory);
      
      console.log(`[LIKELIHOOD DEBUG] Calculated likelihood for ${type} ${id}: ${likelihood}%`);
      
      setCompletionLikelihoods(prev => ({
        ...prev,
        [id]: likelihood
      }));
    } catch (error) {
      console.error(`Error fetching likelihood for ${type} ${id}:`, error);
      // Set default likelihood if error
      setCompletionLikelihoods(prev => ({
        ...prev,
        [id]: 0
      }));
    }
  };

  // Fetch likelihoods when areas change
  useEffect(() => {
    if (areas.length > 0) {
      // Fetch likelihoods for all areas, subareas, and goals
      areas.forEach(area => {
        fetchItemLikelihood(area.id, 'area');
        area.subareas.forEach(subarea => {
          fetchItemLikelihood(subarea.id, 'subarea');
          subarea.goals.forEach(goal => {
            if (goal.status === 'active') {
              fetchItemLikelihood(goal.id, 'goal');
            }
          });
        });
      });
    }
  }, [areas]);

  const handleUpdateTarget = async (id: string, newTarget: number, type: 'area' | 'subarea' | 'goal' = 'area') => {
    try {
      if (type === 'subarea') {
        await updateSubarea(id, { target_points: newTarget });
      } else if (type === 'goal') {
        await updateGoal(id, { target_points: newTarget });
      } else {
        await updateArea(id, { target_points: newTarget });
      }
    } catch (error) {
      console.error('Error updating target:', error);
      toast.error('Failed to update target');
    }
  };

  const handleIncrement = async (id: string, type: 'area' | 'subarea' | 'goal' = 'area') => {
    try {
      let current = 0;

      if (type === 'goal') {
        const { data: goal } = await supabase
          .from('life_goals')
          .select('*, life_goal_subareas!inner(*, life_goal_areas!inner(*))')
          .eq('id', id)
          .single();

        if (!goal) {
          console.error('[INCREMENT GOAL] Goal not found');
          return;
        }

        current = goal.daily_points || 0;
        await updateGoal(id, { daily_points: current + 1 });

        const subarea = goal.life_goal_subareas;
        current = subarea.daily_points || 0;
        await updateSubarea(subarea.id, { daily_points: current + 1 });

        const area = subarea.life_goal_areas;
        current = area.daily_points || 0;
        await updateArea(area.id, { daily_points: current + 1 });

      } else if (type === 'subarea') {
        const { data: subarea } = await supabase
          .from('life_goal_subareas')
          .select('*, life_goal_areas!inner(*)')
          .eq('id', id)
          .single();

        if (!subarea) {
          console.error('[INCREMENT SUBAREA] Subarea not found');
          return;
        }

        current = subarea.daily_points || 0;
        await updateSubarea(id, { daily_points: current + 1 });

        const area = subarea.life_goal_areas;
        current = area.daily_points || 0;
        await updateArea(area.id, { daily_points: current + 1 });

      } else {
        const { data: area } = await supabase
          .from('life_goal_areas')
          .select('*')
          .eq('id', id)
          .single();

        if (!area) {
          console.error('[INCREMENT AREA] Area not found');
          return;
        }

        current = area.daily_points || 0;
        await updateArea(id, { daily_points: current + 1 });
      }

      await fetchAreas();
    } catch (error) {
      console.error('[INCREMENT ERROR]', error);
      toast.error('Failed to increment points');
    }
  };

  const handleDecrement = async (id: string, type: 'area' | 'subarea' | 'goal' = 'area') => {
    try {
      let current = 0;

      if (type === 'goal') {
        const { data: goal } = await supabase
          .from('life_goals')
          .select('*, life_goal_subareas!inner(*, life_goal_areas!inner(*))')
          .eq('id', id)
          .single();

        if (!goal) {
          console.error('[DECREMENT GOAL] Goal not found');
          return;
        }

        if (goal.daily_points <= 0) return;

        current = goal.daily_points;
        await updateGoal(id, { daily_points: current - 1 });

        const subarea = goal.life_goal_subareas;
        current = subarea.daily_points;
        if (current > 0) {
          await updateSubarea(subarea.id, { daily_points: current - 1 });
        }

        const area = subarea.life_goal_areas;
        current = area.daily_points;
        if (current > 0) {
          await updateArea(area.id, { daily_points: current - 1 });
        }

      } else if (type === 'subarea') {
        const { data: subarea } = await supabase
          .from('life_goal_subareas')
          .select('*, life_goal_areas!inner(*)')
          .eq('id', id)
          .single();

        if (!subarea) {
          console.error('[DECREMENT SUBAREA] Subarea not found');
          return;
        }

        if (subarea.daily_points <= 0) return;

        current = subarea.daily_points;
        await updateSubarea(id, { daily_points: current - 1 });

        const area = subarea.life_goal_areas;
        current = area.daily_points;
        if (current > 0) {
          await updateArea(area.id, { daily_points: current - 1 });
        }

      } else {
        const { data: area } = await supabase
          .from('life_goal_areas')
          .select('*')
          .eq('id', id)
          .single();

        if (!area) {
          console.error('[DECREMENT AREA] Area not found');
          return;
        }

        if (area.daily_points <= 0) return;

        current = area.daily_points;
        await updateArea(id, { daily_points: current - 1 });
      }

      await fetchAreas();
    } catch (error) {
      console.error('[DECREMENT ERROR]', error);
      toast.error('Failed to decrement points');
    }
  };

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaId]: !prev[areaId]
    }));
  };

  const toggleSubarea = (subareaId: string) => {
    setExpandedSubareas(prev => ({
      ...prev,
      [subareaId]: !prev[subareaId]
    }));
  };

  const handleGoalClick = (areaId: string, subareaId?: string, goalId?: string) => {
    if (goalId) {
      router.push(`/dashboard/goal?tab=goals&goal=${goalId}&subarea=${subareaId}`);
    } else if (subareaId) {
      router.push(`/dashboard/goal?tab=goals&subarea=${subareaId}`);
    } else {
      router.push(`/dashboard/goal?tab=goals&area=${areaId}`);
    }
  };

  const handleResetPoints = async () => {
    if (!user?.id) return;
    try {
      await resetAllDailyPoints(user.id);
      await supabase
        .from('characters')
        .update({ xp: 0, level: 1 })
        .eq('user_id', user.id);
      await fetchAreas();
      toast.success('Daily points have been reset.');
      setResetDialogOpen(false);
    } catch (error) {
      console.error('Error in handleResetPoints:', error);
      toast.error('Failed to reset daily points. Please try again.');
    }
  };

  const handleSaveToYesterday = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = format(yesterday, 'yyyy-MM-dd');
    
    try {
      await savePointsToDate(formattedDate);
      await fetchAreas();
      toast.success('Points saved to yesterday');
      setSaveYesterdayDialogOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save points');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <SetTargetsDialog areas={areas} onUpdateTargets={handleUpdateTarget} />
        <Button variant="outline" size="sm" onClick={handleSaveToYesterday}>
          Save as Yesterday's Points
        </Button>
        <Button variant="outline" size="sm" onClick={handleResetPoints}>
          Reset Daily
        </Button>
      </div>

      {/* Progress Graph */}
      <ProgressGraph areas={areas} />

      {allTargetsComplete && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-900 rounded-lg p-8 text-center max-w-2xl mx-auto my-12">
          <h3 className="text-2xl font-semibold text-green-800 dark:text-green-200 mb-4">
            🎉 Amazing Job! All Daily Targets Complete! 🎉
          </h3>
          <p className="text-lg text-green-600 dark:text-green-300">
            You've hit all your goals for today. Keep up the great work!
          </p>
        </div>
      )}

      <div className="space-y-4">
        {visibleAreas.map((area) => (
          <div key={area.id} className="space-y-1">
            <ProgressItem
              id={area.id}
              title={area.name}
              currentValue={area.daily_points || 0}
              targetValue={area.target_points || 0}
              level="area"
              icon={areaIcons[area.name]}
              isExpanded={expandedAreas[area.id]}
              hasChildren={area.subareas.length > 0}
              completionLikelihood={completionLikelihoods[area.id]}
              onToggle={() => toggleArea(area.id)}
              onIncrement={() => handleIncrement(area.id, 'area')}
              onDecrement={() => handleDecrement(area.id, 'area')}
              onUpdateTarget={(target) => handleUpdateTarget(area.id, target, 'area')}
            />
            {expandedAreas[area.id] && (
              <div className="ml-6 space-y-1">
                {area.subareas.map((subarea) => (
                  <div key={subarea.id} className="space-y-1">
                    <ProgressItem
                      id={subarea.id}
                      title={subarea.name}
                      currentValue={subarea.daily_points || 0}
                      targetValue={subarea.target_points || 0}
                      level="subarea"
                      isExpanded={expandedSubareas[subarea.id]}
                      hasChildren={subarea.goals.length > 0}
                      completionLikelihood={completionLikelihoods[subarea.id]}
                      onToggle={() => toggleSubarea(subarea.id)}
                      onIncrement={() => handleIncrement(subarea.id, 'subarea')}
                      onDecrement={() => handleDecrement(subarea.id, 'subarea')}
                      onUpdateTarget={(target) => handleUpdateTarget(subarea.id, target, 'subarea')}
                    />
                    {expandedSubareas[subarea.id] && (
                      <div className="ml-6 space-y-1">
                        {subarea.goals.map((goal) => (
                          <ProgressItem
                            key={goal.id}
                            id={goal.id}
                            title={goal.title}
                            currentValue={goal.daily_points || 0}
                            targetValue={goal.target_points || 0}
                            level="goal"
                            isExpanded={false}
                            hasChildren={false}
                            completionLikelihood={completionLikelihoods[goal.id]}
                            onToggle={() => {}}
                            onIncrement={() => handleIncrement(goal.id, 'goal')}
                            onDecrement={() => handleDecrement(goal.id, 'goal')}
                            onUpdateTarget={(target) => handleUpdateTarget(goal.id, target, 'goal')}
                            onClick={() => handleGoalClick(area.id, subarea.id, goal.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 