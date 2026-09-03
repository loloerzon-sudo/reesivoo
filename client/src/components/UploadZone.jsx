import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TAGALOG_SCANNING_LINES = [
  "Gumastos ka na naman?! 💸",
  "Teka lang, binibilang pa namin kung magkano nabawas sa ipon mo... 👀",
  "Resibo check! Baka puro kape at milk tea na naman 'to ha? 🧋",
  "Huy, may budget pa ba tayo this month? Binabasa na ang resibo... 🧾",
  "Walang takas sa accounting! Hinahanap na ni AI ang TIN at Total... 🔍",
  "Another 'Deserve ko 'to' moment detected! Sandali lang... ✨",
  "Sana all may pang-reimburse! Pinoproseso na ang resibo mo... 💼",
  "Kinakabahan ako sa total nito... Patingin nga! 📊",
  "Wait lang po, binabasa ang sulat-doktor ng cashier... ✍️",
  "Basta may official receipt, lusot 'yan sa audit! Scanning... 📑"
];

export default function UploadZone({ onFileSelect, isAnalyzing }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [funnyQuote, setFunnyQuote] = useState(TAGALOG_SCANNING_LINES[0]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Pick a fresh random funny quote every time analysis starts
  useEffect(() => {
    if (isAnalyzing) {
      const randomIndex = Math.floor(Math.random() * TAGALOG_SCANNING_LINES.length);
      setFunnyQuote(TAGALOG_SCANNING_LINES[randomIndex]);
    }
  }, [isAnalyzing]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateAndPassFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image (JPG, PNG, WebP) or PDF receipt.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit.');
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => validateAndPassFile(e.target.files?.[0])}
        accept="image/*,application/pdf"
        className="hidden"
        disabled={isAnalyzing}
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => validateAndPassFile(e.target.files?.[0])}
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={isAnalyzing}
      />

      {/* Upload Drag & Drop Container */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        } ${isAnalyzing ? 'opacity-90 pointer-events-none' : ''}`}
      >
        {isAnalyzing ? (
          /* Analyzing State with Funny Tagalog Line */
          <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse shadow-sm shadow-indigo-100">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <div className="absolute -inset-1 rounded-2xl border-2 border-indigo-400/40 animate-ping pointer-events-none" />
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center justify-center gap-1.5">
                <span>{funnyQuote}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-600 font-semibold flex items-center justify-center gap-1.5 pt-0.5">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                <span>The Matalinaw Scan 3.5 is reading receipt...</span>
              </p>
            </div>
          </div>
        ) : (
          /* Idle Upload View */
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                Upload or Snap a Receipt
              </h3>
              <p className="text-sm text-slate-500">
                Drag and drop your receipt image here, or select an option below
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {/* Mobile / Camera Button */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm shadow-indigo-200 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>

              {/* Browse File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 transition-colors shadow-sm cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>Browse Files</span>
              </button>
            </div>

            <div className="pt-2">
              <span className="text-xs text-slate-400">
                Supports JPG, PNG, WebP & PDF up to 15MB
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
