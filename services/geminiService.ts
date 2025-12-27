
import { GoogleGenAI, Type } from "@google/genai";
import { getFromCache, saveToCache } from "./cacheService";

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
 * Enhanced error handler to catch quota and rate limit issues specifically.
 */
const handleApiError = (error: any): string => {
  console.error("Gemini API Error Detail:", error);
  
  let errorMsg = "";
  if (typeof error === 'string') {
    errorMsg = error;
  } else if (error instanceof Error) {
    errorMsg = error.message;
  } else if (error && typeof error === 'object') {
    // Extract message from nested structures often found in API responses
    errorMsg = error.message || error.error?.message || JSON.stringify(error);
  } else {
    errorMsg = String(error);
  }

  const lowMessage = errorMsg.toLowerCase();
  
  // Catch 429, Resource Exhausted, Quota Exceeded, etc.
  if (
    lowMessage.includes("429") || 
    lowMessage.includes("quota") || 
    lowMessage.includes("resource_exhausted") || 
    lowMessage.includes("rate limit") ||
    lowMessage.includes("too many requests")
  ) {
    return "The AI assistant is taking a short break due to high demand. Please try again in about 60 seconds.";
  }
  
  // Catch authentication issues
  if (
    lowMessage.includes("api key") || 
    lowMessage.includes("unauthorized") || 
    lowMessage.includes("forbidden")
  ) {
    return "There is a temporary configuration issue with the AI service. Please try again later.";
  }

  // Generic fallback
  return "I am having trouble connecting to the AI assistant right now. Please check your internet or try again in a moment.";
};

/**
 * Standard content generation using Gemini 3 Flash.
 */
export const generateContent = async (prompt: string, language: string = 'en', systemInstruction?: string): Promise<string> => {
  const cacheKey = `${language}_${prompt}_${systemInstruction || ''}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  if (!navigator.onLine) {
    return "You are currently offline. Check your connection.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        systemInstruction: (systemInstruction || '') + getLanguageInstruction(language) 
      }
    });
    
    const text = response.text || "No response generated.";
    if (text && text !== "No response generated.") {
      saveToCache(cacheKey, text);
    }
    return text;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Mobility Planner using gemini-2.5-flash with Google Maps Grounding.
 */
export const getMobilityPlan = async (
  start: string, 
  end: string, 
  aid: string, 
  language: string
): Promise<{ text: string; links: { title: string; uri: string }[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const langName = LANGUAGE_MAP[language] || 'English';
    
    let latLng = undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (e) {
      console.debug("Geolocation skipped for planning.");
    }

    const contents = `Find a safe and accessible route from "${start}" to "${end}" for a person using a "${aid}". 
    Describe the path, road conditions, accessibility landmarks, and specific advice. 
    MANDATORY: Use the ${langName} language and script.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: latLng
          }
        },
        systemInstruction: `You are an expert Mobility and Accessibility Assistant for India. 
        Provide clear, practical, and grounded navigation advice. Focus strictly on the locations mentioned.
        ${getLanguageInstruction(language)}`
      },
    });

    const text = response.text || "";
    const links: { title: string; uri: string }[] = [];
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps?.uri) {
          links.push({
            title: chunk.maps.title || "Maps Location",
            uri: chunk.maps.uri
          });
        }
      });
    }

    return { text, links };
  } catch (error) {
    return { text: handleApiError(error), links: [] };
  }
};

/**
 * Voice Fill: Extraction for Mobility Planner
 */
export const extractMobilityDetails = async (speech: string, language: string): Promise<{ start: string; end: string; aid: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract trip details from: "${speech}"`,
      config: {
        systemInstruction: "Extract the start location, destination, and mobility aid (Wheelchair, Walking Stick, Crutches, or None). Return ONLY JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            start: { type: Type.STRING },
            end: { type: Type.STRING },
            aid: { type: Type.STRING }
          },
          required: ["start", "end", "aid"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    return { start: "", end: "", aid: "None" };
  }
};

/**
 * Voice Fill: Extraction for Resume Builder
 */
export const extractResumeDetails = async (speech: string, language: string): Promise<{ name: string; location: string; skills: string; experience: string; education: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract personal details from: "${speech}"`,
      config: {
        systemInstruction: "Extract name, village/city, skills, work experience, and education level. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            location: { type: Type.STRING },
            skills: { type: Type.STRING },
            experience: { type: Type.STRING },
            education: { type: Type.STRING }
          },
          required: ["name", "location", "skills", "experience", "education"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    return { name: "", location: "", skills: "", experience: "", education: "" };
  }
};

/**
 * Voice Fill: Extraction for Scheme Matcher
 */
export const extractSchemeDetails = async (speech: string, language: string): Promise<{ age: string; gender: string; occupation: string; income: string; state: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract profile details from: "${speech}"`,
      config: {
        systemInstruction: "Extract age, gender (Male/Female/Other), occupation, annual income, and state/district. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            age: { type: Type.STRING },
            gender: { type: Type.STRING },
            occupation: { type: Type.STRING },
            income: { type: Type.STRING },
            state: { type: Type.STRING }
          },
          required: ["age", "gender", "occupation", "income", "state"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    return { age: "", gender: "Male", occupation: "", income: "", state: "" };
  }
};

/**
 * Kisan Mandi Voice Fill Extraction.
 */
export const extractMandiItem = async (speech: string, language: string): Promise<{ name: string; price: string; contact: string; location: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract item details from: "${speech}"`,
      config: {
        systemInstruction: "Extract agricultural item name, price, contact, and location. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            price: { type: Type.STRING },
            contact: { type: Type.STRING },
            location: { type: Type.STRING }
          },
          required: ["name", "price", "contact", "location"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    return { name: "", price: "", contact: "", location: "" };
  }
};

export const recognizeSahayakIntent = async (userInput: string, languageCode: string): Promise<any> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const langName = LANGUAGE_MAP[languageCode] || 'English';
    const systemInstruction = `
You are SAHAYAK AI, the intelligent control center for Grameen Connect. 
Your ONLY goal is to map user speech to specific portal tools.

━━━━━━━━━━━━━━━━━━━━━━
INTENT CATEGORIES (target)
━━━━━━━━━━━━━━━━━━━━━━
1. 'kisan_mandi': market, mandi, crops, sell, buy, bazaar.
2. 'swasthya_saathi': doctor, fever, health, medicine, sickness.
3. 'community_request': need help, assistant, volunteer request.
4. 'resume_builder': resume, job, biodata, CV, work.
5. 'mobility_planner': route, directions, path, safe way.
6. 'vision_helper': camera, look, analyze, take photo.
7. 'schemes': government schemes, yojana, benefits, govt.

━━━━━━━━━━━━━━━━━━━━━━
ACTION RULES
━━━━━━━━━━━━━━━━━━━━━━
- action 'navigate': opening tools.
- action 'plan_mobility': if user says "from [X] to [Y]".
- action 'type_health_input': if symptoms provided immediately.

OUTPUT RULES (STRICT JSON):
{
  "action": "navigate | type_health_input | plan_mobility | unknown",
  "target": "kisan_mandi | swasthya_saathi | community_request | resume_builder | mobility_planner | vision_helper | schemes | null",
  "text": "Short confirmation string in ${langName}",
  "source_location": "string | null",
  "destination_location": "string | null"
}
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userInput,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    
    const text = response.text || "";
    
    // Check if the response is actually an error message returned from the API (if not using throw)
    // although with @google/genai it usually throws.
    if (!text.trim().startsWith('{') || text.includes("too many requests") || text.includes("break")) {
      return { action: "unknown", text: text.includes("requests") ? text : "The assistant is busy right now. Please try again shortly." };
    }

    return JSON.parse(text || '{}');
  } catch (e) {
    const errorMsg = handleApiError(e);
    return { action: "unknown", text: errorMsg };
  }
};

export const generateVisionContent = async (
  prompt: string, 
  base64Image: string, 
  mimeType: string, 
  language: string = 'en',
  skipLanguageInstruction: boolean = false
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType, data: base64Image } }, { text: prompt }] },
      config: { systemInstruction: skipLanguageInstruction ? "Analysis prompt." : getLanguageInstruction(language) }
    });
    return response.text || "";
  } catch (error) { 
    return handleApiError(error); 
  }
};

export const chatWithBot = async (history: any[], message: string, systemInstruction: string, language: string = 'en') => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: systemInstruction + getLanguageInstruction(language), temperature: 0.7 },
      history: history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] }))
    });
    const result = await chat.sendMessage({ message });
    return result.text || "No response generated.";
  } catch (e: any) { 
    return handleApiError(e); 
  }
};

export const transliterateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text || targetLang === 'en') return text;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transliterate into ${LANGUAGE_MAP[targetLang]} script: "${text}"`,
      config: { systemInstruction: "Output ONLY the script. No English." }
    });
    return response.text?.trim() || text;
  } catch { 
    return text; 
  }
};
