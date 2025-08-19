'use client';

import { useEffect, useState } from "react";
import { CalendarDays, Target, Plus, Trash2, Save, Calendar, DollarSign, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ========================= Types =========================

type UUID = string;

type BudgetPlan = {
  id: UUID;
  user_id: string;
  week_start: string; // ISO date for Monday of the week
  total_budget: number;
  created_at: string;
  updated_at: string;
};

type BudgetPlanItem = {
  id: UUID;
  plan_id: UUID;
  category: string;
  planned_amount: number;
  day_of_week: number; // 0-6 (Monday = 0, Sunday = 6)
  note?: string;
  created_at: string;
  updated_at: string;
};

type BudgetPlanWithItems = BudgetPlan & {
  items: BudgetPlanItem[];
};

// ========================= Constants =========================

const PLANNER_CATEGORIES = [
  "Groceries",
  "Dining Out",
  "Transport",
  "Entertainment",
  "Shopping",
  "Health",
  "Utilities",
  "Other"
];

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday", 
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const CATEGORY_COLORS: Record<string, string> = {
  "Groceries": "#10B981",
  "Dining Out": "#F59E0B",
  "Transport": "#3B82F6",
  "Entertainment": "#EC4899",
  "Shopping": "#8B5CF6",
  "Health": "#06B6D4",
  "Utilities": "#EF4444",
  "Other": "#6B7280"
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#6B7280";
}

const CURRENCY = "€";

function currency(n: number) {
  return `${CURRENCY}${n.toFixed(2)}`;
}

// ========================= Components =========================

function BudgetPlanForm({ 
  onSave, 
  initialBudget = 0 
}: { 
  onSave: (budget: number) => void;
  initialBudget?: number;
}) {
  const [totalBudget, setTotalBudget] = useState(initialBudget.toString());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-4 h-4"/>
          Set Weekly Budget
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              type="number"
              step="0.01"
              placeholder="Total weekly budget"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
            />
          </div>
          <Button
            onClick={() => {
              const budget = parseFloat(totalBudget);
              if (isNaN(budget) || budget <= 0) {
                toast.error("Please enter a valid budget amount");
                return;
              }
              onSave(budget);
              toast.success("Weekly budget set!");
            }}
          >
            <Save className="w-4 h-4 mr-2"/>
            Save Budget
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanItemForm({ 
  onAdd, 
  remainingBudget 
}: { 
  onAdd: (item: Omit<BudgetPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at'>) => void;
  remainingBudget: number;
}) {
  const [category, setCategory] = useState(PLANNER_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("0");
  const [note, setNote] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-4 h-4"/>
          Add Planned Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANNER_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day, index) => (
                <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Remaining: {currency(remainingBudget)}
          </div>
          <Button
            onClick={() => {
              const amt = parseFloat(amount);
              if (isNaN(amt) || amt <= 0) {
                toast.error("Please enter a valid amount");
                return;
              }
              if (amt > remainingBudget) {
                toast.error("Amount exceeds remaining budget");
                return;
              }
              onAdd({
                category,
                planned_amount: amt,
                day_of_week: parseInt(dayOfWeek),
                note: note || undefined
              });
              setAmount("");
              setNote("");
              toast.success("Planned expense added!");
            }}
          >
            Add to Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyPlanView({ 
  plan, 
  onDeleteItem,
  selectedDay,
  setSelectedDay,
  viewMode,
  setViewMode
}: { 
  plan: BudgetPlanWithItems;
  onDeleteItem: (itemId: UUID) => void;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  viewMode: '1' | '3' | '5';
  setViewMode: (mode: '1' | '3' | '5') => void;
}) {
  const weekStart = parseISO(plan.week_start);
  const totalPlanned = plan.items.reduce((sum, item) => sum + item.planned_amount, 0);
  const remaining = plan.total_budget - totalPlanned;

  return (
    <div className="space-y-6">
      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Budget</div>
            <div className="text-2xl font-semibold text-green-600">{currency(plan.total_budget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Planned</div>
            <div className="text-2xl font-semibold text-blue-600">{currency(totalPlanned)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Remaining</div>
            <div className={`text-2xl font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currency(remaining)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Items</div>
            <div className="text-2xl font-semibold">{plan.items.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Budget Usage</span>
            <span className="text-sm text-gray-600">
              {currency(totalPlanned)} / {currency(plan.total_budget)}
            </span>
          </div>
          <Progress 
            value={Math.min((totalPlanned / plan.total_budget) * 100, 100)} 
            className="h-3"
          />
        </CardContent>
      </Card>

            {/* Weekly Schedule Carousel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4"/>
              Weekly Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex border rounded-lg">
                <button
                  onClick={() => setViewMode('1')}
                  className={`px-3 py-1 text-sm font-medium rounded-l-lg transition-colors ${
                    viewMode === '1' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  1 Day
                </button>
                <button
                  onClick={() => setViewMode('3')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    viewMode === '3' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  3 Days
                </button>
                <button
                  onClick={() => setViewMode('5')}
                  className={`px-3 py-1 text-sm font-medium rounded-r-lg transition-colors ${
                    viewMode === '5' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  5 Days
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Navigation Buttons */}
            <button 
              onClick={() => setSelectedDay(prev => Math.max(0, prev - 1))}
              disabled={selectedDay === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setSelectedDay(prev => Math.min(6, prev + 1))}
              disabled={selectedDay === 6}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Day Cards Container */}
            <div className="flex overflow-hidden">
              {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                const dayItems = plan.items.filter(item => item.day_of_week === dayIndex);
                const dayTotal = dayItems.reduce((sum, item) => sum + item.planned_amount, 0);
                const dayDate = addDays(weekStart, dayIndex);
                
                // Calculate which days to show based on view mode
                const daysToShow = parseInt(viewMode);
                const startDay = Math.max(0, selectedDay - Math.floor(daysToShow / 2));
                const endDay = Math.min(6, startDay + daysToShow - 1);
                const isVisible = dayIndex >= startDay && dayIndex <= endDay;
                
                if (!isVisible) return null;
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`flex-shrink-0 transition-transform duration-300 ease-in-out ${
                      viewMode === '1' ? 'w-full' : viewMode === '3' ? 'w-1/3' : 'w-1/5'
                    }`}
                  >
                    <div className={`rounded-xl border p-4 mx-1 ${isSameDay(dayDate, new Date()) ? "ring-2 ring-blue-500" : ""}`}>
                      <div className="text-center mb-4">
                        <div className="font-bold text-gray-800">
                          {viewMode === '1' ? dayName : dayName.slice(0, 3)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {viewMode === '1' ? format(dayDate, "MMMM d, yyyy") : format(dayDate, "MMM d")}
                        </div>
                        <div className={`font-bold text-blue-600 mt-1 ${
                          viewMode === '1' ? 'text-3xl' : 'text-lg'
                        }`}>
                          {currency(dayTotal)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {dayItems.length === 0 ? (
                          <div className="text-center py-4">
                            <div className="text-sm text-gray-500">No plans</div>
                          </div>
                        ) : (
                          dayItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: getCategoryColor(item.category) }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {item.note ? item.note : item.category}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="text-sm font-semibold">{currency(item.planned_amount)}</div>
                                <button 
                                  className="text-gray-400 hover:text-red-600 flex-shrink-0 p-1 rounded hover:bg-red-50 transition-colors" 
                                  onClick={() => onDeleteItem(item.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3"/>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day Indicators */}
            <div className="flex justify-center mt-4 space-x-2">
              {DAYS_OF_WEEK.map((_, dayIndex) => (
                <button
                  key={dayIndex}
                  onClick={() => setSelectedDay(dayIndex)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    dayIndex === selectedDay 
                      ? 'bg-blue-600' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4"/>
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PLANNER_CATEGORIES.map(category => {
              const categoryItems = plan.items.filter(item => item.category === category);
              const categoryTotal = categoryItems.reduce((sum, item) => sum + item.planned_amount, 0);
              
              if (categoryTotal === 0) return null;
              
              return (
                <div key={category} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: getCategoryColor(category) }}
                    />
                    <div>
                      <div className="font-medium">{category}</div>
                      <div className="text-sm text-gray-500">{categoryItems.length} items</div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{currency(categoryTotal)}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================= Main Component =========================

export default function BudgetPlanner() {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  
  const [currentPlan, setCurrentPlan] = useState<BudgetPlanWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Convert Sunday=0 to Monday=0
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });
  const [viewMode, setViewMode] = useState<'1' | '3' | '5'>('3');

  const weekStart = parseISO(selectedWeek);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  // Load current week's plan
  useEffect(() => {
    if (!user) return;
    
    async function loadPlan() {
      setLoading(true);
      try {
        // Load plan for selected week
        const { data: planData, error: planError } = await supabase
          .from('budget_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_start', selectedWeek)
          .single();

        if (planError && planError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw planError;
        }

        if (planData) {
          // Load plan items
          const { data: itemsData, error: itemsError } = await supabase
            .from('budget_plan_items')
            .select('*')
            .eq('plan_id', planData.id)
            .order('day_of_week', { ascending: true });

          if (itemsError) throw itemsError;

          setCurrentPlan({
            ...planData,
            items: itemsData || []
          });
        } else {
          setCurrentPlan(null);
        }
      } catch (error) {
        console.error('Error loading budget plan:', error);
        toast.error('Failed to load budget plan');
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [user, selectedWeek]);

  // Actions
  async function saveBudget(totalBudget: number) {
    if (!user) return;
    
    try {
      let planId: string;
      
      if (currentPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('budget_plans')
          .update({ 
            total_budget: totalBudget,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentPlan.id);

        if (error) throw error;
        planId = currentPlan.id;
      } else {
        // Create new plan
        const newPlan = {
          user_id: user.id,
          week_start: selectedWeek,
          total_budget: totalBudget
        };

        const { data, error } = await supabase
          .from('budget_plans')
          .insert(newPlan)
          .select()
          .single();

        if (error) throw error;
        planId = data.id;
      }

      // Reload plan
      const { data: planData } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('id', planId)
        .single();

      const { data: itemsData } = await supabase
        .from('budget_plan_items')
        .select('*')
        .eq('plan_id', planId)
        .order('day_of_week', { ascending: true });

      setCurrentPlan({
        ...planData,
        items: itemsData || []
      });
      
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget');
    }
  }

  async function addPlanItem(item: Omit<BudgetPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at'>) {
    if (!currentPlan) {
      toast.error('Please set a budget first');
      return;
    }
    
    try {
      const newItem = {
        ...item,
        plan_id: currentPlan.id
      };

      const { data, error } = await supabase
        .from('budget_plan_items')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;

      setCurrentPlan(prev => prev ? {
        ...prev,
        items: [...prev.items, data]
      } : null);
      
    } catch (error) {
      console.error('Error adding plan item:', error);
      toast.error('Failed to add plan item');
    }
  }

  async function deletePlanItem(itemId: UUID) {
    try {
      const { error } = await supabase
        .from('budget_plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setCurrentPlan(prev => prev ? {
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      } : null);
      
      toast.success('Plan item deleted!');
    } catch (error) {
      console.error('Error deleting plan item:', error);
      toast.error('Failed to delete plan item');
    }
  }

  function changeWeek(direction: 'prev' | 'next') {
    const current = parseISO(selectedWeek);
    const newWeek = direction === 'prev' 
      ? addDays(current, -7)
      : addDays(current, 7);
    setSelectedWeek(format(newWeek, 'yyyy-MM-dd'));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="text-lg">Loading budget planner...</div>
          </div>
        </div>
      </div>
    );
  }

  const remainingBudget = currentPlan ? currentPlan.total_budget - currentPlan.items.reduce((sum, item) => sum + item.planned_amount, 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Budget Planner</h1>
            <p className="text-gray-600">Plan your spending before the week starts</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => changeWeek('prev')}
            >
              Previous Week
            </Button>
            <div className="text-center">
              <div className="font-medium">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </div>
              <div className="text-sm text-gray-500">Week of {format(weekStart, "MMMM d")}</div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => changeWeek('next')}
            >
              Next Week
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedWeek(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))}
            >
              This Week
            </Button>
          </div>
        </div>

        {/* Budget Form */}
        <BudgetPlanForm 
          onSave={saveBudget}
          initialBudget={currentPlan?.total_budget || 0}
        />

        {/* Plan Item Form */}
        {currentPlan && (
          <PlanItemForm 
            onAdd={addPlanItem}
            remainingBudget={remainingBudget}
          />
        )}

        {/* Weekly Plan View */}
        {currentPlan && (
          <WeeklyPlanView 
            plan={currentPlan}
            onDeleteItem={deletePlanItem}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        )}

        {/* Empty State */}
        {!currentPlan && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4"/>
              <h3 className="text-lg font-medium mb-2">No Budget Plan Yet</h3>
              <p className="text-gray-600 mb-4">
                Set your weekly budget to start planning your expenses
              </p>
            </CardContent>
          </Card>
        )}

        <footer className="text-xs text-gray-400 text-center py-6">
          Plan your spending in advance to stay on track with your financial goals.
        </footer>
      </div>
    </div>
  );
}
