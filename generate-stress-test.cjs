const tables = [];
const relationships = [];

// Create 50 tables with 5-10 columns each
for (let i = 0; i < 50; i++) {
  const tableId = `table-${String(i).padStart(3, '0')}`;
  const cols = [
    { id: `${tableId}-pk`, name: 'id', type: 'uuid', isPK: true, isFK: false, nullable: false, strategy: 'uuid', options: {} },
    { id: `${tableId}-name`, name: 'name', type: 'string', isPK: false, isFK: false, nullable: false, strategy: 'random_string', options: {} },
    { id: `${tableId}-status`, name: 'status', type: 'enum', isPK: false, isFK: false, nullable: false, strategy: 'enum', options: { values: ['active','inactive','pending'], weights: [60,20,20] } },
    { id: `${tableId}-amount`, name: 'amount', type: 'decimal', isPK: false, isFK: false, nullable: false, strategy: 'decimal', options: { min: 1, max: 10000 } },
    { id: `${tableId}-created`, name: 'created_at', type: 'timestamp', isPK: false, isFK: false, nullable: false, strategy: 'past_date', options: {} },
    { id: `${tableId}-email`, name: 'email', type: 'email', isPK: false, isFK: false, nullable: false, strategy: 'email', options: {} },
    { id: `${tableId}-count`, name: 'count', type: 'integer', isPK: false, isFK: false, nullable: false, strategy: 'integer', options: { min: 0, max: 1000 } },
  ];

  // Add FK to previous table (chain)
  if (i > 0) {
    const parentId = `table-${String(i-1).padStart(3, '0')}`;
    const fkCol = {
      id: `${tableId}-fk`,
      name: `table_${String(i-1).padStart(3, '0')}_id`,
      type: 'uuid',
      isPK: false,
      isFK: true,
      fkTarget: { tableId: parentId, columnId: `${parentId}-pk` },
      nullable: false,
      strategy: 'uuid',
      options: {}
    };
    cols.push(fkCol);

    relationships.push({
      id: `rel-${i}`,
      sourceTableId: parentId,
      sourceColumnId: `${parentId}-pk`,
      targetTableId: tableId,
      targetColumnId: `${tableId}-fk`,
      type: 'one-to-many',
      semantic: 'connection'
    });
  }

  // Add second FK for tables 10+ (cross-references)
  if (i >= 10 && i % 3 === 0) {
    const crossTarget = `table-${String(Math.floor(i/3)).padStart(3, '0')}`;
    const fkCol2 = {
      id: `${tableId}-fk2`,
      name: `ref_${String(Math.floor(i/3)).padStart(3, '0')}_id`,
      type: 'uuid',
      isPK: false,
      isFK: true,
      fkTarget: { tableId: crossTarget, columnId: `${crossTarget}-pk` },
      nullable: true,
      strategy: 'uuid',
      options: {}
    };
    cols.push(fkCol2);

    relationships.push({
      id: `rel-cross-${i}`,
      sourceTableId: crossTarget,
      sourceColumnId: `${crossTarget}-pk`,
      targetTableId: tableId,
      targetColumnId: `${tableId}-fk2`,
      type: 'one-to-many',
      semantic: 'trigger'
    });
  }

  const GRID_COLS = 5;
  tables.push({
    id: tableId,
    name: `entity_${String(i).padStart(3, '0')}`,
    columns: cols,
    position: { x: 80 + (i % GRID_COLS) * 320, y: 80 + Math.floor(i / GRID_COLS) * 280 }
  });
}

const pack = {
  tables,
  relationships,
  simulation: { seed: 42, timelineDays: 365, growthCurve: 's-curve', anomalyRate: 0.05 },
  version: '1.0.0',
  exportedAt: new Date().toISOString()
};

require('fs').writeFileSync('stress-test-50-tables.json', JSON.stringify(pack, null, 2));
console.log(`Generated: ${tables.length} tables, ${relationships.length} relationships, ${tables.reduce((s,t) => s + t.columns.length, 0)} total columns`);