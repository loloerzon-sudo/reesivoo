import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

export default function ReceiptViewer({ imageUrl, alt = 'Receipt Preview' }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-slate-300 text-xs">
        <span className="font-medium text-slate-400">Receipt Photo</span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="Reset view"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors ml-1 border-l border-slate-700 pl-2"
            title="Full screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Display Area */}
      <div className="relative flex-1 min-h-[320px] lg:min-h-[500px] flex items-center justify-center p-4 overflow-auto bg-slate-900/90 select-none">
        <img
          src={imageUrl}
          alt={alt}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="max-h-full max-w-full object-contain rounded-lg shadow-xl cursor-grab active:cursor-grabbing pointer-events-auto"
        />
      </div>

      {/* Fullscreen Modal View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6">
          <div className="flex items-center justify-between pb-3 text-white">
            <span className="font-semibold text-sm">Receipt Inspection</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white ml-2"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto">
            <img
              src={imageUrl}
              alt={alt}
              style={{
                transform: `scale(${scale * 1.3}) rotate(${rotation}deg)`,
              }}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
