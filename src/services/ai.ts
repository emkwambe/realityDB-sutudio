import { GoogleGenAI, Type } from "@google/genai";
import { Table, Relationship, SimulationConfig, DataType, RelationshipSemantic } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GeneratedSystem {
  tables: {
    name: string;
    description: string;
    columns: {
      name: string;
      type: DataType;
      strategy: string;
      isPK?: boolean;
      isFK?: boolean;
      nullable?: boolean;
    }[];
  }[];
  relationships: {
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    type: 'one-to-many' | 'one-to-one';
    semantic: RelationshipSemantic;
  }[];
  simulation: Partial<SimulationConfig>;
}

export async function generateSystem(prompt: string): Promise<GeneratedSystem> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a system model for: ${prompt}. 
    Return a JSON object representing the tables, columns, and relationships.
    
    Guidelines:
    1. Table names: snake_case.
    2. Data types: uuid, string, integer, decimal, boolean, timestamp, email, name, phone, enum.
    3. Strategies: Match data types (e.g., 'name' strategy for 'name' type).
    4. Relationships: Use sourceTable and targetTable names.
    5. Semantics: Use 'connection', 'trigger', 'temporal', 'lifecycle', 'risk', 'activity'.
    6. Lifecycle: For tables with status or events, use 'enum' columns. 
    7. Simulation: Suggest reasonable timelineDays (e.g., 30, 90, 365) and growthCurve ('linear', 'exponential', 'logarithmic', 's-curve').
    
    Include a brief description for each table.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                columns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      strategy: { type: Type.STRING },
                      isPK: { type: Type.BOOLEAN },
                      isFK: { type: Type.BOOLEAN },
                      nullable: { type: Type.BOOLEAN }
                    },
                    required: ["name", "type", "strategy"]
                  }
                }
              },
              required: ["name", "description", "columns"]
            }
          },
          relationships: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceTable: { type: Type.STRING },
                sourceColumn: { type: Type.STRING },
                targetTable: { type: Type.STRING },
                targetColumn: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["one-to-many", "one-to-one"] },
                semantic: { type: Type.STRING, enum: ["connection", "trigger", "temporal", "lifecycle", "risk", "activity"] }
              },
              required: ["sourceTable", "sourceColumn", "targetTable", "targetColumn", "type", "semantic"]
            }
          },
          simulation: {
            type: Type.OBJECT,
            properties: {
              timelineDays: { type: Type.NUMBER },
              growthCurve: { type: Type.STRING, enum: ["linear", "exponential", "logarithmic", "s-curve"] },
              anomalyRate: { type: Type.NUMBER }
            }
          }
        },
        required: ["tables", "relationships"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function explainSystem(tables: Table[], relationships: Relationship[]): Promise<string> {
  const schemaSummary = {
    tables: tables.map(t => ({
      name: t.name,
      description: t.description,
      columns: t.columns.map(c => c.name)
    })),
    relationships: relationships.map(r => {
      const source = tables.find(t => t.id === r.sourceTableId)?.name;
      const target = tables.find(t => t.id === r.targetTableId)?.name;
      return `${source} -> ${target} (${r.semantic})`;
    })
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Explain the following system model in clear, professional language. 
    Focus on the purpose of the system and how the entities interact.
    
    Schema: ${JSON.stringify(schemaSummary)}`,
  });

  return response.text;
}

export async function suggestRelationships(tableName: string, existingTables: string[]): Promise<{ targetTable: string; semantic: RelationshipSemantic; type: 'one-to-many' | 'one-to-one' }[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Given the table "${tableName}" and the existing tables [${existingTables.join(", ")}], suggest likely relationships.
    Return a JSON array of suggestions.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            targetTable: { type: Type.STRING },
            semantic: { type: Type.STRING, enum: ["connection", "trigger", "temporal", "lifecycle", "risk", "activity"] },
            type: { type: Type.STRING, enum: ["one-to-many", "one-to-one"] }
          },
          required: ["targetTable", "semantic", "type"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function suggestColumns(tableName: string): Promise<{ name: string; type: DataType; strategy: string }[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Suggest relevant columns for a table named "${tableName}". 
    Include standard fields like id, created_at, etc.
    Return a JSON array of column definitions.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            strategy: { type: Type.STRING }
          },
          required: ["name", "type", "strategy"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function suggestTableDescription(tableName: string, columnNames: string[]): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Write a brief, professional description for a database table named "${tableName}" with columns: [${columnNames.join(", ")}].`,
  });

  return response.text;
}

export async function generateTemplateMetadata(tables: Table[]): Promise<{ name: string; description: string; category: string }> {
  const tableNames = tables.map(t => t.name);
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Given these tables: [${tableNames.join(", ")}], suggest a name, description, and category for a domain template.
    Categories: Startup, Commerce, Finance, Operations, Public Sector, Security, AI.
    Return a JSON object.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ["name", "description", "category"]
      }
    }
  });

  return JSON.parse(response.text);
}
