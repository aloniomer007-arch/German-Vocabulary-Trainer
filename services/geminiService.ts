import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabItem, Level, ChatMessage } from "../types";

/**
 * Attempts to repair a truncated JSON array by finding the last complete object.
 */
function repairTruncatedJsonArray(jsonStr: string): string {
  const trimmed = jsonStr.trim();
  if (trimmed.endsWith(']')) return trimmed;
  
  const lastBraceIndex = trimmed.lastIndexOf('}');
  if (lastBraceIndex === -1) return '[]';
  
  return trimmed.substring(0, lastBraceIndex + 1) + ']';
}

/**
 * Helper to fetch a single batch chunk from Gemini.
 * Optimized to handle smaller, more reliable counts.
 */
async function fetchBatchChunk(level: Level, count: number, excludeWords: string[]): Promise<VocabItem[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const cefrGuidelines: Record<Level, string> = {
    A1: "Absolute basics. Focus on daily objects, common actions, and simple greetings.",
    A2: "Elementary. Focus on routines, past events, and personal environment.",
    B1: "Intermediate. Narrating experiences, opinions, and abstract plans.",
    B2: "Upper-intermediate. Complex topics, technical discussions, and nuance.",
    C1: "Advanced academic/professional. Fine shades of meaning and specific fields.",
    C2: "Mastery level. Full professional fluency and idiomatic precision."
  };

  const recentExclusions = excludeWords.slice(-150);
  const exclusionString = recentExclusions.length > 0 
    ? `IMPORTANT: Do not include any of these words: ${recentExclusions.join(', ')}.`
    : "";

  const prompt = `Act as a German Philologist. Generate EXACTLY ${count} UNIQUE German vocab items for CEFR level ${level}.
  
  LEVEL CONTEXT: ${cefrGuidelines[level]}
  ${exclusionString}

  STRICT REQUIREMENTS:
  1. For VERBS: Provide 'conjugation' with 'present3rd', 'past', and 'pastParticiple'.
  2. For NOUNS: Provide 'gender' ('der'/'die'/'das') and 'plural'.
  3. Return results as a valid JSON array. Ensure no duplicates of the excluded words.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['word', 'translation', 'type', 'level', 'example', 'exampleTranslation', 'conjugation', 'gender', 'plural', 'isIrregular'],
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
                required: ['present3rd', 'past', 'pastParticiple'],
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

    let text = response.text?.trim() || '[]';
    
    if (!text.startsWith('[')) {
      const start = text.indexOf('[');
      if (start !== -1) text = text.substring(start);
    }
    
    if (!text.endsWith(']')) {
      text = repairTruncatedJsonArray(text);
    }

    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substring(2, 11)
    }));
  } catch (e) {
    console.error("Gemini Chunk Fetch Error:", e);
    return [];
  }
}

/**
 * Guarantees the requested word count by breaking large requests into smaller chunks.
 */
export async function fetchQuizBatch(level: Level, count: number = 25, excludeWords: string[] = []): Promise<VocabItem[]> {
  let allItems: VocabItem[] = [];
  const maxTotalAttempts = 20; 
  let attempts = 0;
  
  const currentExclusions = [...excludeWords];

  while (allItems.length < count && attempts < maxTotalAttempts) {
    attempts++;
    const remainingCount = count - allItems.length;
    const chunkSize = Math.min(remainingCount, 15);
    const nextChunk = await fetchBatchChunk(level, chunkSize, currentExclusions);
    if (nextChunk.length === 0) continue; 
    const uniqueFromChunk = nextChunk.filter(item => {
      const isDuplicate = currentExclusions.some(ex => ex.toLowerCase() === item.word.toLowerCase());
      return !isDuplicate;
    });
    if (uniqueFromChunk.length === 0 && attempts > 10) break;
    allItems = [...allItems, ...uniqueFromChunk];
    uniqueFromChunk.forEach(item => currentExclusions.push(item.word));
  }
  return allItems.slice(0, count);
}

export async function fetchWordDetails(word: string): Promise<(VocabItem & { exists: boolean }) | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `German Philologist word analysis: "${word}". Provide grammatical details including conjugation if it is a verb.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ['word', 'translation', 'type', 'level', 'example', 'exampleTranslation', 'exists', 'conjugation'],
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
              required: ['present3rd', 'past', 'pastParticiple'],
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
      id: Math.random().toString(36).substring(2, 11)
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
      systemInstruction: `You are a German language tutor. Your student has mastered these words: [${wordList}]. Try to use them in your conversation. Correct their grammar gently in English if they make mistakes. Encourage them to keep speaking in German.`,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });
}

export async function generateSpeech(text: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Please speak this German text clearly: ${text}` }] }],
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