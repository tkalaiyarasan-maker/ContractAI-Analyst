import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, FileText, X, RefreshCw } from 'lucide-react';
import { UploadedFile } from '../types';
import { renderPdfPage } from '../services/pdfService';

interface PdfPreviewPanelProps {
  file: UploadedFile;
  pageNumber: number;
  onClose: () => void;
}

const PdfPreviewPanel: React.FC<PdfPreviewPanelProps> = ({ file, pageNumber, onClose }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      if (!file.fileData) {
        setError("Original PDF data not found. Please re-upload the file.");
        return;
      }

      setLoading(true);
      setError(null);
      setImageSrc(null);

      try {
        // Render at a higher scale for the large panel
        const url = await renderPdfPage(file.fileData, pageNumber, 2.0);
        
        if (active) {
          setImageSrc(url);
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
            setError(err.message || "Failed to render page image.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();

    return () => { active = false; };
  }, [file, pageNumber, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 border-l border-slate-200 shadow-xl w-full md:w-[500px] lg:w-[600px] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-brand-50 p-2 rounded-lg text-brand-600 border border-brand-100">
             <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate max-w-[250px]" title={file.name}>
                {file.name}
            </h3>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit">
              Page {pageNumber} Preview
            </span>
          </div>
        </div>
        <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            title="Close Preview"
        >
            <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center bg-slate-100/50">
        {loading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-200 rounded-full animate-ping opacity-25"></div>
                  <Loader2 className="w-10 h-10 animate-spin text-brand-600 relative z-10" />
                </div>
                <p className="text-sm font-medium animate-pulse">Rendering Document...</p>
            </div>
        )}

        {error && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center w-full max-w-sm">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Preview Failed</h4>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{error}</p>
                </div>
                <button 
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 shadow-sm rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
            </div>
        )}

        {imageSrc && !loading && (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                 <div className="bg-white p-1 shadow-lg rounded-sm border border-slate-200 w-full max-w-full">
                    <img 
                        src={imageSrc} 
                        alt={`Page ${pageNumber} of ${file.name}`} 
                        className="w-full h-auto" 
                    />
                </div>
                <div className="mt-4 text-center">
                    <span className="text-[10px] text-slate-400 font-mono bg-white border border-slate-200 px-2 py-1 rounded-full shadow-sm">
                      {file.name} • Page {pageNumber}
                    </span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PdfPreviewPanel;