import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DualHandleSliderProps {
  min?: number;
  max?: number;
  step?: number;
  largeHandleValue: number;
  smallHandleValue: number;
  onLargeHandleChange: (value: number) => void;
  onSmallHandleChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
  formatValue?: (value: number) => string;
}

export const DualHandleSlider: React.FC<DualHandleSliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  largeHandleValue,
  smallHandleValue,
  onLargeHandleChange,
  onSmallHandleChange,
  className,
  disabled = false,
  label,
  formatValue = (value) => `${value}%`
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'large' | 'small' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Convert value to percentage position
  const valueToPercent = useCallback((value: number) => {
    return ((value - min) / (max - min)) * 100;
  }, [min, max]);

  // Convert pixel position to value
  const positionToValue = useCallback((clientX: number) => {
    if (!sliderRef.current) return min;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawValue = min + (percent / 100) * (max - min);
    
    // Round to nearest step
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  // Handle mouse down on handles
  const handleMouseDown = useCallback((handleType: 'large' | 'small', event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    setIsDragging(handleType);
    
    // Calculate offset for smooth dragging
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const currentValue = handleType === 'large' ? largeHandleValue : smallHandleValue;
      const expectedX = rect.left + (valueToPercent(currentValue) / 100) * rect.width;
      setDragOffset(event.clientX - expectedX);
    }
  }, [disabled, largeHandleValue, smallHandleValue, valueToPercent]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || disabled) return;
    
    const newValue = positionToValue(event.clientX - dragOffset);
    
    if (isDragging === 'large') {
      // Large handle movement always moves both handles
      const clampedValue = Math.max(min, Math.min(max, newValue));
      onLargeHandleChange(clampedValue);
      // Small handle follows large handle
      onSmallHandleChange(clampedValue);
    } else if (isDragging === 'small') {
      // Small handle can only move up to large handle position
      const maxAllowed = largeHandleValue;
      const clampedValue = Math.max(min, Math.min(maxAllowed, newValue));
      onSmallHandleChange(clampedValue);
    }
  }, [isDragging, disabled, positionToValue, dragOffset, min, max, largeHandleValue, onLargeHandleChange, onSmallHandleChange]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragOffset(0);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle track clicks
  const handleTrackClick = useCallback((event: React.MouseEvent) => {
    if (disabled || isDragging) return;
    
    const newValue = positionToValue(event.clientX);
    
    // Determine which handle to move based on proximity
    const distanceToLarge = Math.abs(newValue - largeHandleValue);
    const distanceToSmall = Math.abs(newValue - smallHandleValue);
    
    if (distanceToLarge <= distanceToSmall) {
      // Move large handle (and small handle follows)
      const clampedValue = Math.max(min, Math.min(max, newValue));
      onLargeHandleChange(clampedValue);
      onSmallHandleChange(clampedValue);
    } else {
      // Move small handle (constrained by large handle)
      const maxAllowed = largeHandleValue;
      const clampedValue = Math.max(min, Math.min(maxAllowed, newValue));
      onSmallHandleChange(clampedValue);
    }
  }, [disabled, isDragging, positionToValue, largeHandleValue, smallHandleValue, min, max, onLargeHandleChange, onSmallHandleChange]);

  const largeHandlePercent = valueToPercent(largeHandleValue);
  const smallHandlePercent = valueToPercent(smallHandleValue);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Temp: {formatValue(smallHandleValue)}</span>
            <span>•</span>
            <span>Pref: {formatValue(largeHandleValue)}</span>
          </div>
        </div>
      )}
      
      <div
        ref={sliderRef}
        className={cn(
          "relative h-6 cursor-pointer select-none",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleTrackClick}
      >
        {/* Track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          {/* Active range (from 0 to small handle) */}
          <div 
            className="absolute left-0 top-0 h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-150"
            style={{ width: `${smallHandlePercent}%` }}
          />
          {/* Preference range (from small handle to large handle) */}
          <div 
            className="absolute top-0 h-full bg-blue-300 dark:bg-blue-600 rounded-full transition-all duration-150"
            style={{ 
              left: `${smallHandlePercent}%`,
              width: `${largeHandlePercent - smallHandlePercent}%`
            }}
          />
        </div>

        {/* Small Handle (Temporary) */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-gray-800 rounded-full cursor-grab transition-all duration-150 hover:scale-110 shadow-md",
            isDragging === 'small' && "cursor-grabbing scale-110 shadow-lg",
            disabled && "cursor-not-allowed"
          )}
          style={{ left: `${smallHandlePercent}%` }}
          onMouseDown={(e) => handleMouseDown('small', e)}
          title={`Temporary filter: ${formatValue(smallHandleValue)}`}
        />

        {/* Large Handle (Permanent Preference) */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-grab transition-all duration-150 hover:scale-110 shadow-lg",
            isDragging === 'large' && "cursor-grabbing scale-110 shadow-xl",
            disabled && "cursor-not-allowed"
          )}
          style={{ left: `${largeHandlePercent}%` }}
          onMouseDown={(e) => handleMouseDown('large', e)}
          title={`Permanent preference: ${formatValue(largeHandleValue)}`}
        />
      </div>
      
      {/* Legend */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Show top problems only</span>
        <span>Show all problems</span>
      </div>
    </div>
  );
};