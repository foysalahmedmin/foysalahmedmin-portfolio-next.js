"use client";

import { cn } from "@/lib/utils";
import { ArrowBigDownDash, ArrowBigUpDash } from "lucide-react";
import type { ComponentProps } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

// Types
type RangeSliderContextValue = {
  minValue: number;
  maxValue: number;
  minLimit: number;
  maxLimit: number;
  stepSize: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  minInputRef: React.RefObject<HTMLInputElement>;
  maxInputRef: React.RefObject<HTMLInputElement>;
  progressRef: React.RefObject<HTMLDivElement>;
};

type RangeSliderProps = ComponentProps<"div"> & {
  minValue?: number;
  maxValue?: number;
  setMinValue?: (value: number) => void;
  setMaxValue?: (value: number) => void;
  minGap?: number;
  minLimit?: number;
  maxLimit?: number;
  stepSize?: number;
  children: ReactNode;
};

type RangeSliderInputProps = ComponentProps<"div">;

type MinInputProps = ComponentProps<"label">;

type MaxInputProps = ComponentProps<"label">;

// Context
const RangeSliderContext = createContext<RangeSliderContextValue | null>(null);

const useRangeSliderContext = (): RangeSliderContextValue => {
  const context = useContext(RangeSliderContext);
  if (!context) {
    throw new Error(
      "useRangeSliderContext must be used within <RangeSlider />",
    );
  }
  return context;
};

// Main RangeSlider Component
const RangeSliderRoot = ({
  className,
  minValue: minValueProp,
  maxValue: maxValueProp,
  setMinValue: setMinValueProp,
  setMaxValue: setMaxValueProp,
  minGap = 500,
  minLimit = 0,
  maxLimit = 10000,
  stepSize = 100,
  children,
  ...props
}: RangeSliderProps) => {
  const [minValue, setMinValue] = useState<number>(minValueProp ?? minLimit);
  const [maxValue, setMaxValue] = useState<number>(maxValueProp ?? maxLimit);

  const minInputRef = useRef<HTMLInputElement>(null!);
  const maxInputRef = useRef<HTMLInputElement>(null!);
  const progressRef = useRef<HTMLDivElement>(null!);

  const onMinChange = useCallback(
    (value: number) => {
      if (maxValue - value >= minGap) {
        setMinValue(value);
        setMinValueProp?.(value);
      }
    },
    [maxValue, minGap, setMinValueProp],
  );

  const onMaxChange = useCallback(
    (value: number) => {
      if (value - minValue >= minGap) {
        setMaxValue(value);
        setMaxValueProp?.(value);
      }
    },
    [minValue, minGap, setMaxValueProp],
  );

  // Sync external prop changes
  useEffect(() => {
    if (minValueProp !== undefined && maxValue - minValueProp >= minGap) {
      setMinValue(minValueProp);
    }
  }, [minValueProp, maxValue, minGap]);

  useEffect(() => {
    if (maxValueProp !== undefined && maxValueProp - minValue >= minGap) {
      setMaxValue(maxValueProp);
    }
  }, [maxValueProp, minValue, minGap]);

  // Update progress bar position
  useEffect(() => {
    if (progressRef.current && minInputRef.current && maxInputRef.current) {
      const leftPercentage = (minValue / maxLimit) * 100;
      const rightPercentage = 100 - (maxValue / maxLimit) * 100;

      progressRef.current.style.left = `${leftPercentage}%`;
      progressRef.current.style.right = `${rightPercentage}%`;
    }
  }, [minValue, maxValue, maxLimit]);

  const contextValue: RangeSliderContextValue = {
    minValue,
    maxValue,
    minLimit,
    maxLimit,
    stepSize,
    onMinChange,
    onMaxChange,
    minInputRef,
    maxInputRef,
    progressRef,
  };

  return (
    <RangeSliderContext.Provider value={contextValue}>
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    </RangeSliderContext.Provider>
  );
};

// RangeSliderInput Component
const RangeSliderInput = ({ className, ...props }: RangeSliderInputProps) => {
  const {
    minValue,
    maxValue,
    minLimit,
    maxLimit,
    stepSize,
    onMinChange,
    onMaxChange,
    minInputRef,
    maxInputRef,
    progressRef,
  } = useRangeSliderContext();

  const handleMinChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMinChange(Number(e.target.value));
  };

  const handleMaxChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMaxChange(Number(e.target.value));
  };

  return (
    <div className={cn("", className)} {...props}>
      <div className="slider shadow-inner">
        <div ref={progressRef} className="progress" />
      </div>
      <div className="range-input relative">
        <input
          type="range"
          ref={minInputRef}
          className="range-min"
          min={minLimit}
          max={maxLimit}
          value={minValue}
          step={stepSize}
          onChange={handleMinChange}
        />
        <input
          type="range"
          ref={maxInputRef}
          className="range-max"
          min={minLimit}
          max={maxLimit}
          value={maxValue}
          step={stepSize}
          onChange={handleMaxChange}
        />
      </div>
    </div>
  );
};

// MinInput Component
const MinInput = ({ className, ...props }: MinInputProps) => {
  const { minValue, onMinChange } = useRangeSliderContext();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMinChange(Number(e.target.value));
  };

  return (
    <label
      className={cn("inline-flex divide-x rounded-r-none px-2 py-2", className)}
      {...props}
    >
      <span className="inline-block shrink-0 pr-1">
        <ArrowBigDownDash className="size-[1.25em]" strokeWidth={1} />
      </span>
      <input
        type="number"
        className="size-full bg-transparent pl-2 outline-none"
        value={minValue}
        onChange={handleChange}
      />
    </label>
  );
};

// MaxInput Component
const MaxInput = ({ className, ...props }: MaxInputProps) => {
  const { maxValue, onMaxChange } = useRangeSliderContext();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMaxChange(Number(e.target.value));
  };

  return (
    <label
      className={cn("inline-flex divide-x rounded-r-none px-2 py-2", className)}
      {...props}
    >
      <span className="inline-block shrink-0 pr-1">
        <ArrowBigUpDash className="size-[1.25em]" strokeWidth={1} />
      </span>
      <input
        type="number"
        className="size-full bg-transparent pl-2 outline-none"
        value={maxValue}
        onChange={handleChange}
      />
    </label>
  );
};

// Compound Component using Object.assign
const RangeSlider = Object.assign(RangeSliderRoot, {
  Input: RangeSliderInput,
  MinInput,
  MaxInput,
});

// Export types and component
export type {
  MaxInputProps,
  MinInputProps,
  RangeSliderContextValue,
  RangeSliderInputProps,
  RangeSliderProps,
};

export { RangeSlider };
