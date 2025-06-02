import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProjectView from './ProjectView';
import type { Project, TaskLink } from './types';

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
  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        goals(
          id,
          title,
          description,
          target_date,
          status,
          goal_tasks(
            id,
            task_id,
            time_worth
          ),
          goal_target_links(
            id,
            target:targets(
              id,
              title,
              description,
              target_value,
              current_value,
              unit,
              target_type,
              created_at,
              updated_at,
              target_tasks(
                id,
                task_id,
                contribution_value
              )
            )
          )
        ),
        project_targets(
          id,
          target:targets(
            id,
            title,
            description,
            target_value,
            current_value,
            unit,
            target_type,
            created_at,
            updated_at,
            user_id,
            target_tasks(
              id,
              task_id,
              contribution_value
            ),
            goal_target_links(
              id,
              goal_id
            )
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

    console.log('Project query response:', { data: project, error: projectError });

    if (projectError) {
      console.error('Error fetching project:', projectError);
      throw new Error(`Failed to fetch project data: ${projectError.message}`);
    }

    if (!project) {
      console.error('No project found with ID:', params.id);
      redirect('/dashboard/projects');
    }

    // Fetch tasks separately
    const { data: taskLinks, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        time_spent,
        created_at,
        updated_at,
        user_id,
        task_projects!inner(project_id)
      `)
      .eq('task_projects.project_id', params.id);

    console.log('Tasks query response:', { data: taskLinks, error: taskError });

    if (taskError) {
      console.error('Error fetching tasks:', taskError);
      throw new Error(`Failed to fetch task data: ${taskError.message}`);
    }

    // Debug log to see the actual data structure
    console.log('Raw project data:', JSON.stringify(project, null, 2));
    console.log('Task data:', JSON.stringify(taskLinks, null, 2));
    console.log('Project ID:', params.id);
    console.log('Goals:', project.goals);
    console.log('Project target links:', project.project_targets);

    // Transform the project data to match the expected types
    const transformedProject: Project = {
      id: project.id,
      title: project.title,
      description: project.description,
      created_at: project.created_at,
      updated_at: project.updated_at,
      tasks: (taskLinks || [])
        .filter(task => task && task.id && task.title) // Filter out invalid tasks
        .map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority || 2,
          due_date: task.due_date,
          status: task.status || 'todo'
        })),
      goals: (project.goals || []).map(goal => {
        console.log('Processing goal:', goal);
        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          target_date: goal.target_date,
          status: goal.status || 'not_started',
          goal_tasks: (goal.goal_tasks || []).map(task => ({
            id: task.id,
            task_id: task.task_id,
            time_worth: task.time_worth
          })),
          goal_target_links: (goal.goal_target_links || [])
            .map(link => {
              console.log('Processing goal target link:', link);
              const targetData = Array.isArray(link.target) ? link.target[0] : link.target;
              if (!targetData) return null;
              return {
                id: link.id,
                target: {
                  id: targetData.id,
                  title: targetData.title,
                  description: targetData.description,
                  target_value: targetData.target_value,
                  current_value: targetData.current_value,
                  unit: targetData.unit,
                  target_type: targetData.target_type,
                  created_at: targetData.created_at,
                  updated_at: targetData.updated_at,
                  target_tasks: (targetData.target_tasks || []).map(tt => ({
                    id: tt.id,
                    target_id: targetData.id,
                    task_id: tt.task_id,
                    contribution_value: tt.contribution_value,
                    created_at: targetData.created_at,
                    updated_at: targetData.updated_at
                  }))
                }
              };
            })
            .filter((link): link is NonNullable<typeof link> => link !== null)
        };
      }),
      project_targets: (project.project_targets || [])
        .map(link => {
          const target = Array.isArray(link.target) ? link.target[0] : link.target;
          if (!target) return null;
          return {
            id: link.id,
            target: {
              id: target.id,
              title: target.title,
              description: target.description,
              target_value: target.target_value || 0,
              current_value: target.current_value || 0,
              unit: target.unit || '',
              target_type: target.target_type || 'count',
              created_at: target.created_at,
              updated_at: target.updated_at,
              target_tasks: (target.target_tasks || []).map((tt: { id: string; task_id: string; contribution_value: number }) => ({
                id: tt.id,
                target_id: target.id,
                task_id: tt.task_id,
                contribution_value: tt.contribution_value,
                created_at: target.created_at,
                updated_at: target.updated_at
              })),
              goal_target_links: (target.goal_target_links || []).map((link: { id: string; goal_id: string }) => ({
                id: link.id,
                goal_id: link.goal_id,
                target_id: target.id,
                created_at: target.created_at,
                user_id: target.user_id
              }))
            }
          };
        })
        .filter((link): link is NonNullable<typeof link> => link !== null),
      project_node_links: (project.project_node_links || []).map(link => {
        const flow = Array.isArray(link.flow) ? link.flow[0] : link.flow;
        if (!flow || !flow.nodes) return null;

        const nodeData = flow.nodes.find((n: any) => n.id === link.linked_node_id);
        if (!nodeData) return null;

        return {
          id: link.id,
          project_id: link.project_id,
          linked_flow_id: link.linked_flow_id,
          linked_node_id: link.linked_node_id,
          description: link.description,
          created_at: link.created_at,
          user_id: link.user_id,
          display_order: (link as any).display_order || 0,
          flow: {
            id: flow.id,
            title: flow.title
          },
          node: {
            id: link.linked_node_id,
            data: nodeData.data || {
              label: 'Untitled Node',
              description: ''
            }
          }
        };
      }).filter((link): link is NonNullable<typeof link> => link !== null),
      project_notes: (project.project_notes || []).map(link => {
        if (!link || !link.note) return null;
        
        const noteData = Array.isArray(link.note) ? link.note[0] : link.note;
        if (!noteData) return null;

        return {
          id: link.id,
          project_id: link.project_id,
          note_id: link.note_id,
          note: {
            id: noteData.id,
            title: noteData.title,
            content: noteData.content,
            created_at: noteData.created_at,
            updated_at: noteData.updated_at || noteData.created_at,
            tags: noteData.tags || [],
            user_id: noteData.user_id
          },
          created_at: link.created_at,
          user_id: link.user_id,
          display_order: link.display_order || 0
        };
      }).filter((link): link is NonNullable<typeof link> => link !== null)
    };

    // Debug log to see the transformed data structure
    console.log('Transformed project:', JSON.stringify(transformedProject, null, 2));

    return <ProjectView project={transformedProject} user={user} />;
  } catch (error) {
    console.error('Error in ProjectPage:', error);
    throw error;
  }
} 