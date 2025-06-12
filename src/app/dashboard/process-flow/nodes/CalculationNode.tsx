'use client';

import { memo, useEffect, useState } from 'react';
import { NodeProps, useReactFlow, Connection, Edge } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

interface CalculationNodeData extends BaseNodeData {
  value?: number;
  showDetails?: boolean;
  calculationSteps?: string[];
  lastProcessed?: number;
}

const CalculationNode = (props: NodeProps<CalculationNodeData>) => {
  const { data, id } = props;
  const [calculatedValue, setCalculatedValue] = useState(0);
  const { getNode, getEdges } = useReactFlow();

  const calculateValue = () => {
    const processedNodes = new Set<string>();
    const steps: string[] = [];
    
    const traverseAndSum = (nodeId: string, depth: number = 0): number => {
      // Prevent infinite loops from circular connections
      if (processedNodes.has(nodeId)) return 0;
      processedNodes.add(nodeId);

      const node = getNode(nodeId);
      if (!node) return 0;

      // Get all incoming edges to this node
      const incomingEdges = getEdges().filter(edge => edge.target === nodeId);
      
      // For task nodes, return their value if completed
      if (node.type === 'task') {
        if (node.data?.status === 'completed' && typeof node.data?.value === 'number') {
          const indent = '  '.repeat(depth);
          steps.push(`${indent}${node.data.label}: ${node.data.value}`);
          console.log(`Task node ${node.data.label} contributes value: ${node.data.value}`);
          return node.data.value;
        }
        return 0;
      }
      
      // For calculation nodes (including this one), sum up all incoming connections
      const indent = '  '.repeat(depth);
      steps.push(`${indent}Calculating sum for ${node.data.label || 'calculation node'}:`);
      
      const sum = incomingEdges.reduce((total, edge) => {
        const sourceValue = traverseAndSum(edge.source, depth + 1);
        console.log(`Edge from ${edge.source} contributes: ${sourceValue}`);
        return total + sourceValue;
      }, 0);

      steps.push(`${indent}Total: ${sum}`);
      return sum;
    };

    // Start the traversal from this calculation node
    const sum = traverseAndSum(id);
    console.log(`Final calculated sum for node ${id}: ${sum}`);
    
    setCalculatedValue(sum);
    // Store both the value and steps in node data
    if (data.value !== sum || !data.calculationSteps || data.calculationSteps.join('\n') !== steps.join('\n')) {
      data.value = sum;
      data.calculationSteps = steps;
    }
  };

  // Watch for changes in edges and connected nodes
  useEffect(() => {
    const edges = getEdges();
    const incomingEdges = edges.filter(edge => edge.target === id);
    
    // Set up an interval to check for changes
    const interval = setInterval(() => {
      const connectedNodes = incomingEdges.map(edge => getNode(edge.source));
      const shouldRecalculate = connectedNodes.some(node => 
        node?.type === 'task' && node?.data?.status === 'completed' && typeof node?.data?.value === 'number'
      );
      
      if (shouldRecalculate) {
        calculateValue();
      }
    }, 500);
    
    // Initial calculation
    calculateValue();
    
    return () => clearInterval(interval);
  }, [id, getEdges, getNode]);

  // Recalculate when lastProcessed changes (triggered by Process button)
  useEffect(() => {
    if (data.lastProcessed) {
      calculateValue();
    }
  }, [data.lastProcessed]);

  return (
    <div className="calculation-node">
      <BaseNode {...props} type="calculation" />
      <div className="mt-2 text-center">
        <div className="text-xs text-gray-500">Total Value:</div>
        <div className="text-lg font-bold text-teal-600">{calculatedValue}</div>
      </div>
    </div>
  );
};

export default memo(CalculationNode); 