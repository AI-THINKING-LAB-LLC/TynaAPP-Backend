import { GoogleGenAI } from "@google/genai";
import { TranscriptEntry } from "../types";

// Safely access process.env to prevent ReferenceError in browser ESM environments
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore error if process is not defined
  }
  return '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const generateMeetingChatResponse = async (
  history: TranscriptEntry[],
  userQuery: string
): Promise<string> => {
  if (!apiKey) return "API Key not configured. Using mock response.";

  try {
    const transcriptText = history
      .map((entry) => `${entry.speaker} (${entry.timestamp}): ${entry.text}`)
      .join("\n");

    const prompt = `
      You are Tyna, a helpful meeting assistant.
      Here is the transcript of the current meeting so far:
      
      ---
      ${transcriptText}
      ---

      The user asks: "${userQuery}"
      
      Answer briefly and helpfully based ONLY on the context above.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I'm having trouble connecting to the AI right now.";
  }
};

export const generateMeetingSummary = async (
  transcript: TranscriptEntry[]
): Promise<{ summary: string; actionItems: string[] }> => {
  if (!apiKey) {
    return {
      summary: "This is a mock summary because no API key was provided. The meeting discussed project timelines and key deliverables.",
      actionItems: ["Review the Q3 roadmap", "Schedule follow-up with design team"]
    };
  }

  try {
    const transcriptText = transcript
      .map((entry) => `${entry.speaker}: ${entry.text}`)
      .join("\n");

    const prompt = `
      Analyze the following meeting transcript:
      ${transcriptText}

      Provide a JSON response with two fields:
      1. "summary": A concise paragraph summarizing the meeting.
      2. "actionItems": An array of strings representing key tasks.

      Return ONLY raw JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return {
      summary: data.summary || "No summary available.",
      actionItems: data.actionItems || []
    };
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return {
      summary: "Error generating summary.",
      actionItems: []
    };
  }
};