import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ProcessNodeHistory {
  id: string;
  date: string;
  duration: number;
  notes: string;
}

export interface ProcessNode {
  id: string;
  flow_id: string;
  title: string;
  description: string;
  duration: number;
  position: {
    x: number;
    y: number;
  };
  history: ProcessNodeHistory[];
}

export interface ProcessFlow {
  id: string;
  name: string;
  description: string;
  nodes: ProcessNode[];
}

export function useProcessFlow() {
  const [flows, setFlows] = useState<ProcessFlow[]>([]);
  const [nodes, setNodes] = useState<ProcessNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProcessFlows() {
      try {
        // Fetch flows
        const { data: flowsData, error: flowsError } = await supabase
          .from('process_flows')
          .select('*');

        if (flowsError) throw flowsError;

        // Fetch nodes with their history
        const { data: nodesData, error: nodesError } = await supabase
          .from('process_nodes')
          .select(`
            *,
            history:process_node_history(
              id,
              duration,
              notes,
              completed_at
            )
          `);

        if (nodesError) throw nodesError;

        // Transform the data to match our interface
        const transformedNodes = (nodesData || []).map((node: any) => ({
          id: node.id,
          flow_id: node.flow_id,
          title: node.title,
          description: node.description,
          duration: node.duration,
          position: node.position || { x: 0, y: 0 },
          history: (node.history || []).map((h: any) => ({
            id: h.id,
            date: h.completed_at,
            duration: h.duration,
            notes: h.notes || ''
          }))
        }));

        // Group nodes by flow
        const transformedFlows = (flowsData || []).map((flow: any) => ({
          id: flow.id,
          name: flow.name,
          description: flow.description || '',
          nodes: transformedNodes.filter(node => node.flow_id === flow.id)
        }));

        setFlows(transformedFlows);
        setNodes(transformedNodes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchProcessFlows();
  }, []);

  const addNodeHistory = async (nodeId: string, duration: number, notes: string = '') => {
    try {
      const { data, error } = await supabase
        .from('process_node_history')
        .insert([
          {
            node_id: nodeId,
            duration,
            notes,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === nodeId
            ? {
                ...node,
                history: [
                  ...node.history,
                  {
                    id: data.id,
                    date: data.completed_at,
                    duration: data.duration,
                    notes: data.notes || ''
                  }
                ]
              }
            : node
        )
      );

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add history');
      return null;
    }
  };

  return {
    flows,
    nodes,
    loading,
    error,
    addNodeHistory
  };
} 