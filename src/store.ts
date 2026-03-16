import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { faker } from '@faker-js/faker';
import { Table, Column, Relationship, SimulationConfig, DataType, GrowthCurve, RealityTemplate, RelationshipSemantic } from './types';

export { type Table, type Column, type Relationship, type SimulationConfig, type DataType, type GrowthCurve };

export const TYPE_STRATEGIES: Record<DataType, string[]> = {
  uuid: ['uuid'],
  string: ['random_string', 'name', 'company_name', 'email', 'phone', 'enum'],
  integer: ['integer', 'auto_increment'],
  decimal: ['decimal'],
  boolean: ['boolean'],
  timestamp: ['timestamp', 'past_date', 'future_date'],
  email: ['email'],
  name: ['name'],
  phone: ['phone'],
  enum: ['enum'],
};

interface SchemaState {
  tables: Table[];
  relationships: Relationship[];
  simulation: SimulationConfig;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  selectedRelationshipId: string | null;
  
  previewMode: 'table' | 'system' | 'temporal' | 'forecast' | 'flow';
  selectedRootRecordId: string | null;
  
  calculateForecast: () => {
    totalRows: number;
    avgGrowthRate: number;
    tableForecasts: { tableName: string; rowCount: number; growthRate: number }[];
  };
  
  setPreviewMode: (mode: 'table' | 'system' | 'temporal' | 'forecast' | 'flow') => void;
  setSelectedRootRecordId: (id: string | null) => void;
  updateSimulation: (updates: Partial<SimulationConfig>) => void;
  
  addTable: (table: Partial<Table>) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;
  
  addColumn: (tableId: string, column: Partial<Column>) => void;
  bulkAddColumns: (tableId: string, columns: Partial<Column>[]) => void;
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
    semantic?: RelationshipSemantic;
  }) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  removeRelationship: (id: string) => void;
  
  setSelected: (tableId: string | null, columnId: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  loadTemplate: (template: RealityTemplate) => void;
  applyAiGeneratedSystem: (system: any) => void;
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
      selectedRelationshipId: null,
      previewMode: 'table',
      selectedRootRecordId: null,

      setPreviewMode: (mode) => set({ previewMode: mode }),
      setSelectedRootRecordId: (id) => set({ selectedRootRecordId: id }),
      loadTemplate: (template) => set({
        tables: template.tables,
        relationships: template.relationships,
        simulation: template.simulation,
        selectedTableId: null,
        selectedColumnId: null,
        selectedRelationshipId: null,
        selectedRootRecordId: null,
        previewMode: 'table'
      }),
      applyAiGeneratedSystem: (system) => {
        const tableMap: Record<string, string> = {};
        const newTables: Table[] = system.tables.map((t: any, idx: number) => {
          const id = crypto.randomUUID();
          tableMap[t.name] = id;
          return {
            id,
            name: t.name,
            description: t.description,
            columns: t.columns.map((c: any) => ({
              id: crypto.randomUUID(),
              name: c.name,
              type: c.type,
              isPK: c.isPK || false,
              isFK: c.isFK || false,
              nullable: c.nullable || false,
              strategy: c.strategy,
              options: {},
            })),
            position: { x: 100 + (idx % 3) * 300, y: 100 + Math.floor(idx / 3) * 250 },
          };
        });

        const newRelationships: Relationship[] = system.relationships.map((r: any) => {
          const sourceTableId = tableMap[r.sourceTable];
          const targetTableId = tableMap[r.targetTable];
          const sourceTable = newTables.find(t => t.id === sourceTableId);
          const targetTable = newTables.find(t => t.id === targetTableId);
          
          const sourceColumnId = sourceTable?.columns.find(c => c.name === r.sourceColumn)?.id || sourceTable?.columns[0]?.id || '';
          const targetColumnId = targetTable?.columns.find(c => c.name === r.targetColumn)?.id || targetTable?.columns[0]?.id || '';

          return {
            id: crypto.randomUUID(),
            sourceTableId,
            sourceColumnId,
            targetTableId,
            targetColumnId,
            type: r.type,
            semantic: r.semantic,
          };
        });

        set({
          tables: newTables,
          relationships: newRelationships,
          simulation: { ...get().simulation, ...system.simulation },
          selectedTableId: null,
          selectedColumnId: null,
          selectedRelationshipId: null,
        });
      },
  calculateForecast: () => {
    const { tables, simulation, relationships } = get();
    const days = simulation.timelineDays;
    const curve = simulation.growthCurve;
    
    let totalRows = 0;
    const tableForecasts = tables.map(table => {
      // Base rows for root tables (no incoming FKs)
      const isRoot = !relationships.some(r => r.targetTableId === table.id);
      let baseRows = isRoot ? 1000 : 0;
      
      // If not root, rows are derived from parents
      if (!isRoot) {
        const parentRels = relationships.filter(r => r.targetTableId === table.id);
        parentRels.forEach(rel => {
          const parentTable = tables.find(t => t.id === rel.sourceTableId);
          if (parentTable) {
            // Estimate parent rows and apply a multiplier (e.g., 3-5x for 1:N)
            const parentBase = 1000; 
            baseRows += parentBase * (rel.type === 'one-to-many' ? 4 : 1);
          }
        });
      }

      if (baseRows === 0) baseRows = 500; // Fallback
      
      let multiplier = 1;
      if (curve === 'linear') multiplier = 1.0;
      if (curve === 'exponential') multiplier = Math.pow(1.05, days / 30);
      if (curve === 'logarithmic') multiplier = Math.log10(days + 10);
      if (curve === 's-curve') multiplier = 1 / (1 + Math.exp(-((days - 180) / 60))) * 5;
      
      const rowCount = Math.floor(baseRows * multiplier);
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

      bulkAddColumns: (tableId, columns) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            const newCols = columns.map(col => ({
              id: crypto.randomUUID(),
              name: col.name,
              type: col.type || 'string',
              isPK: col.strategy === 'uuid',
              isFK: false,
              nullable: false,
              strategy: col.strategy || 'random_string',
              options: {},
              ...col,
            }));

            // Filter out duplicates
            const existingNames = new Set(t.columns.map(c => c.name));
            const filteredNewCols = newCols.filter(c => !existingNames.has(c.name));

            return {
              ...t,
              columns: [...t.columns, ...filteredNewCols],
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

      createRelationshipWithFK: ({ sourceTableId, sourceColumnId, targetTableId, targetColumnId, type, createFKColumn, fkColumnName, semantic }) => set((state) => {
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
          semantic: semantic || 'connection'
        };

        return {
          tables: newTables,
          relationships: [...state.relationships, newRelationship],
        };
      }),

      removeRelationship: (id) => set((state) => ({
        relationships: state.relationships.filter((r) => r.id !== id),
        selectedRelationshipId: state.selectedRelationshipId === id ? null : state.selectedRelationshipId,
      })),

      updateRelationship: (id, updates) => set((state) => ({
        relationships: state.relationships.map((r) => r.id === id ? { ...r, ...updates } : r),
      })),

      setSelected: (tableId, columnId) => set({ 
        selectedTableId: tableId, 
        selectedColumnId: columnId,
        selectedRelationshipId: null 
      }),
      setSelectedRelationship: (id) => set({ 
        selectedRelationshipId: id,
        selectedTableId: null,
        selectedColumnId: null
      }),
    }),
    {
      name: 'reality-db-storage',
    }
  )
);

export const validateSchema = (tables: Table[], relationships: Relationship[], updateColumn: any) => {
  const issues: any[] = [];

  tables.forEach(table => {
    const fkTargets = new Set<string>();
    
    table.columns.forEach(col => {
      // 1. Incomplete Relationships
      if (col.isFK && !col.fkTarget) {
        issues.push({
          id: `incomplete-fk-${table.id}-${col.id}`,
          type: 'error',
          message: `Column "${col.name}" in "${table.name}" is marked as FK but has no target.`,
          tableId: table.id,
          columnId: col.id
        });
      }

      // 2. Duplicate FKs
      if (col.fkTarget) {
        const targetKey = `${col.fkTarget.tableId}`;
        if (fkTargets.has(targetKey)) {
          issues.push({
            id: `duplicate-fk-${table.id}-${targetKey}`,
            type: 'warning',
            message: `Table "${table.name}" has multiple FKs pointing to the same target table.`,
            tableId: table.id,
            columnId: col.id
          });
        }
        fkTargets.add(targetKey);

        // 3. Missing Relationship Entry
        const hasRel = relationships.some(r => 
          r.targetTableId === table.id && r.targetColumnId === col.id
        );
        if (!hasRel) {
          issues.push({
            id: `missing-rel-${table.id}-${col.id}`,
            type: 'warning',
            message: `FK column "${col.name}" exists but no relationship is defined.`,
            tableId: table.id,
            columnId: col.id
          });
        }
      }

      // 4. Semantic Mismatch
      if (col.name.toLowerCase().includes('name') && col.strategy === 'random_string') {
        issues.push({
          id: `semantic-mismatch-${table.id}-${col.id}`,
          type: 'info',
          message: `Column "${col.name}" could use a more specific strategy like "name" or "company_name".`,
          tableId: table.id,
          columnId: col.id,
          fix: () => {
            const strategy = col.name.toLowerCase().includes('company') ? 'company_name' : 'name';
            updateColumn(table.id, col.id, { strategy });
          }
        });
      }
    });
  });

  return issues;
};

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
    case 'company_name': return faker.company.name();
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
