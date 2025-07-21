
'use client';

import { useApp } from "@/lib/provider";
import { useCallback } from "react";

export function useCurrencyFormatter() {
    const { settings } = useApp();

    const formatCurrency = useCallback((amount: number, options?: Intl.NumberFormatOptions) => {
        const defaultOptions: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: 'USD', // Dummy currency, symbol is replaced
            ...options,
        };
        
        return new Intl.NumberFormat(undefined, defaultOptions)
            .format(amount)
            .replace('$', settings.currency);

    }, [settings.currency]);

    return formatCurrency;
}
