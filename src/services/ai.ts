import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const suggestColumns = async (tableName: string) => {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found. AI features disabled.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 5-8 relevant database columns for a table named "${tableName}". 
      Return a JSON array of objects with: name (snake_case), type (string, number, boolean, timestamp), and strategy (e.g., email, fullName, pastDate, futureDate, integer, decimal, paragraph, word, uuid).`,
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
  } catch (error) {
    console.error("AI Column Suggestion failed:", error);
    return [];
  }
};

export const suggestTableDescription = async (tableName: string, columns: string[]) => {
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a one-sentence technical description for a database table named "${tableName}" with columns: ${columns.join(', ')}.`,
    });

    return response.text.trim();
  } catch (error) {
    console.error("AI Description failed:", error);
    return "";
  }
};
