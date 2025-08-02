'use client';

import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/lib/provider';

interface UseCurrencyInputProps {
  initialValue?: number | string;
  onValueChange?: (value: number) => void;
}

export function useCurrencyInput({ initialValue = 0, onValueChange }: UseCurrencyInputProps) {
  const { settings } = useApp();
  
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

  const parse = useCallback((value: string): number => {
    const { group, decimal } = localeParts;
    let cleanValue = value.replace(new RegExp(`\\${group}`, 'g'), '');
    cleanValue = cleanValue.replace(new RegExp(`\\${decimal}`), '.');
    return parseFloat(cleanValue) || 0;
  }, [localeParts]);
  
  const format = useCallback((num: number): string => {
      if (isNaN(num)) return '';
      const formatter = new Intl.NumberFormat(settings.locale, {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 20, // Allow many decimal places during input
      });
      return formatter.format(num);
  }, [settings.locale]);

  const [formattedValue, setFormattedValue] = useState<string>('');
  const [numericValue, setNumericValue] = useState<number | null>(null);

  const handleInputChange = useCallback((value: string) => {
    const { decimal } = localeParts;
    // Allow only numbers and the locale's decimal separator
    const numericString = value.replace(new RegExp(`[^0-9\\${decimal}]`, 'g'), '');
    
    // Split into integer and fraction parts
    const parts = numericString.split(decimal);
    const integerPart = parts[0];
    const fractionPart = parts.length > 1 ? parts.slice(1).join('') : '';

    const parsedInteger = parseInt(integerPart, 10);
    const formattedInteger = isNaN(parsedInteger) ? '' : format(parsedInteger);

    let finalFormattedValue = formattedInteger;
    if (parts.length > 1) {
        finalFormattedValue += decimal + fractionPart;
    }

    setFormattedValue(finalFormattedValue);
    
    // Also update the numeric value for the form
    const parsed = parse(finalFormattedValue);
    setNumericValue(isNaN(parsed) ? null : parsed);
    if(onValueChange) {
        onValueChange(isNaN(parsed) ? 0 : parsed);
    }
  }, [localeParts, format, parse, onValueChange]);

  useEffect(() => {
    const initialNumeric = typeof initialValue === 'string' ? parse(initialValue) : initialValue;
    if (initialNumeric !== null && !isNaN(initialNumeric)) {
        setFormattedValue(format(initialNumeric));
        setNumericValue(initialNumeric);
    } else {
        setFormattedValue('');
        setNumericValue(null);
    }
  }, [initialValue, format, parse]);

  return {
    formattedValue,
    numericValue,
    handleInputChange,
  };
}
