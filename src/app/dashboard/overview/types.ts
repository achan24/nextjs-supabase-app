export interface Target {
  id: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  target_type: string;
  created_at: string;
  updated_at: string;
  project: {
    id: string;
    title: string;
  };
  goal_target_links: {
    goal: {
      id: string;
      title: string;
      project: {
        id: string;
        title: string;
      };
    };
  }[];
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
} 