import { GoogleGenAI, Chat, GenerativeModel } from "@google/genai";
import { Message } from "../types";

// Initialize the client
// IMPORTANT: In a real app, strict token limits apply. 
// Gemini 1.5 Pro/Flash has huge context (1M-2M tokens). 
// 100,000 pages ~ 40M tokens. This is currently beyond a single context window.
// However, we will demonstrate the capability for "large" documents within the API limits.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;
let model: GenerativeModel | null = null;

export const initializeChat = async (contextText: string) => {
  try {
    // We use gemini-3-pro-preview for complex reasoning on large text
    chatSession = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `You are a high-level Contract Analyst AI. 
        Your goal is to answer questions strictly based on the provided contract documents.
        
        Rules:
        1. Always cite the specific Clause Number (e.g., "Clause 14.2") or Page Number if available in the text.
        2. Be precise with percentages, dates, and amounts.
        3. If the information is not in the text, state clearly: "I cannot find this information in the provided documents."
        4. Do not hallucinate or assume standard contract terms if they are not explicitly written.
        
        The following is the full content of the uploaded contracts:
        
        === BEGIN CONTRACT CONTENT ===
        ${contextText}
        === END CONTRACT CONTENT ===
        `,
        temperature: 0.2, // Low temperature for factual extraction
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to initialize chat", error);
    throw error;
  }
};

export const sendMessageToGemini = async (
  history: Message[], 
  newMessage: string
): Promise<string> => {
  if (!chatSession) {
    throw new Error("Chat session not initialized. Please upload documents first.");
  }

  try {
    const response = await chatSession.sendMessageStream({
      message: newMessage,
    });

    let fullText = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error analyzing the document. The file might be too large for the current context window, or there was a network issue.";
  }
};