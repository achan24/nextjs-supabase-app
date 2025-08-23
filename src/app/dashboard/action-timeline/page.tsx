'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import ActionTimelineClient from './ActionTimelineClient';

export default function ActionTimelinePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        redirect('/login');
      }
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [supabase.auth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <ActionTimelineClient user={user} />;
}
