import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProjectView from './ProjectView';

export default async function ProjectPage({ params }: { params: { id: string } }) {
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

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/login');
  }

  // Fetch initial project data
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      tasks:task_projects(
        task:tasks(
          id,
          title,
          description,
          status,
          priority,
          due_date,
          time_spent,
          created_at,
          updated_at,
          user_id
        )
      ),
      goals(
        id,
        title,
        description,
        target_date,
        status,
        metrics:goal_metrics(
          id,
          title,
          description,
          target_value,
          current_value,
          unit,
          metric_type,
          metric_tasks:goal_metric_tasks(
            id,
            task_id,
            contribution_value
          )
        ),
        goal_tasks(
          id,
          task_id,
          time_worth
        )
      ),
      project_node_links(
        id,
        project_id,
        linked_flow_id,
        linked_node_id,
        description,
        created_at,
        user_id,
        flow:process_flows(
          id,
          title,
          nodes
        )
      ),
      project_notes:project_note_links(
        id,
        project_id,
        note_id,
        created_at,
        user_id,
        display_order,
        note:notes(
          id,
          title,
          content,
          created_at,
          updated_at,
          tags,
          user_id
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (!project) {
    redirect('/dashboard/projects');
  }

  return <ProjectView project={project} user={user} />;
} 