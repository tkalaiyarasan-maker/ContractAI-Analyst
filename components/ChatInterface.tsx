import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileSearch, Sparkles } from 'lucide-react';
import { Message, UploadedFile } from '../types';
import ReactMarkdown from 'react-markdown';
import CitationPreview from './CitationPreview';
import PdfPreviewPanel from './PdfPreviewPanel';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  documentsLoaded: boolean;
  files: UploadedFile[]; 
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  documentsLoaded,
  files
}) => {
  const [input, setInput] = useState('');
  // State tracks the file and the specific page number to show
  const [previewState, setPreviewState] = useState<{file: UploadedFile, page: number} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // FIX: Only scroll when new messages arrive, NOT when preview state changes.
  // This prevents the view from jumping away from the cursor when hovering a link.
  useEffect(() => {
    scrollToBottom();
  }, [messages]); 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && documentsLoaded) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handlePreview = (file: UploadedFile, page: number) => {
    setPreviewState({ file, page });
  };

  const closePreview = () => {
    setPreviewState(null);
  };

  // Function to parse text and inject Citation components
  const renderMessageContent = (content: string) => {
    // Regex updated to capture Clause ID: ⦗Clause: <ID> | Page: <Num> | File: "<Name>"⦘
    const regex = /⦗Clause:\s*(.*?)\s*\|\s*Page:\s*(\d+)\s*\|\s*File:\s*"([^"]+)"⦘/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <ReactMarkdown 
            key={lastIndex}
            components={{
              // Force inline rendering to prevent layout shifts
              p: ({children}) => <span className="inline">{children}</span>
            }}
          >
            {content.slice(lastIndex, match.index)}
          </ReactMarkdown>
        );
      }

      const clauseRef = match[1].trim();
      const pageNumber = parseInt(match[2], 10);
      const fileName = match[3];
      
      // Determine what text to show on the button
      let label = `Page ${pageNumber}`;
      if (clauseRef && clauseRef !== 'N/A' && clauseRef !== 'General') {
        label = `${clauseRef}`; // e.g., "Clause 14.2"
      } else {
        label = `Page ${pageNumber}`; // Fallback if no clause
      }
      
      parts.push(
        <CitationPreview 
          key={match.index}
          files={files}
          fileName={fileName}
          pageNumber={pageNumber}
          displayText={label}
          onPreview={handlePreview}
        />
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(
        <ReactMarkdown 
            key={lastIndex}
            components={{
                p: ({children}) => <span className="inline">{children}</span>
            }}
        >
            {content.slice(lastIndex)}
        </ReactMarkdown>
      );
    }

    return <div className="prose prose-sm max-w-none text-slate-800 prose-headings:font-bold prose-strong:text-slate-900 inline-block">{parts}</div>;
  };

  if (!documentsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <FileSearch className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Please upload a contract to begin analysis.</p>
        <p className="text-sm">Once uploaded, ask questions like "What is the mobilization advance?"</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-80">
                <Sparkles className="w-12 h-12 mb-3 text-brand-500" />
                <p className="font-medium">Contract Analysis Ready</p>
                <p className="text-sm">Ask detailed questions about clauses, terms, and obligations.</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[90%] md:max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${msg.role === 'user' ? 'bg-slate-800' : 'bg-brand-600'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>

                  <div className={`flex flex-col rounded-2xl p-4 shadow-sm text-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-slate-800 text-white rounded-tr-none' 
                      : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                    
                    {msg.role === 'model' ? (
                      renderMessageContent(msg.content)
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    
                    <span className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
                <div className="flex w-full justify-start">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={documentsLoaded ? "Ask about the mobilization advance, penalties, or scope..." : "Upload documents to enable chat"}
                disabled={!documentsLoaded || isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || !documentsLoaded || isLoading}
                className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="mt-2 text-center">
                <p className="text-[10px] text-slate-400">AI can make mistakes. Verify details.</p>
            </div>
          </div>
      </div>

      {/* Right Side Preview Panel */}
      {previewState && (
         <PdfPreviewPanel 
            file={previewState.file}
            pageNumber={previewState.page}
            onClose={closePreview}
         />
      )}
    </div>
  );
};

export default ChatInterface;