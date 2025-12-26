
import { GoogleGenAI } from "@google/genai";

const LANGUAGE_MAP: Record<string, string> = {
  'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali', 'te': 'Telugu', 'mr': 'Marathi', 
  'ta': 'Tamil', 'ur': 'Urdu', 'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 
  'pa': 'Punjabi', 'or': 'Odia', 'as': 'Assamese'
};

const getLanguageInstruction = (lang: string) => {
  const langName = LANGUAGE_MAP[lang] || 'English';
  if (lang === 'en') return "";
  return ` MANDATORY: You must write EVERYTHING strictly in the ${langName} language and using the ${langName} script. Do not use English words unless absolutely necessary.`;
};

/**
 * Standard content generation using Gemini 3 Flash.
 */
export const generateContent = async (prompt: string, language: string = 'en', systemInstruction?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        systemInstruction: (systemInstruction || '') + getLanguageInstruction(language) 
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini Content Error:", error);
    return "I am having trouble connecting right now. Please try again in a moment.";
  }
};

/**
 * Transliteration service using Flash model.
 */
export const transliterateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text || targetLang === 'en') return text;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transliterate the following text into the ${LANGUAGE_MAP[targetLang]} script: "${text}"`,
      config: { systemInstruction: "Output ONLY the transliterated native script. No explanations or English." }
    });
    return response.text?.trim() || text;
  } catch { 
    return text; 
  }
};

/**
 * Multimodal vision analysis.
 * Added skipLanguageInstruction to prevent translation for technical checks like face verification.
 */
export const generateVisionContent = async (
  prompt: string, 
  base64Image: string, 
  mimeType: string, 
  language: string = 'en',
  skipLanguageInstruction: boolean = false
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ] 
      },
      config: { 
        systemInstruction: skipLanguageInstruction ? "You are a specialized vision analysis system. Provide technical responses as requested. Answer ONLY with the specific keywords provided in the prompt." : getLanguageInstruction(language) 
      }
    });
    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return "Error analyzing the image.";
  }
};

/**
 * Persistent chat functionality.
 */
export const chatWithBot = async (history: { role: 'user' | 'model', text: string }[], message: string, systemInstruction: string, language: string = 'en') => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction: systemInstruction + getLanguageInstruction(language),
        temperature: 0.7
      },
      history: history.map(h => ({ 
        role: h.role === 'user' ? 'user' : 'model', 
        parts: [{ text: h.text }] 
      }))
    });
    
    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (e: any) {
    console.error("Gemini Chat Error:", e);
    return "Connection error. Please check your internet and try again.";
  }
};
