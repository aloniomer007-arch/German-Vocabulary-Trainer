
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabItem, Level, ChatMessage } from "../types";

/**
 * Attempts to repair a truncated JSON array by finding the last complete object.
 * Robust handling for unterminated strings and objects.
 */
function repairTruncatedJsonArray(jsonStr: string): string {
  let trimmed = jsonStr.trim();
  
  // If it's already closed, return as is
  if (trimmed.endsWith(']')) return trimmed;
  
  // Try to find the last closing brace of a full object
  const lastBraceIndex = trimmed.lastIndexOf('}');
  
  if (lastBraceIndex === -1) {
    // If no object was even started, return empty array
    return '[]';
  }
  
  // Slice to the end of the last complete object and close the array
  let repaired = trimmed.substring(0, lastBraceIndex + 1);
  
  // Ensure it starts with [ if it was missing for some reason
  if (!repaired.startsWith('[')) {
    repaired = '[' + repaired;
  }
  
  return repaired + ']';
}

/**
 * Helper to fetch a single small batch chunk from Gemini.
 * Using a very safe chunk size (8) to stay well within token limits.
 */
async function fetchBatchChunk(level: Level, count: number, excludeWords: string[]): Promise<VocabItem[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const cefrGuidelines: Record<Level, string> = {
    A1: "Absolute basics (Haus, Hund).",
    A2: "Elementary level (Beruf, Wetter).",
    B1: "Intermediate level (Erfahrung, Meinung).",
    B2: "Upper-intermediate (Abstrakt, Politik).",
    C1: "Advanced academic (Wissenschaft, Justiz).",
    C2: "Mastery (Nuancen, Literatur)."
  };

  const exclusionString = excludeWords.length > 0 
    ? `EXCLUDE strictly: ${excludeWords.slice(-100).join(', ')}.`
    : "";

  // SAFETY: 8 items per call is the "sweet spot" for Gemini 3 Flash to avoid truncation.
  const requestedCount = Math.min(count, 8);

  const prompt = `Act as a German Philologist. Generate EXACTLY ${requestedCount} UNIQUE German vocab items for level ${level}.
  
  STRICT VERB RULES:
  If type is 'verb', the 'conjugation' object MUST contain:
  - "present3rd": 3rd person singular present
  - "past": Präteritum
  - "pastParticiple": Perfekt with auxiliary
  
  CRITICAL FORMATTING:
  1. No markdown.
  2. NOUNS must have "plural" and "gender".
  3. No duplicates.

  ${exclusionString}
  Level: ${level} (${cefrGuidelines[level]})`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 8192, // High limit to ensure we never truncate naturally
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['word', 'translation', 'type', 'level', 'example', 'exampleTranslation'],
            properties: {
              word: { type: Type.STRING },
              translation: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['noun', 'verb', 'preposition', 'adjective', 'adverb', 'phrase'] },
              level: { type: Type.STRING },
              example: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING },
              gender: { type: Type.STRING, enum: ['der', 'die', 'das', 'none'] },
              plural: { type: Type.STRING },
              isIrregular: { type: Type.BOOLEAN },
              conjugation: {
                type: Type.OBJECT,
                properties: {
                  present3rd: { type: Type.STRING },
                  past: { type: Type.STRING },
                  pastParticiple: { type: Type.STRING }
                }
              },
              cases: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
        },
      },
    });

    let text = (response.text || '[]').trim();
    
    // Cleanup markdown if present
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    
    // Repair if truncated
    if (!text.endsWith(']')) {
      text = repairTruncatedJsonArray(text);
    }

    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        ...item,
        conjugation: item.type === 'verb' ? (item.conjugation || { present3rd: '', past: '', pastParticiple: '' }) : item.conjugation,
        id: Math.random().toString(36).substr(2, 9)
      }));
    } catch (parseError) {
      console.warn("JSON Parse failed after repair, returning empty chunk.", parseError);
      return [];
    }
  } catch (e) {
    console.error("Gemini Chunk Fetch Error:", e);
    return [];
  }
}

/**
 * Main fetcher with high-frequency retry/looping to guarantee the requested count.
 */
export async function fetchQuizBatch(level: Level, count: number = 25, excludeWords: string[] = []): Promise<VocabItem[]> {
  let allItems: VocabItem[] = [];
  const maxLoops = 25; // Enough loops to reach 100 with chunks of 8
  let loops = 0;
  const currentExclusions = [...excludeWords];

  while (allItems.length < count && loops < maxLoops) {
    loops++;
    const remainingNeeded = count - allItems.length;
    
    const nextChunk = await fetchBatchChunk(level, remainingNeeded, currentExclusions);
    
    if (nextChunk.length === 0) {
      // Small cooldown before retry
      await new Promise(r => setTimeout(r, 400));
      continue;
    }

    // Filter duplicates
    const uniqueFromChunk = nextChunk.filter(item => 
      !allItems.some(existing => existing.word.toLowerCase() === item.word.toLowerCase())
    );

    allItems = [...allItems, ...uniqueFromChunk];
    uniqueFromChunk.forEach(item => currentExclusions.push(item.word));
    
    if (allItems.length > count) {
      allItems = allItems.slice(0, count);
    }
  }

  return allItems;
}

export async function fetchWordDetails(word: string): Promise<(VocabItem & { exists: boolean }) | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `German Philologist analysis for: "${word}". Strictly provide conjugation present3rd/past/pastParticiple if it's a verb.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ['word', 'translation', 'type', 'level', 'example', 'exampleTranslation', 'exists'],
          properties: {
            exists: { type: Type.BOOLEAN },
            word: { type: Type.STRING },
            translation: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['noun', 'verb', 'preposition', 'adjective', 'adverb', 'phrase'] },
            level: { type: Type.STRING },
            example: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING },
            gender: { type: Type.STRING, enum: ['der', 'die', 'das', 'none'] },
            plural: { type: Type.STRING },
            isIrregular: { type: Type.BOOLEAN },
            conjugation: {
              type: Type.OBJECT,
              properties: {
                present3rd: { type: Type.STRING },
                past: { type: Type.STRING },
                pastParticiple: { type: Type.STRING }
              }
            },
            cases: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9)
    };
  } catch (e) {
    console.error("Gemini Single Word Detail Error:", e);
    return null;
  }
}

export async function createTutorChat(masteredWords: string[], history: ChatMessage[] = []) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const wordList = masteredWords.join(", ");
  const geminiHistory = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    history: geminiHistory,
    config: {
      systemInstruction: `German tutor. Use words: [${wordList}]. Focus on active usage.`,
    }
  });
}

export async function generateSpeech(text: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `German: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}
