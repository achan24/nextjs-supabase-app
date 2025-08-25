// Core data models for the Action-Decision Point system

/**
 * Represents an action in the timeline
 */
export class Action {
  id: string;
  name: string;
  description: string;
  duration: number; // in milliseconds
  x: number;
  y: number;
  connections: string[]; // array of connected node IDs
  type: 'action';
  status: 'pending' | 'running' | 'completed' | 'paused';
  startTime: number | null;
  endTime: number | null;
  progress: number; // 0-100
  actualDuration: number | null; // actual time taken in milliseconds
  executionHistory: Array<{
    startTime: number;
    endTime: number;
    duration: number;
    timestamp: string;
  }> = [];

  constructor({
    id,
    name,
    description,
    duration,
    x = 0,
    y = 0,
    connections = [] // array of connected node IDs
  }: {
    id: string;
    name: string;
    description: string;
    duration: number;
    x?: number;
    y?: number;
    connections?: string[];
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.duration = duration;
    this.x = x;
    this.y = y;
    this.connections = connections;
    this.type = 'action';
    this.status = 'pending';
    this.startTime = null;
    this.endTime = null;
    this.progress = 0;
    this.actualDuration = null;
  }

  start() {
    this.status = 'running';
    this.startTime = Date.now();
    this.endTime = this.startTime + this.duration;
  }

  complete() {
    this.status = 'completed';
    this.progress = 100;
    if (this.startTime) {
      this.actualDuration = Date.now() - this.startTime;
      this.executionHistory.push({
        startTime: this.startTime,
        endTime: Date.now(),
        duration: this.actualDuration,
        timestamp: new Date().toISOString()
      });
    }
  }

  pause() {
    this.status = 'paused';
  }

  updateProgress(isManualMode = false) {
    if (this.status === 'running' && this.startTime) {
      const elapsed = Date.now() - this.startTime;
      this.progress = Math.min(100, (elapsed / this.duration) * 100);
      
      // Only auto-complete if not in manual mode
      if (this.progress >= 100 && !isManualMode) {
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
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  options: Array<{actionId: string, label: string}>; // array of connected action IDs with labels
  type: 'decision';
  status: 'pending' | 'active' | 'completed';
  selectedOption: string | null;

  constructor({
    id,
    name,
    description,
    x = 0,
    y = 0,
    options = [] // array of connected action IDs with labels
  }: {
    id: string;
    name: string;
    description: string;
    x?: number;
    y?: number;
    options?: Array<{actionId: string, label: string}>;
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.x = x;
    this.y = y;
    this.options = options;
    this.type = 'decision';
    this.status = 'pending';
    this.selectedOption = null;
  }

  activate() {
    this.status = 'active';
  }

  selectOption(actionId: string) {
    this.selectedOption = actionId;
    this.status = 'completed';
  }

  addOption(actionId: string, label: string) {
    this.options.push({ actionId, label });
  }

  removeOption(actionId: string) {
    this.options = this.options.filter(opt => opt.actionId !== actionId);
  }
}

/**
 * Manages the overall timeline state and execution
 */
export class TimelineEngine {
  actions: Map<string, Action>;
  decisionPoints: Map<string, DecisionPoint>;
  notes: Map<string, TimelineNote>;
  currentNodeId: string | null;
  executionHistory: string[];
  isRunning: boolean;
  isManualMode: boolean;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  timelineComplete: boolean; // Track if timeline is complete but session still running
  listeners: Set<() => void>;
  private progressInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.actions = new Map();
    this.decisionPoints = new Map();
    this.notes = new Map();
    this.currentNodeId = null;
    this.executionHistory = [];
    this.isRunning = false;
    this.isManualMode = false;
    this.sessionStartTime = null;
    this.sessionEndTime = null;
    this.timelineComplete = false;
    this.listeners = new Set();
  }

  // Node management
  addAction(action: Action) {
    this.actions.set(action.id, action);
    this.notifyListeners();
  }

  addDecisionPoint(decisionPoint: DecisionPoint) {
    this.decisionPoints.set(decisionPoint.id, decisionPoint);
    this.notifyListeners();
  }

  addNote(note: TimelineNote) {
    this.notes.set(note.id, note);
    this.notifyListeners();
  }

  removeNode(nodeId: string) {
    this.actions.delete(nodeId);
    this.decisionPoints.delete(nodeId);
    this.notes.delete(nodeId);
    
    // Remove connections to this node
    this.actions.forEach(action => {
      action.connections = action.connections.filter(id => id !== nodeId);
    });
    this.decisionPoints.forEach(dp => {
      dp.options = dp.options.filter(opt => opt.actionId !== nodeId);
    });
    
    this.notifyListeners();
  }

  getNode(nodeId: string) {
    return this.actions.get(nodeId) || this.decisionPoints.get(nodeId) || this.notes.get(nodeId);
  }

  getAllNodes() {
    return [
      ...Array.from(this.actions.values()),
      ...Array.from(this.decisionPoints.values()),
      ...Array.from(this.notes.values())
    ];
  }

  // Execution management
  start(startNodeId: string) {
    if (!startNodeId || !this.getNode(startNodeId)) {
      throw new Error('Invalid start node');
    }
    
    this.currentNodeId = startNodeId;
    this.isRunning = true;
    this.executionHistory = [startNodeId];
    
    this.executeCurrentNode();
  }

  executeCurrentNode() {
    const currentNode = this.getNode(this.currentNodeId!);
    if (!currentNode) return;

    if (currentNode.type === 'action') {
      this.executeAction(currentNode);
    } else if (currentNode.type === 'decision') {
      this.executeDecisionPoint(currentNode);
    }
  }

  executeAction(action: Action) {
    action.start();
    this.notifyListeners();

    // Clear any existing interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // Set up timer to track progress
    this.progressInterval = setInterval(() => {
      action.updateProgress(this.isManualMode);
      this.notifyListeners();

      if (action.status === 'completed') {
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
        this.onActionComplete(action);
      }
    }, 100); // Update every 100ms
  }

  executeDecisionPoint(decisionPoint: DecisionPoint) {
    decisionPoint.activate();
    this.notifyListeners();
    // Wait for user input - will be handled by UI
  }

  onActionComplete(action: Action) {
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

  makeDecision(decisionPoint: DecisionPoint, selectedActionId: string) {
    if (decisionPoint.status !== 'active') return;
    
    decisionPoint.selectOption(selectedActionId);
    this.moveToNode(selectedActionId);
  }

  moveToNode(nodeId: string) {
    this.currentNodeId = nodeId;
    this.executionHistory.push(nodeId);
    this.executeCurrentNode();
  }

  pause() {
    const currentNode = this.getNode(this.currentNodeId!);
    if (currentNode && currentNode.type === 'action' && currentNode.status === 'running') {
      currentNode.pause();
    }
    this.isRunning = false;
    this.notifyListeners();
  }

  resume() {
    const currentNode = this.getNode(this.currentNodeId!);
    if (currentNode && currentNode.type === 'action' && currentNode.status === 'paused') {
      currentNode.start(); // Restart the action
    }
    this.isRunning = true;
    this.executeCurrentNode();
  }

  stop() {
    // Clear any existing interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    this.isRunning = false;
    this.currentNodeId = null;
    this.notifyListeners();
  }

  // Manual step mode methods
  startManualMode(startNodeId: string) {
    if (!startNodeId || !this.getNode(startNodeId)) {
      throw new Error('Invalid start node');
    }
    
    this.currentNodeId = startNodeId;
    this.isRunning = true;
    this.isManualMode = true;
    this.sessionStartTime = Date.now();
    this.executionHistory = [startNodeId];
    
    this.executeCurrentNodeManual();
  }

  executeCurrentNodeManual() {
    const currentNode = this.getNode(this.currentNodeId!);
    if (!currentNode) return;

    if (currentNode.type === 'action') {
      currentNode.start();
      this.notifyListeners();

      // Clear any existing interval
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }

      // Set up timer to track progress (but don't auto-complete in manual mode)
      this.progressInterval = setInterval(() => {
        currentNode.updateProgress(true); // Pass true for manual mode
        this.notifyListeners();
      }, 100); // Update every 100ms
    } else if (currentNode.type === 'decision') {
      currentNode.activate();
      this.notifyListeners();
    }
  }

  nextStep() {
    const currentNode = this.getNode(this.currentNodeId!);
    if (!currentNode) return;

    // Find next node first to check if this is the last task
    const nextNodeId = this.getNextNodeId();
    
    if (nextNodeId) {
      // Complete the current node and move to next
      if (currentNode.type === 'action') {
        currentNode.complete();
      } else if (currentNode.type === 'decision') {
        // For decisions, we need a selected option to proceed
        if (!currentNode.selectedOption) {
          console.warn('Cannot proceed: no option selected for decision');
          return;
        }
      }
      this.moveToNodeManual(nextNodeId);
    } else {
      // This is the last task - don't complete it, just mark timeline as complete
      // Keep the current task running so the timer continues
      this.timelineComplete = true;
      console.log('Reached end of timeline - last task continues running. Press End to complete session.');
    }
  }

  getNextNodeId(): string | null {
    const currentNode = this.getNode(this.currentNodeId!);
    if (!currentNode) return null;

    if (currentNode.type === 'action') {
      const nextNodes = currentNode.connections;
      return nextNodes.length > 0 ? nextNodes[0] : null;
    } else if (currentNode.type === 'decision') {
      return currentNode.selectedOption || null;
    }

    return null;
  }

  moveToNodeManual(nodeId: string) {
    this.currentNodeId = nodeId;
    this.executionHistory.push(nodeId);
    this.executeCurrentNodeManual();
  }

  endManualMode() {
    // Clear any existing interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    // Complete the current task if it's still running
    const currentNode = this.getNode(this.currentNodeId!);
    if (currentNode && currentNode.type === 'action' && currentNode.status === 'running') {
      currentNode.complete();
    }
    
    this.isRunning = false;
    this.isManualMode = false;
    this.timelineComplete = false;
    this.sessionEndTime = Date.now();
    this.notifyListeners();
  }

  getSessionStats() {
    // Simply look at all completed actions and sum their actual durations
    const completedActions = Array.from(this.actions.values()).filter(action => 
      action.actualDuration !== null && action.actualDuration > 0
    );
    
    const totalTime = completedActions.reduce((sum, action) => 
      sum + (action.actualDuration || 0), 0
    );

    const actionStats = completedActions.map(action => ({
      id: action.id,
      name: action.name,
      actualDuration: action.actualDuration,
      expectedDuration: action.duration,
      startTime: action.startTime,
      endTime: action.endTime,
      executionHistory: action.executionHistory
    }));

    return {
      totalTime,
      completedActions: actionStats,
      completedCount: completedActions.length,
      sessionStartTime: this.sessionStartTime,
      sessionEndTime: this.sessionEndTime,
      executionHistory: this.executionHistory,
      isManualMode: this.isManualMode
    };
  }

  reset() {
    this.stop();
    this.executionHistory = [];
    this.sessionStartTime = null;
    this.sessionEndTime = null;
    this.isManualMode = false;
    this.timelineComplete = false;
    
    // Reset all nodes and clear their execution history
    this.actions.forEach(action => {
      action.status = 'pending';
      action.progress = 0;
      action.startTime = null;
      action.endTime = null;
      action.actualDuration = null;
      action.executionHistory = [];
    });
    
    this.decisionPoints.forEach(dp => {
      dp.status = 'pending';
      dp.selectedOption = null;
    });
    
    this.notifyListeners();
  }

  // Event handling
  addListener(callback: () => void) {
    this.listeners.add(callback);
  }

  removeListener(callback: () => void) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  // Serialization
  toJSON() {
    return {
      actions: Array.from(this.actions.values()),
      decisionPoints: Array.from(this.decisionPoints.values()),
      notes: Array.from(this.notes.values()),
      currentNodeId: this.currentNodeId,
      executionHistory: this.executionHistory,
      isRunning: this.isRunning
    };
  }

  fromJSON(data: any) {
    this.actions.clear();
    this.decisionPoints.clear();
    this.notes.clear();
    
    data.actions.forEach((actionData: any) => {
      const action = new Action(actionData);
      Object.assign(action, actionData); // Restore all properties
      this.actions.set(action.id, action);
    });
    
    data.decisionPoints.forEach((dpData: any) => {
      const dp = new DecisionPoint(dpData);
      Object.assign(dp, dpData); // Restore all properties
      this.decisionPoints.set(dp.id, dp);
    });
    
    if (Array.isArray(data.notes)) {
      data.notes.forEach((noteData: any) => {
        const note = new TimelineNote(noteData);
        Object.assign(note, noteData);
        this.notes.set(note.id, note);
      });
    }
    
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

export function formatDuration(milliseconds: number) {
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

export function parseDuration(durationString: string) {
  // Parse strings like "1h 30m 45s", "30m", "45s", etc.
  const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
  const matches = durationString.match(regex);
  
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

// New: Non-executable note node type for timelines
export class TimelineNote {
  id: string;
  name: string; // short title shown in graph
  content: string; // longer text shown on hover or edit
  x: number;
  y: number;
  type: 'note';

  constructor({
    id,
    name,
    content = '',
    x = 0,
    y = 0,
  }: {
    id: string;
    name: string;
    content?: string;
    x?: number;
    y?: number;
  }) {
    this.id = id;
    this.name = name;
    this.content = content;
    this.x = x;
    this.y = y;
    this.type = 'note';
  }
}
