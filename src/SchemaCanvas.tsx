import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Handle, 
  Position, 
  NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSchemaStore, Table, Column } from './store';
import { Database, Plus, Trash2, Key, Link, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TableNode = ({ data, selected }: NodeProps<Table>) => {
  const { setSelected, addColumn, removeTable } = useSchemaStore();
  
  return (
    <div 
      className={`react-flow__node-table overflow-hidden transition-all ${selected ? 'ring-2 ring-indigo-500' : ''}`}
      onClick={() => setSelected(data.id, null)}
    >
      <div className="bg-slate-50 border-bottom border-slate-200 p-3 flex items-center justify-between relative">
        <Handle 
          type="target" 
          position={Position.Left} 
          id="table-target" 
          className="!w-3 !h-3 !bg-indigo-400 !-left-1.5" 
        />
        <div className="flex items-center gap-2">
          <Database size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-800 text-sm">{data.name}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); removeTable(data.id); }}
          className="text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="p-2 space-y-1">
        {data.columns.map((col) => (
          <div 
            key={col.id}
            className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer group relative"
            onClick={(e) => { e.stopPropagation(); setSelected(data.id, col.id); }}
          >
            <Handle 
              type="target" 
              position={Position.Left} 
              id={col.id} 
              className="!w-2 !h-2 !bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity !-left-1" 
            />
            <div className="flex items-center gap-2">
              {col.isPK && <Key size={12} className="text-amber-500" />}
              {col.isFK && <Link size={12} className="text-indigo-500" />}
              <span className="text-xs text-slate-700 font-medium">{col.name}</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono">{col.type}</span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id={col.id} 
              className="!w-2 !h-2 !bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity !-right-1" 
            />
          </div>
        ))}
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); addColumn(data.id, { name: `col_${data.columns.length + 1}` }); }}
        className="w-full p-2 text-[10px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1 border-t border-slate-100 transition-all"
      >
        <Plus size={12} />
        ADD COLUMN
      </button>
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

export default function SchemaCanvas() {
  const { tables, relationships, updateTable, createRelationshipWithFK } = useSchemaStore();
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [relType, setRelType] = useState<'one-to-many' | 'one-to-one'>('one-to-many');
  const [createFK, setCreateFK] = useState(true);
  const [customFKName, setCustomFKName] = useState('');

  const nodes = useMemo(() => tables.map(t => ({
    id: t.id,
    type: 'table',
    position: t.position,
    data: t,
  })), [tables]);

  const edges = useMemo(() => relationships.map(r => ({
    id: r.id,
    source: r.sourceTableId,
    target: r.targetTableId,
    sourceHandle: r.sourceColumnId,
    targetHandle: r.targetColumnId,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    style: { stroke: '#6366f1', strokeWidth: 2 },
  })), [relationships]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        updateTable(change.id, { position: change.position });
      }
    });
  }, [updateTable]);

  const onConnect = useCallback((params: Connection) => {
    setPendingConnection(params);
    
    // Set default FK name
    const sourceTable = tables.find(t => t.id === params.source);
    const sourceColumn = sourceTable?.columns.find(c => c.id === params.sourceHandle);
    const targetTable = tables.find(t => t.id === params.target);
    const targetColumn = targetTable?.columns.find(c => c.id === params.targetHandle);

    if (sourceTable && sourceColumn) {
      const baseName = sourceTable.name.replace(/s$/, '').toLowerCase();
      const colName = (targetColumn && targetColumn.id !== 'table-target' ? targetColumn.name : sourceColumn.name).toLowerCase();
      setCustomFKName(`${baseName}_${colName}`);
    }
  }, [tables]);

  const confirmRelationship = () => {
    if (pendingConnection && pendingConnection.source && pendingConnection.target) {
      createRelationshipWithFK({
        sourceTableId: pendingConnection.source,
        sourceColumnId: pendingConnection.sourceHandle || '',
        targetTableId: pendingConnection.target,
        targetColumnId: pendingConnection.targetHandle === 'table-target' ? null : (pendingConnection.targetHandle || null),
        type: relType,
        createFKColumn: createFK,
        fkColumnName: customFKName,
      });
    }
    setPendingConnection(null);
  };

  const sourceTable = tables.find(t => t.id === pendingConnection?.source);
  const targetTable = tables.find(t => t.id === pendingConnection?.target);
  const sourceColumn = sourceTable?.columns.find(c => c.id === pendingConnection?.sourceHandle);

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
      </ReactFlow>

      <AnimatePresence>
        {pendingConnection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Link size={16} className="text-indigo-600" />
                  Create Relationship
                </h3>
                <button onClick={() => setPendingConnection(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Parent</p>
                    <p className="text-sm font-semibold text-slate-700">{sourceTable?.name}</p>
                    <p className="text-[10px] text-indigo-500 font-mono">{sourceColumn?.name}</p>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Child</p>
                    <p className="text-sm font-semibold text-slate-700">{targetTable?.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Relationship Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setRelType('one-to-many')}
                        className={`p-2 text-xs font-medium rounded-md border transition-all ${relType === 'one-to-many' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        One-to-Many
                      </button>
                      <button 
                        onClick={() => setRelType('one-to-one')}
                        className={`p-2 text-xs font-medium rounded-md border transition-all ${relType === 'one-to-one' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        One-to-One
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={createFK}
                        onChange={(e) => setCreateFK(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Create Foreign Key Column</p>
                        <p className="text-[10px] text-slate-400">Automatically add a new column to {targetTable?.name}</p>
                      </div>
                    </label>

                    {createFK && (
                      <div className="px-3 pb-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Column Name</label>
                        <input 
                          type="text"
                          value={customFKName}
                          onChange={(e) => setCustomFKName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="e.g. user_id"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end gap-2">
                <button 
                  onClick={() => setPendingConnection(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRelationship}
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center gap-2 shadow-sm"
                >
                  <Check size={14} />
                  Create Relationship
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
