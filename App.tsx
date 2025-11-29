
import React, { useState, useEffect } from 'react';
import { Layout, FileText, Trash2, CheckCircle2, RotateCw, Database, AlertTriangle } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import { extractTextFromPDF } from './services/pdfService';
import { initializeChat, sendMessageToGemini } from './services/geminiService';
import { saveFileToStorage, getAllFilesFromStorage, deleteFileFromStorage, clearStorage } from './services/storageService';
import { Message, UploadedFile } from './types';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{current: number, total: number} | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [isStorageLoading, setIsStorageLoading] = useState(true);
  
  // Total Token Estimation (Very rough: 1 page ~ 500 words ~ 650 tokens)
  const estimatedTokens = files.reduce((acc, file) => acc + (file.pageCount * 650), 0);
  const isOverContextLimit = estimatedTokens > 2000000; // Warning threshold for demo

  // Load files from storage on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const storedFiles = await getAllFilesFromStorage();
        if (storedFiles.length > 0) {
          setFiles(storedFiles);
        }
      } catch (error) {
        console.error("Failed to load files from storage", error);
      } finally {
        setIsStorageLoading(false);
      }
    };
    loadFiles();
  }, []);

  const handleFileSelect = async (fileList: FileList) => {
    setIsProcessing(true);
    setDocumentsLoaded(false);

    // Process files sequentially to manage memory
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const tempId = Math.random().toString(36).substr(2, 9);
      
      try {
        setProcessingProgress({ current: 0, total: 0 }); // Reset for new file
        
        const result = await extractTextFromPDF(file, (loaded, total) => {
          setProcessingProgress({ current: loaded, total });
        });

        const newFile: UploadedFile = {
          id: tempId,
          name: file.name,
          size: file.size,
          pageCount: result.pageCount,
          content: result.text,
          status: 'ready'
        };

        // Save to state and storage
        setFiles(prev => [...prev, newFile]);
        await saveFileToStorage(newFile);

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setFiles(prev => [...prev, {
            id: tempId,
            name: file.name,
            size: file.size,
            pageCount: 0,
            content: '',
            status: 'error',
            errorMessage: 'Failed to parse PDF'
        }]);
      }
    }

    setIsProcessing(false);
    setProcessingProgress(null);
  };

  const removeFile = async (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setDocumentsLoaded(false); // Require re-initialization
    await deleteFileFromStorage(id);
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to delete all stored contracts? This cannot be undone.")) {
      await clearStorage();
      setFiles([]);
      setDocumentsLoaded(false);
      setMessages([]);
    }
  };

  // Re-initialize Chat when files change (and are ready)
  const initializeAnalysis = async () => {
    if (files.length === 0) return;
    
    setIsChatLoading(true);
    try {
      const combinedContext = files
        .filter(f => f.status === 'ready')
        .map(f => `--- DOCUMENT: ${f.name} ---\n${f.content}\n--- END DOCUMENT ---\n`)
        .join('\n');

      if (!combinedContext.trim()) {
        throw new Error("No readable text content found.");
      }

      await initializeChat(combinedContext);
      setDocumentsLoaded(true);
      
      // Add system greeting
      setMessages([{
        id: 'system-1',
        role: 'model',
        content: `I have analyzed ${files.length} document(s) totaling approx. ${files.reduce((a,b) => a + b.pageCount, 0)} pages. I am ready to answer questions regarding the contract terms, clauses, and specifications.`,
        timestamp: Date.now()
      }]);

    } catch (error) {
      console.error("Init Error", error);
      alert("Failed to initialize the AI model with these documents.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);
    setIsChatLoading(true);

    try {
      const responseText = await sendMessageToGemini(messages, text);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
        // Error handled in service, but safety net here
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isStorageLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p className="text-sm">Loading stored contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-brand-700 mb-1">
            <Layout className="w-6 h-6" />
            <h1 className="font-bold text-xl tracking-tight">ContractAI</h1>
          </div>
          <p className="text-xs text-slate-500">Legal Document Analyst</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
            
            {isProcessing && processingProgress && (
               <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Extracting Text...</span>
                    <span>{processingProgress.current} / {processingProgress.total} pages</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                        className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%`}}
                    ></div>
                  </div>
               </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stored Files</h2>
              {files.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  <Database className="w-3 h-3" />
                  <span>Saved</span>
                </div>
              )}
            </div>
            
            {files.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-4">No documents stored</p>
            )}
            {files.map(file => (
              <div key={file.id} className="group relative bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-1.5 rounded ${file.status === 'ready' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-500">{file.pageCount} Pages</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
             {files.length > 0 && !documentsLoaded && !isProcessing && (
                 <button 
                    onClick={initializeAnalysis}
                    className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
                 >
                    <RotateCw className="w-4 h-4" />
                    Load Context to AI
                 </button>
             )}
             {documentsLoaded && (
                 <div className="w-full flex items-center justify-center gap-2 bg-green-100 text-green-700 py-2 px-4 rounded-lg text-sm font-medium border border-green-200">
                    <CheckCircle2 className="w-4 h-4" />
                    Context Loaded
                 </div>
             )}
             
             {isOverContextLimit && (
                 <div className="text-[10px] text-amber-600 text-center leading-tight bg-amber-50 p-2 rounded border border-amber-100">
                    Warning: Total content is very large. Responses may be slower or hit limits.
                 </div>
             )}

             {files.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-600 text-xs py-2 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All Stored Data
                </button>
             )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <h1 className="font-bold text-slate-800">ContractAI</h1>
            <button className="text-slate-500">
                <Layout className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-hidden">
           <ChatInterface 
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                documentsLoaded={documentsLoaded}
           />
        </div>
      </div>
    </div>
  );
};

export default App;
