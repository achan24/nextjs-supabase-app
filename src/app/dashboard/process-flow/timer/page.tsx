'use client';

import { ProcessTimer } from '@/app/dashboard/process-flow/timer/ProcessTimer';
import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function ProcessTimerPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <ProcessTimer user={user} />
    </div>
  );
} 