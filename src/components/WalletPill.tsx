'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Coins, ChevronDown } from 'lucide-react';

interface MintEvent {
  id: string;
  amount: number;
  meta: any;
  created_at: string;
}

export default function WalletPill() {
  const supabase = createClient();
  const [balance, setBalance] = useState<number>(0);
  const [events, setEvents] = useState<MintEvent[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [computedPerTrait, setComputedPerTrait] = useState<Record<string, any>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const [walletRes, mintsRes] = await Promise.all([
        supabase.from('wallets').select('balance').eq('user_id', authUser.id).maybeSingle(),
        supabase
          .from('token_mints')
          .select('id, amount, meta, created_at')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (walletRes.data?.balance != null) setBalance(walletRes.data.balance);
      if (mintsRes.data) setEvents(mintsRes.data as MintEvent[]);

      // Optionally resolve task titles for nicer display
      const ids = (mintsRes.data || [])
        .map((m: any) => m.meta?.task_id)
        .filter(Boolean);
      if (ids.length > 0) {
        try {
          const { data: tasks, error } = await supabase
            .from('tasks')
            .select('id, title')
            .in('id', Array.from(new Set(ids)));
          
          if (error) {
            console.error('[WalletPill] Error fetching task titles:', error);
            return;
          }
          
          const map: Record<string, string> = {};
          (tasks || []).forEach((t: any) => (map[t.id] = t.title));
          setTaskTitles(map);
        } catch (error) {
          console.error('[WalletPill] Error in task title resolution:', error);
        }
      }
    };

    load();
  }, [supabase]);

  // Backfill per-trait breakdown for older mints (that lack per_trait but have session_ids)
  useEffect(() => {
    const backfill = async () => {
      const needs = (events || []).filter(
        (e) => !e.meta?.per_trait && Array.isArray(e.meta?.session_ids) && e.meta.session_ids.length > 0
      );
      if (needs.length === 0) return;

      for (const e of needs) {
        try {
          const sessionIds: string[] = e.meta.session_ids;
          const { data: xp } = await supabase
            .from('trait_xp_records')
            .select('trait_name, final_xp')
            .in('session_id', sessionIds);

          const agg: Record<string, number> = { Discipline: 0, Adaptability: 0, Perseverance: 0 };
          (xp || []).forEach((row: any) => {
            const key = row.trait_name as string;
            agg[key] = (agg[key] || 0) + Number(row.final_xp || 0);
          });
          setComputedPerTrait((prev) => ({ ...prev, [e.id]: agg }));
        } catch {}
      }
    };
    if (events.length > 0) backfill();
  }, [events, supabase]);

  const formattedEvents = useMemo(() => {
    return events.map((e) => {
      const tId = e.meta?.task_id as string | undefined;
      const sessionId = e.meta?.session_id as string | undefined;
      const totalXp = e.meta?.total_xp as number | undefined;
      const perTrait: Record<string, number> | undefined = e.meta?.per_trait;
      const title = tId ? taskTitles[tId] || tId.slice(0, 8) : 'N/A';
      const when = new Date(e.created_at).toLocaleString();
      return {
        id: e.id,
        amount: e.amount,
        title,
        when,
        sessionId: sessionId ? sessionId.slice(0, 8) : undefined,
        totalXp,
        perTrait,
      };
    });
  }, [events, taskTitles]);

  if (!mounted) return null;

  return (
    <div className="relative group">
      <Button variant="outline" size="sm" className="h-8 gap-1">
        <Coins className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold">{balance}</span>
        <ChevronDown className="h-3 w-3 text-gray-500" />
      </Button>

      {/* Hover panel */}
      <div className="absolute right-0 mt-2 w-80 rounded-md border bg-white p-3 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
        <p className="text-xs text-gray-500 mb-2">Recent token mints</p>
        {formattedEvents.length === 0 ? (
          <p className="text-xs text-gray-500">No token activity yet</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-auto">
            {formattedEvents.map((ev) => (
              <li key={ev.id} className="text-xs flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800">+{ev.amount} tokens</div>
                  <div className="text-gray-600 truncate">Task: {ev.title}</div>
                  <div className="text-gray-500">
                    {ev.totalXp != null && <span>XP: {ev.totalXp}</span>}
                    {ev.sessionId && <span className="ml-2">Session: {ev.sessionId}</span>}
                  </div>
                  {(ev.perTrait || computedPerTrait[ev.id]) && (
                    <div className="text-gray-500 mt-1">
                      <span>Discipline {(ev.perTrait || computedPerTrait[ev.id]).Discipline || 0}</span>
                      <span className="ml-2">Adaptability {(ev.perTrait || computedPerTrait[ev.id]).Adaptability || 0}</span>
                      <span className="ml-2">Perseverance {(ev.perTrait || computedPerTrait[ev.id]).Perseverance || 0}</span>
                    </div>
                  )}
                </div>
                <div className="text-gray-400 whitespace-nowrap">{ev.when}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


