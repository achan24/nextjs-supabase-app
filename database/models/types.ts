export interface ColumnDefinition {
  type: string;
  primaryKey?: boolean;
  references?: string;
  notNull?: boolean;
  defaultValue?: string;
  check?: string;
}

export interface Relationship {
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';
  table: string;
  foreignKey: string;
  through?: string;  // For many-to-many relationships
}

export interface Index {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface Policy {
  name: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  using?: string;
  check?: string;
}

export interface TableDefinition {
  name: string;
  description: string;
  columns: Record<string, ColumnDefinition>;
  relationships: Relationship[];
  indexes: Index[];
  policies: Policy[];
} 