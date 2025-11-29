import React, { useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: FileList) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 
        ${isProcessing ? 'border-slate-300 bg-slate-50 cursor-not-allowed' : 'border-brand-500 bg-brand-50 hover:bg-brand-100 cursor-pointer'}`}
      onDragOver={handleDragOver}
      onDrop={isProcessing ? undefined : handleDrop}
      onClick={() => !isProcessing && inputRef.current?.click()}
    >
      <input 
        type="file" 
        multiple 
        accept=".pdf" 
        className="hidden" 
        ref={inputRef}
        onChange={(e) => e.target.files && onFileSelect(e.target.files)}
        disabled={isProcessing}
      />
      
      <div className="flex flex-col items-center justify-center gap-3">
        {isProcessing ? (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        ) : (
          <div className="bg-white p-3 rounded-full shadow-sm">
            <Upload className="w-8 h-8 text-brand-600" />
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {isProcessing ? 'Processing Documents...' : 'Upload Contract Documents'}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Drag & drop PDF files here, or click to browse.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full mt-2 border border-amber-100">
          <AlertCircle className="w-4 h-4" />
          <span>Large files (100k+ pages) may take time to process in-browser.</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;