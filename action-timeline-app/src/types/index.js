// Core data models for the Action-Decision Point system

/**
 * Represents an action in the timeline
 */
export class Action {
  constructor({
    id,
    name,
    description,
    duration, // in milliseconds
    x = 0,
    y = 0,
    connections = [] // array of connected node IDs
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.duration = duration;
    this.x = x;
    this.y = y;
    this.connections = connections;
    this.type = 'action';
    this.status = 'pending'; // 'pending', 'running', 'completed', 'paused'
    this.startTime = null;
    this.endTime = null;
    this.progress = 0; // 0-100
  }

  start() {
    this.status = 'running';
    this.startTime = Date.now();
    this.endTime = this.startTime + this.duration;
  }

  complete() {
    this.status = 'completed';
    this.progress = 100;
  }

  pause() {
    this.status = 'paused';
  }

  updateProgress() {
    if (this.status === 'running' && this.startTime) {
      const elapsed = Date.now() - this.startTime;
      this.progress = Math.min(100, (elapsed / this.duration) * 100);
      
      if (this.progress >= 100) {
        this.complete();
      }
    }
  }

  getRemainingTime() {
    if (this.status === 'running' && this.endTime) {
      return Math.max(0, this.endTime - Date.now());
    }
    return this.duration;
  }
}

/**
 * Represents a decision point in the timeline
 */
export class DecisionPoint {
  constructor({
    id,
    name,
    description,
    x = 0,
    y = 0,
    options = [] // array of connected action IDs with labels
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.x = x;
    this.y = y;
    this.options = options; // [{actionId: 'id', label: 'Option Label'}]
    this.type = 'decision';
    this.status = 'pending'; // 'pending', 'active', 'completed'
    this.selectedOption = null;
  }

  activate() {
    this.status = 'active';
  }

  selectOption(actionId) {
    this.selectedOption = actionId;
    this.status = 'completed';
  }

  addOption(actionId, label) {
    this.options.push({ actionId, label });
  }

  removeOption(actionId) {
    this.options = this.options.filter(opt => opt.actionId !== actionId);
  }
}

/**
 * Manages the overall timeline state and execution
 */
export class TimelineEngine {
  constructor() {
    this.actions = new Map();
    this.decisionPoints = new Map();
    this.currentNodeId = null;
    this.executionHistory = [];
    this.isRunning = false;
    this.listeners = new Set();
  }

  // Node management
  addAction(action) {
    this.actions.set(action.id, action);
    this.notifyListeners();
  }

  addDecisionPoint(decisionPoint) {
    this.decisionPoints.set(decisionPoint.id, decisionPoint);
    this.notifyListeners();
  }

  removeNode(nodeId) {
    this.actions.delete(nodeId);
    this.decisionPoints.delete(nodeId);
    
    // Remove connections to this node
    this.actions.forEach(action => {
      action.connections = action.connections.filter(id => id !== nodeId);
    });
    this.decisionPoints.forEach(dp => {
      dp.options = dp.options.filter(opt => opt.actionId !== nodeId);
    });
    
    this.notifyListeners();
  }

  getNode(nodeId) {
    return this.actions.get(nodeId) || this.decisionPoints.get(nodeId);
  }

  getAllNodes() {
    return [
      ...Array.from(this.actions.values()),
      ...Array.from(this.decisionPoints.values())
    ];
  }

  // Execution management
  start(startNodeId) {
    if (!startNodeId || !this.getNode(startNodeId)) {
      throw new Error('Invalid start node');
    }
    
    this.currentNodeId = startNodeId;
    this.isRunning = true;
    this.executionHistory = [startNodeId];
    
    this.executeCurrentNode();
  }

  executeCurrentNode() {
    const currentNode = this.getNode(this.currentNodeId);
    if (!currentNode) return;

    if (currentNode.type === 'action') {
      this.executeAction(currentNode);
    } else if (currentNode.type === 'decision') {
      this.executeDecisionPoint(currentNode);
    }
  }

  executeAction(action) {
    action.start();
    this.notifyListeners();

    // Set up timer to track progress
    const interval = setInterval(() => {
      action.updateProgress();
      this.notifyListeners();

      if (action.status === 'completed') {
        clearInterval(interval);
        this.onActionComplete(action);
      }
    }, 100); // Update every 100ms
  }

  executeDecisionPoint(decisionPoint) {
    decisionPoint.activate();
    this.notifyListeners();
    // Wait for user input - will be handled by UI
  }

  onActionComplete(action) {
    // Find next node
    const nextNodes = action.connections;
    
    if (nextNodes.length === 0) {
      // End of timeline
      this.stop();
    } else if (nextNodes.length === 1) {
      // Single connection - continue automatically
      this.moveToNode(nextNodes[0]);
    } else {
      // Multiple connections - create implicit decision point
      // This shouldn't happen in well-formed graphs, but handle gracefully
      console.warn('Action has multiple connections but no explicit decision point');
      this.stop();
    }
  }

  makeDecision(decisionPoint, selectedActionId) {
    if (decisionPoint.status !== 'active') return;
    
    decisionPoint.selectOption(selectedActionId);
    this.moveToNode(selectedActionId);
  }

  moveToNode(nodeId) {
    this.currentNodeId = nodeId;
    this.executionHistory.push(nodeId);
    this.executeCurrentNode();
  }

  pause() {
    const currentNode = this.getNode(this.currentNodeId);
    if (currentNode && currentNode.type === 'action' && currentNode.status === 'running') {
      currentNode.pause();
    }
    this.isRunning = false;
    this.notifyListeners();
  }

  resume() {
    const currentNode = this.getNode(this.currentNodeId);
    if (currentNode && currentNode.type === 'action' && currentNode.status === 'paused') {
      currentNode.start(); // Restart the action
    }
    this.isRunning = true;
    this.executeCurrentNode();
  }

  stop() {
    this.isRunning = false;
    this.currentNodeId = null;
    this.notifyListeners();
  }

  reset() {
    this.stop();
    this.executionHistory = [];
    
    // Reset all nodes
    this.actions.forEach(action => {
      action.status = 'pending';
      action.progress = 0;
      action.startTime = null;
      action.endTime = null;
    });
    
    this.decisionPoints.forEach(dp => {
      dp.status = 'pending';
      dp.selectedOption = null;
    });
    
    this.notifyListeners();
  }

  // Event handling
  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this));
  }

  // Serialization
  toJSON() {
    return {
      actions: Array.from(this.actions.values()),
      decisionPoints: Array.from(this.decisionPoints.values()),
      currentNodeId: this.currentNodeId,
      executionHistory: this.executionHistory,
      isRunning: this.isRunning
    };
  }

  fromJSON(data) {
    this.actions.clear();
    this.decisionPoints.clear();
    
    data.actions.forEach(actionData => {
      const action = new Action(actionData);
      Object.assign(action, actionData); // Restore all properties
      this.actions.set(action.id, action);
    });
    
    data.decisionPoints.forEach(dpData => {
      const dp = new DecisionPoint(dpData);
      Object.assign(dp, dpData); // Restore all properties
      this.decisionPoints.set(dp.id, dp);
    });
    
    this.currentNodeId = data.currentNodeId;
    this.executionHistory = data.executionHistory || [];
    this.isRunning = data.isRunning || false;
    
    this.notifyListeners();
  }
}

// Utility functions
export function generateId() {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function parseDuration(durationString) {
  // Parse strings like "1h 30m 45s", "30m", "45s", etc.
  const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
  const matches = durationString.match(regex);
  
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || 0);
  const minutes = parseInt(matches[2] || 0);
  const seconds = parseInt(matches[3] || 0);
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}