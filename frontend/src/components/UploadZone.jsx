import { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export const UploadZone = ({ onFileUpload, isLoading = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      return 'Please upload an Excel file (.xlsx, .xls) or CSV file';
    }
    
    if (file.size > 50 * 1024 * 1024) {
      return 'File size must be less than 50MB';
    }
    
    return null;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      onFileUpload(file);
    }
  }, [onFileUpload]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        data-testid="upload-zone"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer",
          isDragging 
            ? "border-indigo-500 bg-indigo-50/50 upload-zone-hover" 
            : "border-zinc-300 hover:border-indigo-400 bg-zinc-50/50 hover:bg-zinc-50",
          isLoading && "pointer-events-none opacity-60"
        )}
      >
        <input
          type="file"
          data-testid="file-input"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
          ) : isDragging ? (
            <FileSpreadsheet className="w-16 h-16 text-indigo-500" />
          ) : (
            <UploadCloud className="w-16 h-16 text-zinc-400" />
          )}
          
          <div className="space-y-2">
            <h3 className="font-heading text-xl font-semibold text-zinc-900">
              {isLoading ? 'Processing...' : isDragging ? 'Drop your file here' : 'Upload Excel File'}
            </h3>
            <p className="text-sm text-zinc-500">
              {isLoading 
                ? 'Parsing your spreadsheet data' 
                : 'Drag and drop your Excel file here, or click to browse'}
            </p>
          </div>
          
          {!isLoading && (
            <Button 
              variant="outline" 
              className="mt-2 pointer-events-none"
              data-testid="browse-button"
            >
              Browse Files
            </Button>
          )}
          
          <p className="text-xs text-zinc-400 mt-2">
            Supports .xlsx, .xls, .csv (max 50MB)
          </p>
        </div>
      </div>
      
      {error && (
        <div 
          data-testid="upload-error"
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
        >
          <X className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};
