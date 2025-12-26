
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabItem, Level, ChatMessage } from "../types";

/**
 * Attempts to repair a truncated JSON array by finding the last complete object.
 */
function repairTruncatedJsonArray(jsonStr: string): string {
  const trimmed = jsonStr.trim();
  if (trimmed.endsWith(']')) return trimmed;
  
  // Find the last complete object closing brace before the truncation
  const lastBraceIndex = trimmed.lastIndexOf('}');
  if (lastBraceIndex === -1) return '[]';
  
  // Slice to the last brace and close the array
  return trimmed.substring(0, lastBraceIndex + 1) + ']';
}

/**
 * Helper to fetch a single batch chunk from Gemini.
 */
async function fetchBatchChunk(level: Level, count: number, excludeWords: string[]): Promise<VocabItem[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const cefrGuidelines: Record<Level, string> = {
    A1: "Focus on absolute basics. Words like 'Haus', 'Trinken'.",
    A2: "Elementary level. Topics: routines, simple past events.",
    B1: "Intermediate level. Narrating experiences.",
    B2: "Upper-intermediate level. Abstract concepts.",
    C1: "Advanced academic/professional language.",
    C2: "Mastery level. Highly specific synonyms."
  };

  const exclusionString = excludeWords.length > 0 
    ? `EXCLUSION: Do not repeat these words: ${excludeWords.slice(-200).join(', ')}.`
    : "";

  const prompt = `Act as a German Philologist. Generate EXACTLY ${count} UNIQUE German vocab items for level ${level}.
  
  STRICT VERB CONJUGATION MAPPING:
  - "present3rd": MUST be the 3rd person singular present (er/sie/es). Example: 'trinkt'.
  - "past": MUST be the Präteritum (Simple Past). Example: 'trank'.
  - "pastParticiple": MUST be the Perfekt. Example: 'hat getrunken'.
  
  CRITICAL RULES:
  1. Use ONLY the word string. No markdown (_) or labels inside values.
  2. For NOUNS, include "plural".
  3. Ensure NO duplicates in this response.

  ${exclusionString}
  Level: ${cefrGuidelines[level]}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 8192,
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

    let text = response.text || '[]';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    if (!text.endsWith(']')) {
      text = repairTruncatedJsonArray(text);
    }

    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    }));
  } catch (e) {
    console.error("Gemini Chunk Fetch Error:", e);
    return [];
  }
}

/**
 * Main fetcher with Refill Strategy to guarantee count.
 */
export async function fetchQuizBatch(level: Level, count: number = 25, excludeWords: string[] = []): Promise<VocabItem[]> {
  let allItems: VocabItem[] = [];
  const maxRetries = 3;
  let attempts = 0;
  
  const currentExclusions = [...excludeWords];

  while (allItems.length < count && attempts < maxRetries) {
    attempts++;
    const remaining = count - allItems.length;
    // Emphasize larger chunks if we are far behind
    const nextChunk = await fetchBatchChunk(level, remaining, currentExclusions);
    
    if (nextChunk.length === 0) break; // Stuck

    allItems = [...allItems, ...nextChunk];
    // Add new items to exclusions for next potential loop
    nextChunk.forEach(item => currentExclusions.push(item.word));
    
    // Safety slice in case of overflow
    if (allItems.length > count) {
      allItems = allItems.slice(0, count);
    }
  }

  return allItems;
}

export async function fetchWordDetails(word: string): Promise<(VocabItem & { exists: boolean }) | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `German Philologist word analysis: "${word}". Context in parens if provided. 
  MAPPING: present3rd=trinkt, past=trank, pastParticiple=hat getrunken. DO NOT SWAP.`;

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
      systemInstruction: `German tutor. Use words: [${wordList}]. Grammar in English.`,
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
