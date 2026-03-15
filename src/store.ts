import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { faker } from '@faker-js/faker';

export type DataType = 'uuid' | 'string' | 'integer' | 'decimal' | 'boolean' | 'timestamp' | 'email' | 'name' | 'phone' | 'enum';
export type GrowthCurve = 'linear' | 'exponential' | 'logarithmic' | 's-curve';

export const TYPE_STRATEGIES: Record<DataType, string[]> = {
  uuid: ['uuid'],
  string: ['random_string', 'name', 'email', 'phone', 'enum'],
  integer: ['integer', 'auto_increment'],
  decimal: ['decimal'],
  boolean: ['boolean'],
  timestamp: ['timestamp', 'past_date', 'future_date'],
  email: ['email'],
  name: ['name'],
  phone: ['phone'],
  enum: ['enum'],
};

export interface Column {
  id: string;
  name: string;
  type: DataType;
  isPK: boolean;
  isFK: boolean;
  fkTarget?: { tableId: string; columnId: string };
  nullable: boolean;
  strategy: string;
  options: {
    min?: number;
    max?: number;
    values?: string[];
    weights?: number[];
    dependsOn?: string; // ID of another column in the same table
    dependencyRule?: 'after' | 'before' | 'match';
    lifecycleRules?: {
      value: string;
      requiredFields?: string[];
      nullFields?: string[];
    }[];
    [key: string]: any;
  };
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: 'one-to-many' | 'one-to-one';
}

export interface SimulationConfig {
  seed: number;
  timelineDays: number;
  growthCurve: GrowthCurve;
  anomalyRate: number;
}

interface SchemaState {
  tables: Table[];
  relationships: Relationship[];
  simulation: SimulationConfig;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  
  previewMode: 'table' | 'system' | 'temporal' | 'forecast';
  selectedRootRecordId: string | null;
  
  calculateForecast: () => {
    totalRows: number;
    avgGrowthRate: number;
    tableForecasts: { tableName: string; rowCount: number; growthRate: number }[];
  };
  
  setPreviewMode: (mode: 'table' | 'system' | 'temporal' | 'forecast') => void;
  setSelectedRootRecordId: (id: string | null) => void;
  updateSimulation: (updates: Partial<SimulationConfig>) => void;
  
  addTable: (table: Partial<Table>) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;
  
  addColumn: (tableId: string, column: Partial<Column>) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  removeColumn: (tableId: string, columnId: string) => void;
  
  addRelationship: (rel: Relationship) => void;
  createRelationshipWithFK: (params: {
    sourceTableId: string;
    sourceColumnId: string;
    targetTableId: string;
    targetColumnId: string | null;
    type: 'one-to-many' | 'one-to-one';
    createFKColumn: boolean;
    fkColumnName?: string;
  }) => void;
  removeRelationship: (id: string) => void;
  
  setSelected: (tableId: string | null, columnId: string | null) => void;
}

export const useSchemaStore = create<SchemaState>()(
  persist(
    (set, get) => ({
      tables: [],
      relationships: [],
      simulation: {
        seed: 42,
        timelineDays: 365,
        growthCurve: 's-curve',
        anomalyRate: 0.05,
      },
      selectedTableId: null,
      selectedColumnId: null,
      previewMode: 'table',
      selectedRootRecordId: null,

      setPreviewMode: (mode) => set({ previewMode: mode }),
      setSelectedRootRecordId: (id) => set({ selectedRootRecordId: id }),
  calculateForecast: () => {
    const { tables, simulation } = get();
    const days = simulation.timelineDays;
    const curve = simulation.growthCurve;
    
    let totalRows = 0;
    const tableForecasts = tables.map(table => {
      const baseRows = 1000; // Base assumption
      let multiplier = 1;
      
      if (curve === 'linear') multiplier = 1.0;
      if (curve === 'exponential') multiplier = 2.5;
      if (curve === 'logarithmic') multiplier = 0.5;
      if (curve === 's-curve') multiplier = 1.5;
      
      const rowCount = Math.floor(baseRows * multiplier * (days / 30));
      const growthRate = Math.floor(multiplier * 15);
      totalRows += rowCount;
      
      return {
        tableName: table.name,
        rowCount,
        growthRate
      };
    });
    
    return {
      totalRows,
      avgGrowthRate: Math.floor(tableForecasts.reduce((acc, f) => acc + f.growthRate, 0) / (tables.length || 1)),
      tableForecasts
    };
  },
  updateSimulation: (updates) => set((state) => ({
    simulation: { ...state.simulation, ...updates }
  })),

      addTable: (table) => set((state) => {
        const newTable: Table = {
          id: crypto.randomUUID(),
          name: 'new_table',
          columns: [],
          position: { x: 100, y: 100 },
          ...table,
        };
        
        // Ensure all columns have IDs and default values
        newTable.columns = newTable.columns.map(c => ({
          id: crypto.randomUUID(),
          name: 'new_column',
          type: 'string',
          isPK: false,
          isFK: false,
          nullable: false,
          strategy: 'random_string',
          options: {},
          ...c
        }));

        return {
          tables: [...state.tables, newTable],
        };
      }),

      updateTable: (id, updates) => set((state) => ({
        tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),

      removeTable: (id) => set((state) => ({
        tables: state.tables.filter((t) => t.id !== id),
        relationships: state.relationships.filter((r) => r.sourceTableId !== id && r.targetTableId !== id),
        selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
      })),

      addColumn: (tableId, column) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            const name = column.name || 'new_column';
            const strategy = column.strategy || 'random_string';

            // Semantic Duplicate Protection
            // We prevent adding columns that are semantically identical to existing ones
            // for common "singleton" fields like id, email, name if they use the same strategy.
            const semanticSingletons = ['uuid', 'email', 'name', 'phone'];
            const isSemanticDuplicate = t.columns.some(c => 
              (c.name === name && c.strategy === strategy) ||
              (semanticSingletons.includes(strategy) && c.strategy === strategy)
            );

            if (isSemanticDuplicate && column.strategy !== 'random_string') {
              return t; // Skip adding if it's a semantic duplicate
            }

            // Duplicate name protection (fallback for non-semantic fields)
            const isNameDuplicate = t.columns.some(c => c.name === name);
            const finalName = isNameDuplicate ? `${name}_${t.columns.length}` : name;

            return {
              ...t,
              columns: [
                ...t.columns,
                {
                  id: crypto.randomUUID(),
                  name: finalName,
                  type: 'string',
                  isPK: strategy === 'uuid',
                  isFK: false,
                  nullable: false,
                  strategy: 'random_string',
                  options: {},
                  ...column,
                },
              ],
            };
          }
          return t;
        }),
      })),

      updateColumn: (tableId, columnId, updates) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            // Duplicate name protection on update
            if (updates.name) {
              const isNameDuplicate = t.columns.some(c => c.id !== columnId && c.name === updates.name);
              if (isNameDuplicate) return t; 
            }

            // Semantic Duplicate Protection on update
            if (updates.strategy) {
              const semanticSingletons = ['uuid', 'email', 'name', 'phone'];
              if (semanticSingletons.includes(updates.strategy)) {
                const isSemanticDuplicate = t.columns.some(c => 
                  c.id !== columnId && c.strategy === updates.strategy
                );
                if (isSemanticDuplicate) return t;
              }
            }

            return {
              ...t,
              columns: t.columns.map((c) => {
                if (c.id === columnId) {
                  const newCol = { ...c, ...updates };
                  // Type-strategy enforcement
                  if (updates.type && !TYPE_STRATEGIES[updates.type].includes(newCol.strategy)) {
                    newCol.strategy = TYPE_STRATEGIES[updates.type][0];
                  }
                  return newCol;
                }
                return c;
              }),
            };
          }
          return t;
        }),
      })),

      removeColumn: (tableId, columnId) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            return {
              ...t,
              columns: t.columns.filter((c) => c.id !== columnId),
            };
          }
          return t;
        }),
        relationships: state.relationships.filter((r) => 
          !(r.sourceTableId === tableId && r.sourceColumnId === columnId) &&
          !(r.targetTableId === tableId && r.targetColumnId === columnId)
        ),
      })),

      addRelationship: (rel) => set((state) => ({
        relationships: [...state.relationships, rel],
      })),

      createRelationshipWithFK: ({ sourceTableId, sourceColumnId, targetTableId, targetColumnId, type, createFKColumn, fkColumnName }) => set((state) => {
        let finalTargetColumnId = targetColumnId;
        const sourceTable = state.tables.find(t => t.id === sourceTableId);
        const sourceColumn = sourceTable?.columns.find(c => c.id === sourceColumnId);
        
        const newTables = [...state.tables];
        
        if (createFKColumn && sourceTable && sourceColumn) {
          const targetTableIndex = newTables.findIndex(t => t.id === targetTableId);
          if (targetTableIndex !== -1) {
            const newColumnId = crypto.randomUUID();
            const name = fkColumnName || `${sourceTable.name.replace(/s$/, '')}_${sourceColumn.name}`;
            
            newTables[targetTableIndex] = {
              ...newTables[targetTableIndex],
              columns: [
                ...newTables[targetTableIndex].columns,
                {
                  id: newColumnId,
                  name,
                  type: sourceColumn.type,
                  isPK: false,
                  isFK: true,
                  fkTarget: { tableId: sourceTableId, columnId: sourceColumnId },
                  nullable: true,
                  strategy: sourceColumn.strategy,
                  options: { ...sourceColumn.options },
                }
              ]
            };
            finalTargetColumnId = newColumnId;
          }
        }

        if (!finalTargetColumnId) return { tables: newTables };

        const newRelationship: Relationship = {
          id: crypto.randomUUID(),
          sourceTableId,
          sourceColumnId,
          targetTableId,
          targetColumnId: finalTargetColumnId,
          type,
        };

        return {
          tables: newTables,
          relationships: [...state.relationships, newRelationship],
        };
      }),

      removeRelationship: (id) => set((state) => ({
        relationships: state.relationships.filter((r) => r.id !== id),
      })),

      setSelected: (tableId, columnId) => set({ selectedTableId: tableId, selectedColumnId: columnId }),
    }),
    {
      name: 'reality-db-storage',
    }
  )
);

// Data Generation Logic
export const generateGhostRows = (table: Table, count: number = 5, allTables: Table[], projectContext: Record<string, any[]> = {}) => {
  const rows: any[] = [];
  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = { id_index: i };
    
    // First pass: generate non-dependent values
    table.columns.forEach((col) => {
      if (!col.options.dependsOn) {
        row[col.name] = generateValue(col, allTables, projectContext, row);
      }
    });

    // Second pass: generate dependent values (lifecycle and temporal)
    table.columns.forEach((col) => {
      if (col.options.dependsOn) {
        row[col.name] = generateValue(col, allTables, projectContext, row);
      }
    });

    // Third pass: apply lifecycle constraints (nulling fields)
    table.columns.forEach((col) => {
      if (col.strategy === 'enum' && col.options.lifecycleRules) {
        const val = row[col.name];
        const rule = col.options.lifecycleRules.find(r => r.value === val);
        if (rule?.nullFields) {
          rule.nullFields.forEach(fieldName => {
            row[fieldName] = null;
          });
        }
      }
    });

    rows.push(row);
  }
  return rows;
};

const generateValue = (col: Column, allTables: Table[], projectContext: Record<string, any[]>, currentRow: Record<string, any>) => {
  // Check if this field should be null based on another column's lifecycle rule
  // This is handled in the third pass of generateGhostRows for simplicity, 
  // but we can also check here if needed.

  if (col.isFK && col.fkTarget) {
    const targetTableData = projectContext[col.fkTarget.tableId];
    if (targetTableData && targetTableData.length > 0) {
      const randomRow = faker.helpers.arrayElement(targetTableData);
      const targetTable = allTables.find(t => t.id === col.fkTarget?.tableId);
      const targetCol = targetTable?.columns.find(c => c.id === col.fkTarget?.columnId);
      if (targetCol) {
        return randomRow[targetCol.name];
      }
    }
    return `ref(${col.fkTarget.tableId.slice(0, 4)})`;
  }

  // Temporal/Behavioral Rules
  if (col.options.dependsOn) {
    const baseValue = currentRow[col.options.dependsOn];
    if (baseValue) {
      if (col.strategy === 'timestamp' || col.strategy === 'future_date' || col.strategy === 'past_date') {
        const baseDate = new Date(baseValue);
        if (col.options.dependencyRule === 'after') {
          return faker.date.future({ refDate: baseDate }).toISOString().split('T')[0];
        } else if (col.options.dependencyRule === 'before') {
          return faker.date.past({ refDate: baseDate }).toISOString().split('T')[0];
        }
      }
    }
  }

  switch (col.strategy) {
    case 'uuid': return faker.string.uuid().slice(0, 8);
    case 'name': return faker.person.fullName();
    case 'email': return faker.internet.email();
    case 'phone': return faker.phone.number();
    case 'timestamp': return faker.date.recent().toISOString().split('T')[0];
    case 'past_date': return faker.date.past().toISOString().split('T')[0];
    case 'future_date': return faker.date.future({ years: 1 }).toISOString().split('T')[0];
    case 'integer': return faker.number.int({ min: col.options.min ?? 1, max: col.options.max ?? 1000 });
    case 'auto_increment': return (currentRow.id_index || 0) + 1;
    case 'decimal': return faker.number.float({ min: col.options.min ?? 1, max: col.options.max ?? 1000, fractionDigits: 2 });
    case 'boolean': return faker.datatype.boolean();
    case 'enum': {
      const vals = col.options.values || ['active', 'inactive', 'pending'];
      const weights = col.options.weights || [];
      
      if (weights.length === vals.length && weights.length > 0) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < vals.length; i++) {
          if (random < weights[i]) return vals[i];
          random -= weights[i];
        }
      }
      
      return faker.helpers.arrayElement(vals);
    }
    default: return faker.lorem.word();
  }
};

export const DOMAIN_TEMPLATES = {
  SaaS: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'email', type: 'email', strategy: 'email' },
        { name: 'full_name', type: 'name', strategy: 'name' },
        { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
      ]
    },
    {
      name: 'organizations',
      columns: [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'name', type: 'string', strategy: 'random_string' },
        { name: 'plan', type: 'enum', strategy: 'enum', options: { values: ['free', 'pro', 'enterprise'], weights: [70, 20, 10] } },
      ]
    },
    {
      name: 'subscriptions',
      columns: [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['active', 'cancelled', 'trial'], weights: [70, 20, 10] } },
        { name: 'started_at', type: 'timestamp', strategy: 'past_date' },
        { name: 'ended_at', type: 'timestamp', strategy: 'future_date', options: { dependsOn: 'started_at', dependencyRule: 'after' } },
      ]
    }
  ],
  Ecommerce: [
    {
      name: 'customers',
      columns: [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'email', type: 'email', strategy: 'email' },
        { name: 'name', type: 'name', strategy: 'name' },
      ]
    },
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'sku', type: 'string', strategy: 'random_string' },
        { name: 'price', type: 'decimal', strategy: 'decimal', options: { min: 10, max: 500 } },
        { name: 'category', type: 'enum', strategy: 'enum', options: { values: ['electronics', 'clothing', 'home', 'beauty'] } },
      ]
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['created', 'paid', 'shipped', 'delivered'], weights: [10, 20, 30, 40] } },
        { name: 'total', type: 'decimal', strategy: 'decimal' },
        { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
      ]
    }
  ]
};
