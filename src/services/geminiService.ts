import { GoogleGenAI, Type } from "@google/genai";
import { TabColumn, InstrumentConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (instrument: InstrumentConfig) => `
You are a professional musician and composer specialized in ${instrument.name}. 
Your task is to generate tablature data based on user requests.
The output must be a JSON object containing an array of "columns".
Each column represents a time step and must act as a slice of the neck containing ${instrument.stringCount} strings.
The strings are ordered from top (String 1) to bottom (String ${instrument.stringCount}).
Labels: ${instrument.strings.join(', ')}.
Value -1 represents no note (silence/sustain).
Values 0-24 represent the fret number.
Keep the riff musical and rhythmically interesting.
Generally generate 16 to 32 columns.
`;

export const generateTab = async (prompt: string, instrument: InstrumentConfig): Promise<TabColumn[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(instrument),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            columns: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: `Array of ${instrument.stringCount} integers representing fret numbers. Use -1 for empty.`,
                minItems: instrument.stringCount,
                maxItems: instrument.stringCount
              }
            }
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonStr);
    
    // Validate shape
    if (parsed.columns && Array.isArray(parsed.columns)) {
       const validColumns: TabColumn[] = parsed.columns.map((col: number[]) => {
          const safeCol = col.slice(0, instrument.stringCount).map(n => (typeof n === 'number' && n >= -1 && n <= 24) ? n : -1);
          // Pad if short (though schema should prevent this)
          while(safeCol.length < instrument.stringCount) safeCol.push(-1);
          return safeCol;
       });
       return validColumns;
    }
    
    throw new Error("Invalid format returned by AI");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};