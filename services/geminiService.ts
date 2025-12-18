import { GoogleGenAI, Chat, GenerativeModel } from "@google/genai";
import { Message } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;

export const initializeChat = async (contextText: string) => {
  try {
    // We use gemini-3-pro-preview for complex reasoning on large text
    chatSession = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `You are a high-level Contract Analyst AI. 
        Your goal is to answer questions strictly based on the provided contract documents.
        
        Rules:
        1. You MUST cite the source for every specific fact, percentage, or obligation you state.
        2. Citations MUST use this EXACT format: ⦗Clause: <Clause ID> | Page: <number> | File: "<filename>"⦘
           Example: ⦗Clause: 14.2(a) | Page: 12 | File: "Master_Agreement.pdf"⦘
           - If the text is a table, header, or general content without a specific clause, use 'N/A' for the Clause ID.
        3. Determine the Page Number by looking for the nearest preceding "[Page X]" marker in the text provided.
        4. Identify the Clause Number (e.g., 2.1, 15.3, GCC 4) from the text surrounding the information.
        5. Do not hallucinate or assume standard contract terms if they are not explicitly written.
        6. If the information is not in the text, state clearly: "I cannot find this information in the provided documents."
        
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