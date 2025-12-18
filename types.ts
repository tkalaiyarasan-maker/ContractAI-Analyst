export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  content: string; // The extracted text
  fileData?: ArrayBuffer; // Raw PDF data for rendering previews
  status: 'uploading' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
}

// Augment window for pdfjs
declare global {
  interface Window {
    pdfjsLib: any;
  }
}