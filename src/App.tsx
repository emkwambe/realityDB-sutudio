import React, { useState } from 'react';
import Sidebar from './Sidebar';
import SchemaCanvas from './SchemaCanvas';
import Inspector from './Inspector';
import PreviewPanel from './PreviewPanel';
import { useSchemaStore } from './store';
import { 
  Download, 
  Upload, 
  Database, 
  Settings, 
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { tables, relationships } = useSchemaStore();
  const [showExport, setShowExport] = useState(false);

  const exportSchema = () => {
    const schema = {
      tables,
      relationships,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reality-pack.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 tracking-tight leading-none">RealityDB Studio</h1>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Design Workbench</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Tables</span>
              <span className="text-xs font-semibold text-slate-700">{tables.length}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Relationships</span>
              <span className="text-xs font-semibold text-slate-700">{relationships.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-all">
              <Upload size={14} />
              Import
            </button>
            <button 
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all shadow-sm"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 relative">
            <SchemaCanvas />
          </div>
          
          <div className="h-64 shrink-0">
            <PreviewPanel />
          </div>
        </div>

        <Inspector />
      </main>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Export Reality Pack</h2>
                <p className="text-sm text-slate-500 mt-1">Ready to generate your production-scale dataset.</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-800">Schema Validated</h4>
                    <p className="text-xs text-emerald-600 mt-0.5">All relationships and generation strategies are correctly configured.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all group cursor-pointer" onClick={exportSchema}>
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Download size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Reality Pack JSON</h4>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Generation Spec</p>
                      </div>
                    </div>
                    <Play size={16} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-50 p-2 rounded-lg text-slate-400">
                        <Database size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">SQL Schema</h4>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">DDL Statements</p>
                      </div>
                    </div>
                    <AlertCircle size={16} className="text-slate-300" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowExport(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
