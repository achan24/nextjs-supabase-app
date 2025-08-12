# Decision Timelines

## Overview

Decision Timelines is a system for modeling branching workflows where actions have measurable durations and decisions create multiple possible paths through a process.

## Core Concepts

### 1. Actions vs Decision Points

**Actions** and **Decision Points** are fundamentally different entities:

- **Action**: A time-consuming task that can be measured and completed
- **Decision Point**: A branching moment where a choice must be made between multiple paths

These are separate concepts from the visualization - the data structure exists independently of how it's displayed.

### 2. Process Flow Logic

At the end of each action, the process can:
- **a)** Continue to another action
- **b)** Reach a decision point  
- **c)** Terminate (no further steps)

Decision points always lead to multiple possible actions or decision points.

## Data Structure

### Graph Object (Top Level)
```typescript
type Graph = {
  nodes: Record<string, TimelineNode>;  // All nodes indexed by ID
  rootId: string;                       // Starting node ID
  lastEdited: number;                   // Timestamp of last modification
};
```

### TimelineNode (Individual Node)
```typescript
type TimelineNode = {
  id: string;                    // Unique identifier (UUID)
  kind: "action" | "decision";   // Node type
  title: string;                 // Display name
  children: string[];            // Array of child node IDs
  parentId?: string | null;      // Parent node ID (optional)
  createdAt: number;             // Timestamp when created
  
  // Action-specific properties
  durationsMs?: number[];        // Historical completion times in milliseconds
  defaultDurationMs?: number;    // Rolling average for visualization
  
  // Decision-specific properties  
  chosenChildIds?: string[];     // History of chosen child IDs
};
```

## Sample Data Structure

```json
{
  "nodes": {
    "root-123": {
      "id": "root-123",
      "kind": "action",
      "title": "Open book",
      "children": ["decision-456"],
      "parentId": null,
      "createdAt": 1703123456789,
      "durationsMs": [5000, 4500, 5200],
      "defaultDurationMs": 4900
    },
    "decision-456": {
      "id": "decision-456", 
      "kind": "decision",
      "title": "Which chapter to read?",
      "children": ["action-789", "action-101"],
      "parentId": "root-123",
      "createdAt": 1703123456790,
      "chosenChildIds": ["action-789"]
    },
    "action-789": {
      "id": "action-789",
      "kind": "action", 
      "title": "Read first chapter",
      "children": ["decision-202"],
      "parentId": "decision-456",
      "createdAt": 1703123456791,
      "durationsMs": [120000, 115000, 125000],
      "defaultDurationMs": 120000
    },
    "action-101": {
      "id": "action-101",
      "kind": "action",
      "title": "Read last chapter", 
      "children": [],
      "parentId": "decision-456",
      "createdAt": 1703123456792,
      "durationsMs": [180000, 175000],
      "defaultDurationMs": 177500
    },
    "decision-202": {
      "id": "decision-202",
      "kind": "decision",
      "title": "Continue reading?",
      "children": ["action-303", "action-404"],
      "parentId": "action-789", 
      "createdAt": 1703123456793,
      "chosenChildIds": []
    },
    "action-303": {
      "id": "action-303",
      "kind": "action",
      "title": "Read second chapter",
      "children": [],
      "parentId": "decision-202",
      "createdAt": 1703123456794,
      "durationsMs": [90000],
      "defaultDurationMs": 90000
    },
    "action-404": {
      "id": "action-404", 
      "kind": "action",
      "title": "Close book",
      "children": [],
      "parentId": "decision-202",
      "createdAt": 1703123456795,
      "durationsMs": [2000, 1500],
      "defaultDurationMs": 1750
    }
  },
  "rootId": "root-123",
  "lastEdited": 1703123456796
}
```

## Field Descriptions

### Common Fields (All Nodes)
- **`id`**: Unique identifier, typically UUID
- **`kind`**: Either `"action"` or `"decision"`
- **`title`**: Human-readable name for the node
- **`children`**: Array of child node IDs (can be empty for terminal actions)
- **`parentId`**: ID of the parent node (null for root)
- **`createdAt`**: Timestamp when node was created

### Action-Specific Fields
- **`durationsMs`**: Array of actual completion times from previous runs (in milliseconds)
- **`defaultDurationMs`**: Rolling average of historical durations, used for visualization and runner timing

### Decision-Specific Fields  
- **`chosenChildIds`**: Array of previously chosen child IDs, representing decision history

## Process Flow Rules

### Action Nodes
- Can have 0, 1, or multiple children
- If 0 children: Process terminates
- If 1 child: Process continues to next node
- If multiple children: Must be followed by a decision point (validation rule)

### Decision Nodes
- Always have multiple children (branching points)
- Track decision history in `chosenChildIds[]`
- When runner encounters a decision, it either:
  - Follows the last chosen path (if `chosenChildIds` has entries)
  - Prompts user for a new choice (if `chosenChildIds` is empty)

## Time Tracking

### Duration Calculation
```typescript
const rollingAverage = (values: number[]) => {
  if (!values || values.length === 0) return undefined;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
};
```

### Time Display
```typescript
const msToHuman = (ms: number | undefined) => {
  if (!ms || ms <= 0) return "--";
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
};
```

## Storage

- **Location**: Browser localStorage
- **Key**: `"branching-timelines-v1"`
- **Format**: JSON stringified Graph object
- **Persistence**: Automatically saved on every modification

## Runner Logic

### Path Building
The runner builds linear paths through the graph:
1. Start from current node
2. For actions: Continue to single child (if exists)
3. For decisions: Wait for user choice, then follow chosen path
4. Stop when no more children (termination)

### Decision Handling
When runner reaches a decision node:
1. Check if `chosenChildIds` has entries
2. If yes: Follow the last chosen path
3. If no: Pause and show decision popup
4. Record choice in `chosenChildIds`
5. Continue with chosen path

## Implementation Notes

- The data structure is independent of visualization
- React Flow, Mermaid, and Tree View are just different ways to display the same data
- Time tracking is optional - actions without `durationsMs` use default estimates
- Decision history allows for process analysis and optimization
- The structure supports complex nested branching workflows
