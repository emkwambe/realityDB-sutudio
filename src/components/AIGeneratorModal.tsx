import React, { useState } from 'react';
import { useSchemaStore } from '../store';
import { Sparkles, Copy, ClipboardPaste, ChevronDown, X, Check } from 'lucide-react';

const PROMPT_LIBRARY = [
  { label: 'SaaS with billing', desc: 'Organizations, users, plans, subscriptions, invoices, payments' },
  { label: 'E-commerce marketplace', desc: 'Customers, products, orders, shipments, reviews' },
  { label: 'Social media platform', desc: 'Users, posts, comments, likes, follows, messages' },
  { label: 'Project management', desc: 'Teams, members, projects, tasks, comments, time entries' },
  { label: 'Restaurant ordering', desc: 'Restaurants, menus, customers, orders, deliveries, reviews' },
  { label: 'Learning management system', desc: 'Courses, instructors, students, enrollments, assignments, grades' },
  { label: 'Hospital management', desc: 'Patients, doctors, appointments, diagnoses, prescriptions, billing' },
  { label: 'Real estate platform', desc: 'Properties, agents, listings, viewings, offers, transactions' },
  { label: 'Fitness tracking app', desc: 'Users, workouts, exercises, sets, goals, achievements' },
  { label: 'Event management', desc: 'Events, venues, tickets, attendees, speakers, sponsors' },
  { label: 'Pet grooming booking', desc: 'Customers, pets, groomers, services, appointments, payments' },
  { label: 'Inventory management', desc: 'Warehouses, products, stock, suppliers, purchase orders, shipments' },
];

const FORMAT_SPEC = `Use this exact JSON format for a RealityDB Studio Pack:

{
  "tables": [
    {
      "id": "tbl-001",
      "name": "table_name",
      "columns": [
        { "id": "tbl-001-c1", "name": "id", "type": "uuid", "isPK": true, "isFK": false, "nullable": false, "strategy": "uuid", "options": {} },
        { "id": "tbl-001-c2", "name": "name", "type": "string", "isPK": false, "isFK": false, "nullable": false, "strategy": "name", "options": {} },
        { "id": "tbl-001-c3", "name": "email", "type": "email", "isPK": false, "isFK": false, "nullable": false, "strategy": "email", "options": {} },
        { "id": "tbl-001-c4", "name": "status", "type": "enum", "isPK": false, "isFK": false, "nullable": false, "strategy": "enum", "options": { "values": ["active", "inactive"], "weights": [80, 20], "lifecycleRules": [{ "value": "inactive", "nullFields": ["completed_at"] }] } },
        { "id": "tbl-001-c5", "name": "created_at", "type": "timestamp", "isPK": false, "isFK": false, "nullable": false, "strategy": "past_date", "options": {} },
        { "id": "tbl-001-c6", "name": "completed_at", "type": "timestamp", "isPK": false, "isFK": false, "nullable": true, "strategy": "past_date", "options": { "dependsOn": "created_at", "dependencyRule": "after" } },
        { "id": "tbl-001-c7", "name": "parent_id", "type": "uuid", "isPK": false, "isFK": true, "nullable": false, "strategy": "uuid", "options": {}, "fkTarget": { "tableId": "tbl-002", "columnId": "tbl-002-c1" } }
      ],
      "position": { "x": 100, "y": 100 }
    }
  ],
  "relationships": [
    {
      "id": "rel-001",
      "sourceTableId": "tbl-002",
      "sourceColumnId": "tbl-002-c1",
      "targetTableId": "tbl-001",
      "targetColumnId": "tbl-001-c7",
      "type": "one-to-many",
      "semantic": "connection"
    }
  ],
  "version": "1.0.0"
}

Rules you MUST follow:
1. Every table MUST have an "id" column (type uuid, isPK true, strategy uuid) as the FIRST column
2. Every table MUST have a "created_at" column (type timestamp, strategy past_date) as the LAST column
3. FK columns use type "uuid", isFK true, and include "fkTarget": { "tableId": "parent-table-id", "columnId": "parent-pk-id" }
4. Table IDs: tbl-001, tbl-002, tbl-003, etc.
5. Column IDs: tbl-001-c1, tbl-001-c2, etc.
6. Position tables in a grid: x = 100 + (index % 4) * 320, y = 100 + Math.floor(index / 4) * 300
7. Enum columns MUST have realistic weighted distributions (not uniform) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â weights must sum to 100
8. If a status/state enum has terminal states (cancelled, deleted, expired, rejected), add lifecycleRules to nullify dependent timestamp fields
9. If a timestamp represents completion/delivery/resolution, add dependsOn pointing to created_at with dependencyRule "after", and set nullable true
10. sourceTableId in relationships = the parent (PK) table, targetTableId = the child (FK) table
11. Column types: uuid, string, email, enum, timestamp, integer, decimal, boolean
12. Strategies: uuid, name, company_name, email, phone, random_string, enum, past_date, future_date, integer, decimal, boolean, address

Output ONLY valid JSON. No explanation. No markdown. No backticks. Just the JSON object.`;

export default function AIGeneratorModal({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState('');
  const [response, setResponse] = useState('');
  const [step, setStep] = useState<'describe' | 'paste'>('describe');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const { importSchema } = useSchemaStore();

  const buildPrompt = () => {
    return `Generate a RealityDB Studio Pack JSON for the following system:

${description}

${FORMAT_SPEC}`;
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setStep('paste');
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = buildPrompt();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setStep('paste');
    }
  };

  const handleImport = () => {
    setError('');
    try {
      const parsed = JSON.parse(response.trim());

      // Validate basic structure
      if (!parsed.tables || !Array.isArray(parsed.tables)) {
        setError('Invalid format: missing "tables" array. Make sure the AI output starts with { and ends with }.');
        return;
      }

      if (parsed.tables.length === 0) {
        setError('The schema has no tables. Try regenerating with a more detailed description.');
        return;
      }

      // Validate each table has required fields
      for (const table of parsed.tables) {
        if (!table.id || !table.name || !table.columns || !Array.isArray(table.columns)) {
          setError(`Table "${table.name || 'unknown'}" is missing required fields (id, name, columns).`);
          return;
        }
        const hasPK = table.columns.some((c: any) => c.isPK);
        if (!hasPK) {
          setError(`Table "${table.name}" has no primary key column. Each table needs an "id" column with isPK: true.`);
          return;
        }
      }

      // Import into Studio
      importSchema(parsed.tables, parsed.relationships || []);

      onClose();
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        setError('Invalid JSON. Make sure you copied the entire AI response. It should start with { and end with }. Remove any markdown backticks (```) if present.');
      } else {
        setError(`Import failed: ${e.message}`);
      }
    }
  };

  const selectFromLibrary = (label: string, desc: string) => {
    setDescription(`${label}: ${desc}. Include realistic weighted distributions for all enum columns. Add lifecycle rules where appropriate (e.g., cancelled orders should nullify shipped_at). Add temporal dependencies (e.g., completed_at must be after created_at).`);
    setShowLibrary(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '90%', maxWidth: 640,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="#6366f1" />
            <span style={{ fontWeight: 700, fontSize: 16 }}>AI Schema Architect</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4
          }}>
            <X size={20} color="#94a3b8" />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 'describe' && (
            <>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
                Describe your system in natural language. RealityDB will generate a prompt you can paste into any AI (ChatGPT, Claude, DeepSeek, Gemini) to get a Studio-compatible schema.
              </p>

              {/* Prompt Library */}
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setShowLibrary(!showLibrary)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#6366f1',
                    cursor: 'pointer', width: '100%', justifyContent: 'space-between'
                  }}
                >
                  <span>Quick Start: Choose a system type</span>
                  <ChevronDown size={16} style={{ transform: showLibrary ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                {showLibrary && (
                  <div style={{
                    border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4,
                    maxHeight: 200, overflow: 'auto', background: 'white'
                  }}>
                    {PROMPT_LIBRARY.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => selectFromLibrary(item.label, item.desc)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px', border: 'none', background: 'none',
                          cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                          fontSize: 13
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{item.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description Input */}
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Example: A pet grooming booking system with customers, pets, groomers, services, appointments (with lifecycle rules for cancelled/no-show), and payments. Appointments should track scheduled_at and completed_at (completed must be after scheduled)."
                style={{
                  width: '100%', height: 120, padding: 14, borderRadius: 10,
                  border: '2px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit',
                  resize: 'vertical', outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              />

              {/* Copy Prompt Button */}
              <button
                onClick={handleCopyPrompt}
                disabled={!description.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: 14, marginTop: 16, borderRadius: 10,
                  background: description.trim() ? '#6366f1' : '#e2e8f0',
                  color: description.trim() ? 'white' : '#94a3b8',
                  border: 'none', fontSize: 15, fontWeight: 600, cursor: description.trim() ? 'pointer' : 'default',
                }}
              >
                {copied ? <><Check size={18} /> Copied! Now paste into your AI</> : <><Copy size={18} /> Copy Prompt to Clipboard</>}
              </button>

              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
                Works with ChatGPT, Claude, DeepSeek, Gemini, or any AI assistant
              </p>
            </>
          )}

          {step === 'paste' && (
            <>
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                padding: 14, marginBottom: 16, fontSize: 13, color: '#166534'
              }}>
                <strong>Step 1 ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“</strong> Prompt copied! Paste it into your AI and get the JSON response.
              </div>

              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
                <strong>Step 2:</strong> Paste the AI's JSON response below:
              </p>

              <textarea
                value={response}
                onChange={e => { setResponse(e.target.value); setError(''); }}
                placeholder='Paste the JSON here. It should start with { "tables": [ ... and end with }'
                style={{
                  width: '100%', height: 180, padding: 14, borderRadius: 10,
                  border: `2px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                  fontSize: 13, fontFamily: 'monospace', resize: 'vertical', outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = error ? '#fca5a5' : '#6366f1')}
                onBlur={e => (e.currentTarget.style.borderColor = error ? '#fca5a5' : '#e2e8f0')}
              />

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                  padding: 12, marginTop: 8, fontSize: 13, color: '#991b1b'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => { setStep('describe'); setResponse(''); setError(''); }}
                  style={{
                    flex: 1, padding: 14, borderRadius: 10, background: '#f1f5f9',
                    border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600,
                    color: '#64748b', cursor: 'pointer'
                  }}
                >
                  ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!response.trim()}
                  style={{
                    flex: 2, padding: 14, borderRadius: 10,
                    background: response.trim() ? '#6366f1' : '#e2e8f0',
                    color: response.trim() ? 'white' : '#94a3b8',
                    border: 'none', fontSize: 15, fontWeight: 600,
                    cursor: response.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <ClipboardPaste size={18} /> Import to Canvas
                </button>
              </div>

              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
                Tip: If the AI wraps the JSON in ```json backticks, remove them before pasting
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
