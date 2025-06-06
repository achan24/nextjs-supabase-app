import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import OverviewClient from './OverviewClient';
import { Target } from './types';
import { Database } from '@/lib/database.types';

interface ProjectTarget {
  target: {
    id: string;
    title: string;
    description: string;
    target_value: number;
    current_value: number;
    unit: string;
    target_type: string;
    created_at: string;
    updated_at: string;
    target_tasks: {
      id: string;
      task: {
        id: string;
        title: string;
        description: string;
        status: string;
        due_date: string;
      };
      contribution_value: number;
    }[];
  };
}

interface Project {
  id: string;
  title: string;
  project_targets: ProjectTarget[];
}

export const metadata: Metadata = {
  title: 'Overview | Guardian Angel',
  description: 'Overview of all targets and their progress',
};

export default async function OverviewPage() {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Fetch all targets with their tasks and project information through goals
  const { data: targets, error: targetsError } = await supabase
    .from('targets')
    .select(`
      *,
      target_tasks(
        id,
        task:tasks(
          id,
          title,
          description,
          status,
          due_date
        ),
        contribution_value
      ),
      goal_target_links(
        goal:goals(
          id,
          title,
          project:projects(
            id,
            title
          )
        )
      )
    `)
    .eq('user_id', user.id);

  if (targetsError) {
    console.error('Error fetching targets:', targetsError);
    return <div>Error loading targets</div>;
  }

  // Fetch selected overview targets
  const { data: overviewTargets, error: overviewError } = await supabase
    .from('overview_targets')
    .select('target_id')
    .eq('user_id', user.id);

  if (overviewError) {
    console.error('Error fetching overview targets:', overviewError);
    return <div>Error loading overview configuration</div>;
  }

  // Format targets with project information
  const formattedTargets = targets?.map(target => {
    const projectInfo = target.goal_target_links?.[0]?.goal?.project;
    return {
      ...target,
      project: projectInfo ? {
        id: projectInfo.id,
        title: projectInfo.title
      } : null
    };
  }) || [];

  // Get the list of selected target IDs
  const selectedTargetIds = overviewTargets?.map(ot => ot.target_id) || [];

  return (
    <OverviewClient 
      initialTargets={formattedTargets} 
      initialSelectedTargets={selectedTargetIds}
      user={user}
    />
  );
} 