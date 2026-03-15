import React from 'react';
import { useSchemaStore, DataType, TYPE_STRATEGIES } from './store';
import { Settings, Trash2, AlertCircle, Clock, RefreshCw, Layers } from 'lucide-react';

const DATA_TYPES: DataType[] = ['uuid', 'string', 'integer', 'decimal', 'boolean', 'timestamp', 'email', 'name', 'phone', 'enum'];

const STRATEGY_LABELS: Record<string, string> = {
  uuid: 'UUID',
  name: 'Full Name',
  email: 'Email Address',
  phone: 'Phone Number',
  timestamp: 'Timestamp',
  past_date: 'Past Date',
  future_date: 'Future Date',
  integer: 'Integer Range',
  auto_increment: 'Auto Increment',
  decimal: 'Decimal Range',
  boolean: 'Boolean',
  enum: 'Enum Values',
  random_string: 'Random String',
};

export default function Inspector() {
  const { 
    tables, 
    selectedTableId, 
    selectedColumnId, 
    updateTable, 
    updateColumn, 
    removeColumn,
    simulation,
    updateSimulation
  } = useSchemaStore();

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const selectedColumn = selectedTable?.columns.find(c => c.id === selectedColumnId);

  const availableStrategies = selectedColumn ? TYPE_STRATEGIES[selectedColumn.type] : [];

  if (!selectedTable) {
    return (
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col items-center justify-center p-8 text-center">
        <Settings size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-400 text-sm">Select a table or column to inspect properties</p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Settings size={16} className="text-indigo-600" />
          Inspector
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Table Properties */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Table Properties</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Table Name</label>
              <input 
                type="text"
                value={selectedTable.name}
                onChange={(e) => updateTable(selectedTable.id, { name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Column Properties */}
        {selectedColumn ? (
          <section className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Column Properties</h3>
              <button 
                onClick={() => removeColumn(selectedTable.id, selectedColumn.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Column Name</label>
                <input 
                  type="text"
                  value={selectedColumn.name}
                  onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data Type</label>
                <select 
                  value={selectedColumn.type}
                  onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { type: e.target.value as DataType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                >
                  {DATA_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={selectedColumn.isPK}
                    onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { isPK: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-600">Primary Key</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={selectedColumn.nullable}
                    onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { nullable: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-600">Nullable</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Realism Strategy</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Strategy</label>
                    <select 
                      value={selectedColumn.strategy}
                      onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { strategy: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                    >
                      {availableStrategies.map(s => <option key={s} value={s}>{STRATEGY_LABELS[s] || s}</option>)}
                    </select>
                  </div>

                  {(selectedColumn.strategy === 'integer' || selectedColumn.strategy === 'decimal') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Min</label>
                        <input 
                          type="number"
                          value={selectedColumn.options.min ?? ''}
                          onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { 
                            options: { ...selectedColumn.options, min: Number(e.target.value) } 
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Max</label>
                        <input 
                          type="number"
                          value={selectedColumn.options.max ?? ''}
                          onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { 
                            options: { ...selectedColumn.options, max: Number(e.target.value) } 
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {selectedColumn.strategy === 'enum' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Values (comma separated)</label>
                        <input 
                          type="text"
                          value={selectedColumn.options.values?.join(', ') ?? ''}
                          onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { 
                            options: { ...selectedColumn.options, values: e.target.value.split(',').map(v => v.trim()) } 
                          })}
                          placeholder="active, inactive, pending"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-slate-600">Distribution Weights (%)</label>
                          <span className="text-[10px] text-slate-400">Sum: {selectedColumn.options.weights?.reduce((a, b) => a + b, 0) || 0}%</span>
                        </div>
                        <div className="space-y-2">
                          {(selectedColumn.options.values || []).map((val, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 w-16 truncate">{val}</span>
                              <input 
                                type="number"
                                value={selectedColumn.options.weights?.[idx] ?? ''}
                                onChange={(e) => {
                                  const newWeights = [...(selectedColumn.options.weights || [])];
                                  while (newWeights.length < (selectedColumn.options.values?.length || 0)) newWeights.push(0);
                                  newWeights[idx] = Number(e.target.value);
                                  updateColumn(selectedTable.id, selectedColumn.id, { 
                                    options: { ...selectedColumn.options, weights: newWeights } 
                                  });
                                }}
                                className="flex-1 px-2 py-1 border border-slate-200 rounded text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Weight"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Temporal Rules */}
                  {(selectedColumn.type === 'timestamp') && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <Clock size={12} />
                        Temporal Logic
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Depends On</label>
                        <select 
                          value={selectedColumn.options.dependsOn || ''}
                          onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { 
                            options: { ...selectedColumn.options, dependsOn: e.target.value } 
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">None</option>
                          {selectedTable.columns
                            .filter(c => c.id !== selectedColumn.id && c.type === 'timestamp')
                            .map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                          }
                        </select>
                      </div>
                      {selectedColumn.options.dependsOn && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Rule</label>
                          <select 
                            value={selectedColumn.options.dependencyRule || 'after'}
                            onChange={(e) => updateColumn(selectedTable.id, selectedColumn.id, { 
                              options: { ...selectedColumn.options, dependencyRule: e.target.value as any } 
                            })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="after">Must be AFTER</option>
                            <option value="before">Must be BEFORE</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lifecycle Rules */}
                  {selectedColumn.strategy === 'enum' && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <RefreshCw size={12} />
                        Lifecycle Semantics
                      </div>
                      <div className="space-y-4">
                        {(selectedColumn.options.values || []).map((val, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">{val}</div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-600 mb-1">Nullify Fields</label>
                              <div className="flex flex-wrap gap-1">
                                {selectedTable.columns
                                  .filter(c => c.id !== selectedColumn.id)
                                  .map(c => {
                                    const currentRules = selectedColumn.options.lifecycleRules || [];
                                    const rule = currentRules.find(r => r.value === val);
                                    const isNulled = rule?.nullFields?.includes(c.name);
                                    
                                    return (
                                      <button
                                        key={c.id}
                                        onClick={() => {
                                          const newRules = [...currentRules];
                                          let ruleIdx = newRules.findIndex(r => r.value === val);
                                          if (ruleIdx === -1) {
                                            newRules.push({ value: val, nullFields: [] });
                                            ruleIdx = newRules.length - 1;
                                          }
                                          
                                          const nullFields = newRules[ruleIdx].nullFields || [];
                                          if (isNulled) {
                                            newRules[ruleIdx].nullFields = nullFields.filter(f => f !== c.name);
                                          } else {
                                            newRules[ruleIdx].nullFields = [...nullFields, c.name];
                                          }
                                          
                                          updateColumn(selectedTable.id, selectedColumn.id, {
                                            options: { ...selectedColumn.options, lifecycleRules: newRules }
                                          });
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] border transition-all ${
                                          isNulled 
                                            ? 'bg-red-50 border-red-200 text-red-600' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                      >
                                        {c.name}
                                      </button>
                                    );
                                  })
                                }
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex flex-col items-center justify-center p-4 text-center mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-2">
                <Settings size={20} />
              </div>
              <h3 className="text-xs font-bold text-slate-700 uppercase">System Simulation</h3>
              <p className="text-[10px] text-slate-400">Global engine parameters</p>
            </div>

            <div className="space-y-4 px-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <RefreshCw size={12} />
                Engine Config
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deterministic Seed</label>
                <input 
                  type="number"
                  value={simulation.seed}
                  onChange={(e) => updateSimulation({ seed: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Timeline Duration (Days)</label>
                <input 
                  type="number"
                  value={simulation.timelineDays}
                  onChange={(e) => updateSimulation({ timelineDays: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                  <Layers size={12} />
                  Growth Dynamics
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Growth Curve</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['linear', 'exponential', 'logarithmic', 's-curve'] as const).map(curve => (
                      <button
                        key={curve}
                        onClick={() => updateSimulation({ growthCurve: curve })}
                        className={`px-2 py-2 text-[10px] font-bold uppercase rounded border transition-all ${
                          simulation.growthCurve === curve 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {curve}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Anomaly Injection Rate</label>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={simulation.anomalyRate * 100}
                    onChange={(e) => updateSimulation({ anomalyRate: parseInt(e.target.value) / 100 })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Stable</span>
                    <span>{(simulation.anomalyRate * 100).toFixed(0)}% Chaos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
