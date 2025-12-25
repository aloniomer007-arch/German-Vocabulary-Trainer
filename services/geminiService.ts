
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabItem, Level, ChatMessage } from "../types";

export async function fetchQuizBatch(level: Level, count: number = 25, excludeWords: string[] = []): Promise<VocabItem[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const cefrGuidelines: Record<Level, string> = {
    A1: "Focus on absolute basics for immediate needs. Words like 'Haus', 'Trinken', 'Gehen'.",
    A2: "Elementary level. Topics: routines, simple past events, groceries.",
    B1: "Intermediate level. Narrating experiences and opinions.",
    B2: "Upper-intermediate level. Abstract concepts and complex social discussion.",
    C1: "Advanced academic and professional language.",
    C2: "Mastery level. Highly specific, literary, or extremely nuanced synonyms."
  };

  const exclusionString = excludeWords.length > 0 
    ? `EXCLUSION: Do not repeat these words: ${excludeWords.slice(-200).join(', ')}.`
    : "";

  const safeCount = Math.min(count, 75);

  const prompt = `Act as a professional German Philologist. 
  Generate a batch of EXACTLY ${safeCount} UNIQUE German vocabulary items for level ${level}.
  
  STRICT GRAMMAR RULES (MANDATORY):
  1. VERBS: You MUST provide the "conjugation" object for every verb (present3rd, past, pastParticiple). 
     - Example: { "present3rd": "isst", "past": "aß", "pastParticiple": "hat gegessen" }
  2. NOUNS: Must include "gender" and "plural".
  3. PREPOSITIONS: Must include "cases" (e.g. ["Dativ"]).
  
  TOKEN OPTIMIZATION (CRITICAL TO PREVENT TRUNCATION):
  - EXAMPLES: Keep "example" and "exampleTranslation" ultra-concise (max 5-6 words).
  - NO EXTRA TEXT: Return ONLY the JSON array.
  - COUNT: Do not skip items. Return the full ${safeCount}.

  ${exclusionString}
  Level context: ${cefrGuidelines[level]}
  
  Return a valid JSON array matching the schema exactly. Ensure the response is complete and not truncated.`;

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

    const text = response.text || '[]';
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);
    
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    }));
  } catch (e) {
    console.error("Gemini Fetch/Parse Error:", e);
    return [];
  }
}

/**
 * Fetches full metadata for a single specific word provided by the user.
 * Now handles parenthetical context hints and validates word existence.
 */
export async function fetchWordDetails(word: string): Promise<(VocabItem & { exists: boolean }) | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Act as a professional German Philologist. 
  The user wants to add the following to their lexicon: "${word}"
  
  VALIDATION RULE:
  - First, check if "${word}" is a real, valid word in the German language (Standardhochdeutsch).
  - If it is gibberish, a typo that isn't a word, or a word from another language, set "exists" to false.
  
  SENSE DISAMBIGUATION RULES:
  - If the input contains context in parentheses, e.g., "Bank (money)" or "Bank (park)", you MUST return the metadata for that specific meaning.
  - Example: "Essen (food)" should return the Noun "das Essen". "Essen (to eat)" should return the Verb "essen".
  - Capitalize NOUNS correctly (first letter uppercase).
  - Use lowercase for VERBS.
  
  Return ONLY the JSON object.`;

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
            exists: { type: Type.BOOLEAN, description: "Whether this is a real German word" },
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

    const text = response.text || '{}';
    const data = JSON.parse(text);
    
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
      systemInstruction: `You are "DeutschPro Coach", a high-end German tutor. 
      Speak German using: [${wordList}]. 
      Explain grammar in English.`,
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
