
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/lib/provider';

interface UseCurrencyInputProps {
  onValueChange?: (value: number) => void;
}

// --- Number to Words Converter ---
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const thousands = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertGroup(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
    }
    
    if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
    } else if (n >= 10) {
        return result + teens[n - 10] + ' ';
    }

    if (n > 0) {
        result += ones[n] + ' ';
    }

    return result;
}

function numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));
    
    let integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let result = '';
    let i = 0;

    if (integerPart === 0) {
        // No integer part, will be handled later
    } else {
        do {
            const group = integerPart % 1000;
            if (group !== 0) {
                result = convertGroup(group) + thousands[i] + ' ' + result;
            }
            integerPart = Math.floor(integerPart / 1000);
            i++;
        } while (integerPart > 0);
    }

    let finalResult = result.trim();
    if (finalResult.length > 0) {
      finalResult += ' Rupees';
    }

    if (decimalPart > 0) {
        if(finalResult) finalResult += ' and ';
        finalResult += convertGroup(decimalPart).trim() + ' Paise';
    }
    
    // Capitalize first letter of each word
    return finalResult.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
// --- End of Converter ---


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
  
  const [localeParts, setLocaleParts] = useState(getLocaleParts);

  useEffect(() => {
    setLocaleParts(getLocaleParts());
  }, [settings.locale, getLocaleParts]);

  const [formattedValue, setFormattedValue] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<string | null>(null);
  const [amountInWords, setAmountInWords] = useState<string | null>(null);

  const format = useCallback((num: number): string => {
      if (isNaN(num)) return '';
      const formatter = new Intl.NumberFormat(settings.locale, {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      });
      return formatter.format(num);
  }, [settings.locale]);

  const processValue = useCallback((value: string) => {
    const isExpression = /[+\-*/]/.test(value);
    setFormattedValue(value);

    let numericResult: number | null = null;

    if (isExpression) {
      const result = evaluate(value);
      if (result !== null && isFinite(result)) {
        numericResult = result;
        setCalculationResult(format(result));
      } else {
        setCalculationResult(null);
      }
    } else {
      setCalculationResult(null);
      const { decimal, group } = getLocaleParts();
      const cleanValue = value.replace(new RegExp(`\\${group}`, 'g'), '').replace(decimal, '.');
      const parsedValue = parseFloat(cleanValue);
      if (!isNaN(parsedValue)) {
        numericResult = parsedValue;
      }
    }

    if (numericResult !== null) {
        setAmountInWords(numberToWords(numericResult));
        if (onValueChange) {
            onValueChange(numericResult);
        }
    } else {
        setAmountInWords(null);
        if (onValueChange) {
            onValueChange(0);
        }
    }

  }, [onValueChange, format, getLocaleParts]);
  
  const handleBlur = useCallback(() => {
    const currentValue = formattedValue;
    const isExpression = /[+\-*/]/.test(currentValue);

    if (isExpression) {
      const result = evaluate(currentValue);
      if (result !== null && isFinite(result)) {
        setFormattedValue(format(result));
        setCalculationResult(null);
        if (onValueChange) {
          onValueChange(result);
        }
      }
    } else {
      const { decimal, group } = localeParts;
      const cleanValue = currentValue.replace(new RegExp(`\\${group}`, 'g'), '').replace(decimal, '.');
      const numericValue = parseFloat(cleanValue);
      if (!isNaN(numericValue)) {
        setFormattedValue(format(numericValue));
      } else if (currentValue === '') {
        setAmountInWords(null);
      }
    }
  }, [formattedValue, localeParts, onValueChange, format]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    processValue(event.target.value);
  }, [processValue]);
  
  const setValue = useCallback((value: string) => {
    processValue(value);
  }, [processValue]);

  return {
    inputRef,
    formattedValue,
    handleInputChange,
    handleBlur,
    calculationResult,
    setValue,
    amountInWords,
  };
}
