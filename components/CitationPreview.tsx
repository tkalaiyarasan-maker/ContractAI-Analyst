import React from 'react';
import { UploadedFile } from '../types';
import { FileText, Search } from 'lucide-react';

interface CitationPreviewProps {
  files: UploadedFile[];
  fileName: string;
  pageNumber: number;
  displayText?: string;
  onPreview: (file: UploadedFile, page: number) => void;
}

const CitationPreview: React.FC<CitationPreviewProps> = ({ 
  files, 
  fileName, 
  pageNumber, 
  displayText,
  onPreview 
}) => {
  // Clean up filename (sometimes AI includes quotes or whitespace)
  const cleanFileName = fileName.replace(/['"]/g, '').trim();
  const file = files.find(f => f.name === cleanFileName);

  if (!file) {
    // If file not found, just render text
    return <span className="text-slate-500 font-mono text-xs cursor-help" title="File not found">{displayText || `[${cleanFileName}, p.${pageNumber}]`}</span>;
  }

  return (
    <button 
      className="inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800 rounded-md text-xs font-medium border border-brand-200 transition-all cursor-pointer group select-none"
      onMouseEnter={() => onPreview(file, pageNumber)}
      onClick={() => onPreview(file, pageNumber)}
      type="button"
    >
      <FileText className="w-3 h-3 text-brand-500 group-hover:text-brand-600" />
      <span className="font-semibold">{displayText || `Page ${pageNumber}`}</span>
      <Search className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
};

export default CitationPreview;