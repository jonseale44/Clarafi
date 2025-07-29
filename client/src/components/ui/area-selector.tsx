import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';

interface AreaSelectorProps {
  imageUrl: string;
  onAreaSelected: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

export function AreaSelector({ imageUrl, onAreaSelected, onCancel }: AreaSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getImageCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!imageRef.current || !containerRef.current) return { x: 0, y: 0 };
    
    const rect = imageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate the scaling factor
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    // Get coordinates relative to the image
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { 
      x: Math.max(0, Math.min(x, imageRef.current.naturalWidth)), 
      y: Math.max(0, Math.min(y, imageRef.current.naturalHeight))
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getImageCoordinates(e.clientX, e.clientY);
    setStartPoint(coords);
    setCurrentPoint(coords);
    setIsSelecting(true);
    setSelectionRect(null);
  }, [getImageCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return;
    e.preventDefault();
    const coords = getImageCoordinates(e.clientX, e.clientY);
    setCurrentPoint(coords);
    
    // Calculate selection rectangle
    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const width = Math.abs(coords.x - startPoint.x);
    const height = Math.abs(coords.y - startPoint.y);
    
    setSelectionRect({ x, y, width, height });
  }, [isSelecting, startPoint, getImageCoordinates]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return;
    e.preventDefault();
    setIsSelecting(false);
    
    const coords = getImageCoordinates(e.clientX, e.clientY);
    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const width = Math.abs(coords.x - startPoint.x);
    const height = Math.abs(coords.y - startPoint.y);
    
    if (width > 10 && height > 10) {
      setSelectionRect({ x, y, width, height });
    }
  }, [isSelecting, startPoint, getImageCoordinates]);

  const handleConfirmSelection = useCallback(() => {
    if (selectionRect) {
      onAreaSelected(selectionRect);
    }
  }, [selectionRect, onAreaSelected]);

  const getDisplayRect = useCallback(() => {
    if (!selectionRect || !imageRef.current) return null;
    
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / imageRef.current.naturalWidth;
    const scaleY = rect.height / imageRef.current.naturalHeight;
    
    return {
      left: selectionRect.x * scaleX,
      top: selectionRect.y * scaleY,
      width: selectionRect.width * scaleX,
      height: selectionRect.height * scaleY,
    };
  }, [selectionRect]);

  const displayRect = getDisplayRect();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Select Area to Capture</h3>
              <p className="text-sm text-gray-600">Click and drag to select the area you want to capture</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div 
            ref={containerRef}
            className="relative inline-block cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsSelecting(false)}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Screenshot to select area from"
              className="max-w-full max-h-[70vh] object-contain"
              draggable={false}
            />
            
            {/* Selection overlay */}
            {displayRect && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20"
                style={{
                  left: `${displayRect.left}px`,
                  top: `${displayRect.top}px`,
                  width: `${displayRect.width}px`,
                  height: `${displayRect.height}px`,
                }}
              />
            )}
            
            {/* Current selection rectangle while dragging */}
            {isSelecting && imageRef.current && (
              <div
                className="absolute border-2 border-blue-400 bg-blue-400 bg-opacity-10"
                style={{
                  left: `${Math.min(startPoint.x, currentPoint.x) * (imageRef.current.getBoundingClientRect().width / imageRef.current.naturalWidth)}px`,
                  top: `${Math.min(startPoint.y, currentPoint.y) * (imageRef.current.getBoundingClientRect().height / imageRef.current.naturalHeight)}px`,
                  width: `${Math.abs(currentPoint.x - startPoint.x) * (imageRef.current.getBoundingClientRect().width / imageRef.current.naturalWidth)}px`,
                  height: `${Math.abs(currentPoint.y - startPoint.y) * (imageRef.current.getBoundingClientRect().height / imageRef.current.naturalHeight)}px`,
                }}
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            disabled={!selectionRect}
            className="ml-2"
          >
            <Check className="h-4 w-4 mr-2" />
            Capture Selected Area
          </Button>
        </div>
      </div>
    </div>
  );
}