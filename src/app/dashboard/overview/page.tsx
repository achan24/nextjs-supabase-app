import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import Overview from './Overview';
import { Target } from './types';

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
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
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

  console.log('Raw targets data:', JSON.stringify(targets, null, 2));
  
  // Format targets with project information
  const formattedTargets = targets?.map(target => {
    console.log('Processing target:', target.title);
    console.log('Goal links:', target.goal_target_links);
    const projectInfo = target.goal_target_links?.[0]?.goal?.project;
    console.log('Extracted project info:', projectInfo);
    return {
      ...target,
      project: projectInfo ? {
        id: projectInfo.id,
        title: projectInfo.title
      } : null
    };
  }) || [];

  console.log('Final formatted targets:', JSON.stringify(formattedTargets, null, 2));

  return <Overview initialTargets={formattedTargets} />;
} 