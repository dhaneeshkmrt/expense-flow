
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/lib/provider';

interface UseCurrencyInputProps {
  initialValue?: number | string;
  onValueChange?: (value: number) => void;
}

// Simple and safe arithmetic evaluation
const evaluate = (expr: string): number | null => {
  try {
    // Only allow numbers and basic operators. This is a simple sanitization.
    if (/[^0-9+\-*/. ]/.test(expr)) {
      return null;
    }
    // Using Function constructor is safer than eval()
    return new Function(`return ${expr}`)();
  } catch (error) {
    return null;
  }
};

export function useCurrencyInput({ onValueChange }: UseCurrencyInputProps) {
  const { settings } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  const getLocaleParts = useCallback(() => {
    const formatter = new Intl.NumberFormat(settings.locale, {
      style: 'decimal',
    });
    const parts = formatter.formatToParts(12345.67);
    const group = parts.find((part) => part.type === 'group')?.value || ',';
    const decimal = parts.find((part) => part.type === 'decimal')?.value || '.';
    return { group, decimal };
  }, [settings.locale]);
  
  const [localeParts, setLocaleParts] = useState(getLocaleParts());

  useEffect(() => {
    setLocaleParts(getLocaleParts());
  }, [settings.locale, getLocaleParts]);

  const [rawValue, setRawValue] = useState<string>('');
  const [formattedValue, setFormattedValue] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<string | null>(null);

  const format = useCallback((num: number): string => {
      if (isNaN(num)) return '';
      const formatter = new Intl.NumberFormat(settings.locale, {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      });
      return formatter.format(num);
  }, [settings.locale]);


  const handleInputChange = useCallback((value: string) => {
    setRawValue(value);
    
    // Check for arithmetic operators
    const isExpression = /[+\-*/]/.test(value);

    if (isExpression) {
      setFormattedValue(value);
      const result = evaluate(value);
      if (result !== null && isFinite(result)) {
        setCalculationResult(format(result));
        if (onValueChange) {
          onValueChange(result);
        }
      } else {
        setCalculationResult(null);
        if (onValueChange) {
          onValueChange(0);
        }
      }
    } else {
      setCalculationResult(null);
      // It's a number, not an expression, so format it as currency
      const { decimal, group } = localeParts;
      const cleanValue = value.replace(new RegExp(`\\${group}`, 'g'), '').replace(decimal, '.');
      const numericValue = parseFloat(cleanValue);
      
      if (!isNaN(numericValue)) {
        setFormattedValue(value); // Keep user's typing
        if (onValueChange) {
          onValueChange(numericValue);
        }
      } else {
        setFormattedValue('');
        if (onValueChange) {
          onValueChange(0);
        }
      }
    }
  }, [localeParts, onValueChange, format]);

  return {
    inputRef,
    formattedValue,
    handleInputChange,
    calculationResult,
  };
}

    