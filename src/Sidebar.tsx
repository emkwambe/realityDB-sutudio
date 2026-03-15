import React from 'react';
import { useSchemaStore, DOMAIN_TEMPLATES, DataType } from './store';
import { 
  Plus, 
  ShoppingBag, 
  Database, 
  Mail, 
  Hash, 
  Calendar, 
  Type,
  Layout,
  Briefcase,
  Phone,
  CheckSquare
} from 'lucide-react';

export default function Sidebar() {
  const { addTable, addColumn, selectedTableId } = useSchemaStore();

  const addDomainTemplate = (name: string, tablesData: any[]) => {
    tablesData.forEach((t, i) => {
      addTable({
        name: t.name,
        columns: t.columns,
        position: { x: 100 + (i * 300), y: 100 + (i * 50) }
      });
    });
  };

  const quickFields = [
    { name: 'id', type: 'uuid', strategy: 'uuid', icon: <Hash size={14} /> },
    { name: 'email', type: 'email', strategy: 'email', icon: <Mail size={14} /> },
    { name: 'name', type: 'name', strategy: 'name', icon: <Type size={14} /> },
    { name: 'phone', type: 'phone', strategy: 'phone', icon: <Phone size={14} /> },
    { name: 'created_at', type: 'timestamp', strategy: 'past_date', icon: <Calendar size={14} /> },
    { name: 'status', type: 'enum', strategy: 'enum', icon: <CheckSquare size={14} /> },
  ];

  return (
    <div className="w-64 border-r border-slate-200 bg-white flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Layout size={16} className="text-indigo-600" />
          Component Library
        </h2>
      </div>

      <div className="p-4 space-y-8">
        {/* Actions */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</h3>
          <button 
            onClick={() => addTable({})}
            className="w-full flex items-center justify-center gap-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-all shadow-sm"
          >
            <Plus size={14} />
            NEW TABLE
          </button>
        </section>

        {/* Domain Intelligence Templates */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Domain Templates</h3>
          <div className="space-y-2">
            <button 
              onClick={() => addDomainTemplate('SaaS', DOMAIN_TEMPLATES.SaaS)}
              className="w-full flex items-center gap-3 p-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-100 transition-all text-left"
            >
              <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center text-indigo-600">
                <Briefcase size={16} />
              </div>
              <div>
                <p className="font-semibold">SaaS Stack</p>
                <p className="text-[10px] text-slate-400">Users, Orgs, Subs</p>
              </div>
            </button>
            <button 
              onClick={() => addDomainTemplate('Ecommerce', DOMAIN_TEMPLATES.Ecommerce)}
              className="w-full flex items-center gap-3 p-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-100 transition-all text-left"
            >
              <div className="w-8 h-8 bg-emerald-50 rounded flex items-center justify-center text-emerald-600">
                <ShoppingBag size={16} />
              </div>
              <div>
                <p className="font-semibold">E-commerce</p>
                <p className="text-[10px] text-slate-400">Customers, Products, Orders</p>
              </div>
            </button>
          </div>
        </section>

        {/* Quick Fields */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Fields</h3>
          <div className="grid grid-cols-1 gap-1">
            {quickFields.map((field) => (
              <button 
                key={field.name}
                disabled={!selectedTableId}
                onClick={() => {
                  if (selectedTableId) {
                    addColumn(selectedTableId, { name: field.name, type: field.type as DataType, strategy: field.strategy });
                  }
                }}
                className={`flex items-center gap-2 p-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md transition-all group ${!selectedTableId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{field.icon}</span>
                {field.name.toUpperCase()}
              </button>
            ))}
          </div>
          {!selectedTableId && (
            <p className="text-[10px] text-slate-400 mt-2 italic">Select a table to add fields</p>
          )}
        </section>
      </div>
    </div>
  );
}
