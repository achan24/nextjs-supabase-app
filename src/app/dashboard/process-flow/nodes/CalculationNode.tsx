'use client';

import { memo, useEffect, useState, useCallback } from 'react';
import { NodeProps, useReactFlow, Connection, Edge } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface CalculationNodeData extends BaseNodeData {
  value?: number;
  showDetails?: boolean;
  calculationSteps?: string[];
}

const CalculationNode = (props: NodeProps<CalculationNodeData>) => {
  const { data, id } = props;
  const [calculatedValue, setCalculatedValue] = useState(0);
  const { getNode, getEdges } = useReactFlow();
  const [calculationSteps, setCalculationSteps] = useState<string[]>([]);

  const calculateValue = useCallback(() => {
    const processedNodes = new Set<string>();
    const steps: string[] = [];
    
    const traverseAndSum = (nodeId: string, depth: number = 0): number => {
      console.log(`\n[TRAVERSE] Visiting node: ${nodeId} at depth ${depth}`);
      
      // Prevent infinite loops from circular connections
      if (processedNodes.has(nodeId)) {
        console.log(`[TRAVERSE] Already processed node ${nodeId}, skipping`);
        return 0;
      }
      processedNodes.add(nodeId);

      const node = getNode(nodeId);
      if (!node) {
        console.log(`[TRAVERSE] Node ${nodeId} not found`);
        return 0;
      }

      // Highlight the node we're visiting
      const originalBackground = node.data.style?.background;
      const originalBorder = node.data.style?.border;
      node.data.style = {
        ...node.data.style,
        background: '#fef9c3', // yellow-100
        border: '2px solid #facc15' // yellow-400
      };

      // Get all connected edges to this node (both incoming and outgoing)
      const connectedEdges = getEdges().filter(edge => 
        edge.target === nodeId || edge.source === nodeId
      );
      console.log(`[TRAVERSE] Found ${connectedEdges.length} connected edges for node ${nodeId}:`, 
        connectedEdges.map(e => `${e.source} -> ${e.target}`));
      
      // For task nodes, get their value if completed AND continue traversing
      if (node.type === 'task') {
        console.log(`[TRAVERSE] Node ${nodeId} is a task node:`, {
          label: node.data.label,
          status: node.data.status,
          value: node.data.value
        });
        
        let nodeValue = 0;
        if (node.data?.status === 'completed' && typeof node.data?.value === 'number') {
          const indent = '  '.repeat(depth);
          steps.push(`${indent}${node.data.label}: ${node.data.value}`);
          console.log(`[TRAVERSE] Task node ${node.data.label} contributes value: ${node.data.value}`);
          nodeValue = node.data.value;
        }

        // Continue traversing through this task node's connections
        console.log(`[TRAVERSE] Continuing traversal through task node ${nodeId}'s connections`);
        const connectedSum = connectedEdges.reduce((total, edge) => {
          const otherNodeId = edge.source === nodeId ? edge.target : edge.source;
          // Don't traverse back to where we came from
          if (otherNodeId === id) return total;
          console.log(`[TRAVERSE] Following edge from task node to ${otherNodeId}`);
          const connectedValue = traverseAndSum(otherNodeId, depth + 1);
          console.log(`[TRAVERSE] Connected node ${otherNodeId} contributed: ${connectedValue}`);
          return total + connectedValue;
        }, 0);

        // Reset node style after 1 second
        setTimeout(() => {
          node.data.style = {
            ...node.data.style,
            background: originalBackground,
            border: originalBorder
          };
        }, 1000);

        const totalValue = nodeValue + connectedSum;
        console.log(`[TRAVERSE] Total value from task node ${nodeId} and its connections: ${totalValue}`);
        return totalValue;
      }
      
      // For calculation nodes (including this one) and all other node types,
      // traverse through them to find connected task nodes
      const indent = '  '.repeat(depth);
      steps.push(`${indent}Calculating sum for ${node.data.label || 'node'}:`);
      
      console.log(`[TRAVERSE] Processing connected nodes for ${nodeId}`);
      const sum = connectedEdges.reduce((total, edge) => {
        // For each edge, traverse through the other end (whether source or target)
        const otherNodeId = edge.source === nodeId ? edge.target : edge.source;
        console.log(`[TRAVERSE] Following edge to node ${otherNodeId}`);
        const connectedValue = traverseAndSum(otherNodeId, depth + 1);
        console.log(`[TRAVERSE] Node ${otherNodeId} contributed: ${connectedValue}`);
        return total + connectedValue;
      }, 0);

      steps.push(`${indent}Total: ${sum}`);
      console.log(`[TRAVERSE] Total sum for node ${nodeId}: ${sum}`);

      // Reset node style after 1 second
      setTimeout(() => {
        node.data.style = {
          ...node.data.style,
          background: originalBackground,
          border: originalBorder
        };
      }, 1000);

      return sum;
    };

    // Start the traversal from this calculation node
    console.log('\n[CALCULATION] Starting new calculation traversal');
    const sum = traverseAndSum(id);
    console.log(`[CALCULATION] Final calculated sum for node ${id}: ${sum}`);
    console.log('[CALCULATION] Calculation steps:', steps);
    
    setCalculatedValue(sum);
    setCalculationSteps(steps);

    // Store both the value and steps in node data
    if (data.value !== sum || !data.calculationSteps || data.calculationSteps.join('\n') !== steps.join('\n')) {
      data.value = sum;
      data.calculationSteps = steps;
    }
  }, [id, getNode, getEdges, data]);

  // Initial check for existing connections and setup monitoring
  useEffect(() => {
    // Immediate check for existing connections and all reachable nodes
    const edges = getEdges();
    const findAllConnectedNodes = (startNodeId: string, visited = new Set<string>()): string[] => {
      if (visited.has(startNodeId)) return [];
      visited.add(startNodeId);
      
      const directlyConnected = edges
        .filter(edge => edge.source === startNodeId || edge.target === startNodeId)
        .map(edge => edge.source === startNodeId ? edge.target : edge.source);
      
      const allConnected = [...directlyConnected];
      for (const nodeId of directlyConnected) {
        if (!visited.has(nodeId)) {
          allConnected.push(...findAllConnectedNodes(nodeId, visited));
        }
      }
      return allConnected;
    };

    // Get all reachable nodes
    const allConnectedNodeIds = findAllConnectedNodes(id);
    const allConnectedNodes = allConnectedNodeIds.map(nodeId => getNode(nodeId)).filter(Boolean);

    // Calculate if we have any completed tasks with values
    const hasCompletedTasks = allConnectedNodes.some(node => 
      node?.type === 'task' && node?.data?.status === 'completed' && typeof node?.data?.value === 'number'
    );

    if (hasCompletedTasks || allConnectedNodes.length > 0) {
      calculateValue();
    }

    // Set up monitoring interval
    const interval = setInterval(() => {
      const currentEdges = getEdges();
      const currentConnectedNodeIds = findAllConnectedNodes(id);
      const currentConnectedNodes = currentConnectedNodeIds.map(nodeId => getNode(nodeId)).filter(Boolean);
      
      const shouldRecalculate = currentConnectedNodes.some(node => 
        node?.type === 'task' && node?.data?.status === 'completed' && typeof node?.data?.value === 'number'
      );
      
      if (shouldRecalculate) {
        calculateValue();
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [id, getEdges, getNode, calculateValue]);

  // Force recalculation when edges change
  useEffect(() => {
    calculateValue();
  }, [getEdges, calculateValue]);

  // Listen for recalculate events
  useEffect(() => {
    const handleRecalculate = (event: CustomEvent) => {
      if (event.detail.nodeId === id) {
        calculateValue();
      }
    };

    window.addEventListener('recalculate', handleRecalculate as EventListener);
    return () => window.removeEventListener('recalculate', handleRecalculate as EventListener);
  }, [id, calculateValue]);

  const toggleDetails = () => {
    data.showDetails = !data.showDetails;
    // Force a re-render by updating the node data
    data.description = data.showDetails && data.calculationSteps ? 
      data.calculationSteps.join('\n') : '';
  };

  return (
    <div className="calculation-node">
      <BaseNode {...props} type="calculation" />
      <div className="mt-2 text-center space-y-2">
        <div className="text-xs text-gray-500">Total Value:</div>
        <div className="text-lg font-bold text-teal-600">{calculatedValue}</div>
      </div>
    </div>
  );
};

export default memo(CalculationNode); 