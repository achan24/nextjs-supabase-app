'use client';

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Plus, CalendarDays, Target, Download, Upload, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subYears,
  getMonth,
  getYear,
} from "date-fns";
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

type Transaction = {
  id: UUID;
  user_id: string;
  date: string; // ISO date
  amount: number; // negative for expenses, positive for income
  category: string;
  note?: string;
  created_at: string;
  updated_at: string;
};

type BudgetTarget = {
  id: UUID;
  user_id: string;
  category: string;
  monthly_limit: number; // per calendar month
  created_at: string;
  updated_at: string;
};

// ========================= Utilities =========================

const DEFAULT_CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Rent",
  "Utilities",
  "Health",
  "Fun",
  "Misc",
];

// Category colors for consistent visual identification
const CATEGORY_COLORS: Record<string, string> = {
  "Groceries": "#10B981", // emerald
  "Dining": "#F59E0B",    // amber
  "Transport": "#3B82F6", // blue
  "Rent": "#8B5CF6",      // purple
  "Utilities": "#EF4444", // red
  "Health": "#06B6D4",    // cyan
  "Fun": "#EC4899",       // pink
  "Misc": "#6B7280",      // gray
  "Income": "#059669",    // dark green
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#6B7280"; // default to gray
}

const CURRENCY = "€"; // euros

function toISODate(d: Date) {
  return d.toISOString();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfWeekMonday(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

function endOfWeekSunday(date: Date) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

function currency(n: number) {
  return `${CURRENCY}${n.toFixed(2)}`;
}

// ========================= Sample Data =========================

// Sample data removed - start with clean budget

// ========================= Forms =========================

function TransactionForm({ onAdd }: { onAdd: (t: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [note, setNote] = useState<string>("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-4 h-4"/>
          Add Transaction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Amount (use - for spend)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Income">Income</SelectItem>
              {DEFAULT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Button
            onClick={() => {
              const amt = parseFloat(amount);
              if (isNaN(amt)) {
                toast.error("Please enter a valid amount");
                return;
              }
              const iso = new Date(date + "T12:00:00").toISOString();
              onAdd({ date: iso, amount: amt, category, note });
              setAmount("");
              setNote("");
              toast.success("Transaction added!");
            }}
          >
            Add Transaction
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetForm({ onAdd }: { onAdd: (b: Omit<BudgetTarget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void }) {
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [monthlyLimit, setMonthlyLimit] = useState<string>("");
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-4 h-4"/>
          Add/Update Budget Target (per month)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.01"
            placeholder="Monthly limit"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
          />
          <Button onClick={() => {
            const n = parseFloat(monthlyLimit);
            if (isNaN(n)) {
              toast.error("Enter a valid number");
              return;
            }
            onAdd({ category, monthly_limit: n });
            setMonthlyLimit("");
            toast.success("Budget target saved!");
          }}>
            Save Target
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================= Widgets =========================

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : clamp((value / max) * 100, 0, 100);
  const danger = value > max;
  return (
    <div className="w-full">
      <Progress 
        value={pct} 
        className={`h-3 ${danger ? "bg-red-100" : ""}`}
      />
    </div>
  );
}

// ========================= Charts =========================

function groupByCategory(rows: Transaction[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.category === "Income") continue; // exclude income from spend chart
    map.set(r.category, (map.get(r.category) ?? 0) + Math.abs(r.amount));
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function useFiltered(transactions: Transaction[], from: Date, to: Date) {
  return useMemo(
    () =>
      transactions.filter((t) =>
        isWithinInterval(parseISO(t.date), { start: from, end: to })
      ),
    [transactions, from, to]
  );
}

function WeekCategoryBar({ transactions, from, to }: { transactions: Transaction[]; from: Date; to: Date }) {
  const rows = useFiltered(transactions, from, to);
  const data = groupByCategory(rows);
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ReTooltip formatter={(v: any) => currency(Number(v))} />
          <Legend />
          <Bar 
            dataKey="value" 
            name="Spend" 
            fill="#10b981"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthDailyBar({ transactions, monthDate }: { transactions: Transaction[]; monthDate: Date }) {
  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);
  const rows = useFiltered(transactions, from, to);

  const byDay = new Map<string, number>();
  rows.forEach((r) => {
    const key = format(parseISO(r.date), "yyyy-MM-dd");
    if (r.amount < 0) byDay.set(key, (byDay.get(key) ?? 0) + Math.abs(r.amount));
  });
  const data = Array.from(byDay.entries()).sort((a,b)=>a[0] < b[0] ? -1 : 1).map(([date, total]) => ({ date: format(parseISO(date), "d"), total }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <ReTooltip formatter={(v: any) => currency(Number(v))} />
          <Legend />
          <Bar dataKey="total" name="Spend" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function YearBar({ transactions, year }: { transactions: Transaction[]; year: number }) {
  const data = Array.from({ length: 12 }, (_, m) => {
    const rows = transactions.filter((t) => {
      const d = parseISO(t.date);
      return getYear(d) === year && getMonth(d) === m;
    });
    const spend = rows.filter(r=>r.amount<0).reduce((s, r)=>s+Math.abs(r.amount),0);
    const income = rows.filter(r=>r.amount>0).reduce((s, r)=>s+r.amount,0);
    return { month: format(new Date(year, m, 1), "MMM"), spend, income, net: income - spend };
  });

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <ReTooltip formatter={(v: any) => currency(Number(v))} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#10b981" />
          <Bar dataKey="spend" name="Spend" fill="#ef4444" />
          <Bar dataKey="net" name="Net" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ========================= Panels =========================

function BudgetsPanel({ budgets, monthTransactions }: { budgets: BudgetTarget[]; monthTransactions: Transaction[] }) {
  const spentByCat = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions.forEach((t) => {
      if (t.amount < 0) {
        map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
      }
    });
    return map;
  }, [monthTransactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Targets (Monthly)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {budgets.length === 0 && <div className="text-sm text-gray-500">No targets yet. Add one above.</div>}
          {budgets.map((b) => {
            const spent = spentByCat.get(b.category) ?? 0;
            return (
              <div key={b.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getCategoryColor(b.category) }}
                    />
                    <div className="font-medium">{b.category}</div>
                  </div>
                  <div className={`${spent > b.monthly_limit ? "text-red-600" : "text-gray-600"}`}>
                    {currency(spent)} / {currency(b.monthly_limit)}
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={spent} max={b.monthly_limit} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================= Week Detail Cards =========================

function WeekDetailCards({ transactions, from, to, onDelete }: { transactions: Transaction[]; from: Date; to: Date; onDelete: (id: UUID)=>void }) {
  const rows = transactions.filter((t) => isWithinInterval(parseISO(t.date), { start: from, end: to }));
  const spend = rows.filter(r=>r.amount<0).reduce((s, r) => s + Math.abs(r.amount), 0);
  const income = rows.filter(r=>r.amount>0).reduce((s, r) => s + r.amount, 0);

  const dayTotals = Array.from({ length: 7 }, (_, i) => ({ date: addDays(from, i), total: 0 }));
  for (const r of rows) {
    const d = parseISO(r.date);
    const idx = Math.max(0, Math.min(6, Math.floor((d.getTime() - from.getTime()) / (24 * 3600 * 1000))));
    if (r.amount < 0) dayTotals[idx].total += Math.abs(r.amount);
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Week Income" value={currency(income)} />
        <Stat label="Week Spend" value={currency(spend)} />
        <Stat label="Net" value={currency(income - spend)} />
        <Stat label="Transactions" value={rows.length.toString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4"/>
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = addDays(from, i);
              return (
                <div key={i} className={`rounded-xl border p-3 ${isSameDay(d, new Date()) ? "ring-2 ring-emerald-500" : ""}`}>
                  <div className="text-sm text-gray-500">{format(d, "EEE dd MMM")}</div>
                  <div className="text-xl font-semibold">{currency(dayTotals[i].total)}</div>
                  <ul className="mt-2 space-y-1 max-h-44 overflow-auto pr-1">
                    {rows
                      .filter((r) => isSameDay(parseISO(r.date), d))
                      .sort((a,b)=>parseISO(b.date).getTime()-parseISO(a.date).getTime())
                      .map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: getCategoryColor(r.category) }}
                            />
                            <div className="truncate">
                              <span className="text-xs text-gray-500">{r.category}</span>
                              {r.note && <span className="text-xs text-gray-400"> · {r.note}</span>}
                            </div>
                          </div>
                          <div className={`text-sm ${r.amount<0?"text-red-600":"text-emerald-600"}`}>{currency(r.amount)}</div>
                          <button className="text-gray-400 hover:text-red-600" title="Delete" onClick={()=>onDelete(r.id)}>
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DayDetailCards({ transactions, from, to, onDelete }: { transactions: Transaction[]; from: Date; to: Date; onDelete: (id: UUID)=>void }) {
  const rows = transactions.filter((t) => isSameDay(parseISO(t.date), from));
  const spend = rows.filter(r=>r.amount<0).reduce((s, r) => s + Math.abs(r.amount), 0);
  const income = rows.filter(r=>r.amount>0).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Day Income" value={currency(income)} />
        <Stat label="Day Spend" value={currency(spend)} />
        <Stat label="Net" value={currency(income - spend)} />
        <Stat label="Transactions" value={rows.length.toString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4"/>
            {format(from, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions for this day
            </div>
          ) : (
            <div className="space-y-3">
              {rows
                .sort((a,b)=>parseISO(b.date).getTime()-parseISO(a.date).getTime())
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getCategoryColor(r.category) }}
                      />
                      <div>
                        <div className="font-medium">{r.category}</div>
                        {r.note && <div className="text-sm text-gray-500">{r.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-lg font-semibold ${r.amount<0?"text-red-600":"text-emerald-600"}`}>
                        {currency(r.amount)}
                      </div>
                      <button className="text-gray-400 hover:text-red-600" title="Delete" onClick={()=>onDelete(r.id)}>
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========================= Main App =========================

type ViewMode = "day" | "week" | "month" | "year";

export default function BudgetApp() {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetTarget[]>([]);
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<string>(new Date().toISOString());
  const [loading, setLoading] = useState(true);

  const anchorDate = useMemo(() => parseISO(anchor), [anchor]);

  // Date ranges for current view
  const dayFrom = anchorDate;
  const dayTo = anchorDate;
  const weekFrom = startOfWeekMonday(anchorDate);
  const weekTo = endOfWeekSunday(anchorDate);
  const monthFrom = startOfMonth(anchorDate);
  const monthTo = endOfMonth(anchorDate);
  const year = getYear(anchorDate);

  // Filtered rows for month (for stats + budgets panel)
  const monthRows = useFiltered(transactions, monthFrom, monthTo);

  // Top-of-page quick stats (current month)
  const totalIncomeMonth = monthRows.filter(r=>r.amount>0).reduce((s,r)=>s+r.amount,0);
  const totalSpendMonth = monthRows.filter(r=>r.amount<0).reduce((s,r)=>s+Math.abs(r.amount),0);

  // Load data from Supabase
  useEffect(() => {
    if (!user) return;
    
    async function loadData() {
      setLoading(true);
      try {
        if (!user) return;
        
        // Load transactions
        const { data: txData, error: txError } = await supabase
          .from('budget_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (txError) throw txError;

        // Load budgets
        const { data: budgetData, error: budgetError } = await supabase
          .from('budget_targets')
          .select('*')
          .eq('user_id', user.id);

        if (budgetError) throw budgetError;

        setTransactions(txData || []);
        setBudgets(budgetData || []);

        // No sample data creation - start with empty budget
      } catch (error) {
        console.error('Error loading budget data:', error);
        toast.error('Failed to load budget data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Sample data creation removed - start with clean budget

  // Actions
  async function addOrUpdateBudget(b: Omit<BudgetTarget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (!user) return;
    
    try {
      const existingBudget = budgets.find(x => x.category === b.category);
      
      if (existingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from('budget_targets')
          .update({ 
            monthly_limit: b.monthly_limit,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBudget.id);

        if (error) throw error;

        setBudgets(prev => prev.map(budget => 
          budget.id === existingBudget.id 
            ? { ...budget, monthly_limit: b.monthly_limit, updated_at: new Date().toISOString() }
            : budget
        ));
      } else {
        // Create new budget
        const newBudget = {
          ...b,
          user_id: user.id
        };

        const { data, error } = await supabase
          .from('budget_targets')
          .insert(newBudget)
          .select()
          .single();

        if (error) throw error;

        setBudgets(prev => [data, ...prev]);
      }
      
      toast.success('Budget target saved!');
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget target');
    }
  }

  async function addTx(t: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (!user) return;
    
    try {
      const newTransaction = {
        ...t,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('budget_transactions')
        .insert(newTransaction)
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [data, ...prev]);
      toast.success('Transaction added!');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  }

  async function deleteTx(id: UUID) {
    try {
      const { error } = await supabase
        .from('budget_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter((t) => t.id !== id));
      toast.success('Transaction deleted!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  }

  function exportData() {
    const payload = JSON.stringify({ transactions, budgets }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  }

  function importData(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.transactions) && Array.isArray(data.budgets)) {
          setTransactions(data.transactions);
          setBudgets(data.budgets);
          toast.success('Data imported!');
        } else {
          toast.error("Invalid file format");
        }
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsText(file);
  }

  // Nav helpers
  function goPrev() {
    if (view === "day") setAnchor(subDays(anchorDate, 1).toISOString());
    else if (view === "week") setAnchor(subDays(anchorDate, 7).toISOString());
    else if (view === "month") setAnchor(subMonths(anchorDate, 1).toISOString());
    else setAnchor(subYears(anchorDate, 1).toISOString());
  }
  function goNext() {
    if (view === "day") setAnchor(addDays(anchorDate, 1).toISOString());
    else if (view === "week") setAnchor(addDays(anchorDate, 7).toISOString());
    else if (view === "month") setAnchor(addMonths(anchorDate, 1).toISOString());
    else setAnchor(addYears(anchorDate, 1).toISOString());
  }

  // Derived text for center date label
  const centerLabel = view === "day"
    ? format(anchorDate, "EEEE, MMMM d, yyyy")
    : view === "week"
    ? `${format(weekFrom, "dd MMM")} – ${format(weekTo, "dd MMM yyyy")}`
    : view === "month"
    ? format(anchorDate, "MMMM yyyy")
    : String(year);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="text-lg">Loading budget data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">Budget</div>
            <div className="flex items-center gap-2 border rounded-full px-2 py-1 bg-white shadow-sm">
              <Button 
                variant={view === "day" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setView("day")}
              >
                Day
              </Button>
              <Button 
                variant={view === "week" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setView("week")}
              >
                Week
              </Button>
              <Button 
                variant={view === "month" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setView("month")}
              >
                Month
              </Button>
              <Button 
                variant={view === "year" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setView("year")}
              >
                Year
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4"/>
            </Button>
            <div className="text-sm text-gray-600 min-w-[12ch] text-center">{centerLabel}</div>
            <Button variant="outline" size="sm" onClick={goNext}>
              <ChevronRight className="w-4 h-4"/>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAnchor(new Date().toISOString())}
            >
              Today
            </Button>

            <label className="inline-flex items-center justify-center rounded-xl border bg-white px-2 py-2 shadow-sm hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4"/>
              <input onChange={importData} type="file" accept="application/json" className="hidden" />
            </label>
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="w-4 h-4"/>
            </Button>
          </div>
        </div>

        {/* ======= TOP VISUALIZATION ======= */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4"/>
              Spending Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {view === "day" && <div className="text-center py-8 text-gray-500">Day view - see details below</div>}
            {view === "week" && <WeekCategoryBar transactions={transactions} from={weekFrom} to={weekTo} />}
            {view === "month" && <MonthDailyBar transactions={transactions} monthDate={anchorDate} />}
            {view === "year" && <YearBar transactions={transactions} year={year} />}
          </CardContent>
        </Card>

        {/* Top stats for current month */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Month Income" value={currency(totalIncomeMonth)} />
          <Stat label="Month Spend" value={currency(totalSpendMonth)} />
          <Stat label="Month Net" value={currency(totalIncomeMonth - totalSpendMonth)} />
          <Stat label="Entries this Month" value={monthRows.length.toString()} />
        </div>

        {/* Forms + Budgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionForm onAdd={addTx} />
            <BudgetForm onAdd={addOrUpdateBudget} />
          </div>
          <BudgetsPanel budgets={budgets} monthTransactions={monthRows} />
        </div>

        {/* Detail cards under everything */}
        {view === "day" && (
          <DayDetailCards transactions={transactions} from={dayFrom} to={dayTo} onDelete={deleteTx} />
        )}
        {view === "week" && (
          <WeekDetailCards transactions={transactions} from={weekFrom} to={weekTo} onDelete={deleteTx} />
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Note</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .slice()
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                    .map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="py-2 pr-4 whitespace-nowrap">{format(parseISO(t.date), "dd MMM yyyy")}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getCategoryColor(t.category) }}
                            />
                            {t.category}
                          </div>
                        </td>
                        <td className="py-2 pr-4 max-w-[32ch] truncate">{t.note ?? ""}</td>
                        <td className={`py-2 pr-4 ${t.amount<0?"text-red-600":"text-emerald-600"}`}>{currency(t.amount)}</td>
                        <td className="py-2 pr-4">
                          <button className="text-gray-400 hover:text-red-600" onClick={() => deleteTx(t.id)} title="Delete">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <footer className="text-xs text-gray-400 text-center py-6">
          Data is stored securely in your account. Export regularly for backups.
        </footer>
      </div>
    </div>
  );
}
