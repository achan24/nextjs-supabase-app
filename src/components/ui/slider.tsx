"use client"

import * as React from "react"

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${className}`}
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(Number(props.value || 0) / Number(props.max || 100)) * 100}%, #e5e7eb ${(Number(props.value || 0) / Number(props.max || 100)) * 100}%, #e5e7eb 100%)`
        }}
        {...props}
      />
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
