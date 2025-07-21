
'use client';

import { useApp } from "@/lib/provider";
import { useCallback } from "react";

export function useCurrencyFormatter() {
    const { settings } = useApp();

    const formatCurrency = useCallback((amount: number, options?: Intl.NumberFormatOptions) => {
        const defaultOptions: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: 'USD', // This is a dummy value, the actual symbol comes from settings.currency
            ...options,
        };
        
        // Use the locale from settings, fallback to browser default if not set
        const locale = settings.locale || undefined;
        
        // Use a placeholder symbol that is unlikely to appear in the formatted string
        const placeholder = '¤';
        let formatted = new Intl.NumberFormat(locale, { ...defaultOptions, currencyDisplay: 'code' })
            .format(amount)
            .replace(/[A-Z]{3}/, placeholder); // Replace the currency CODE (e.g., USD) with the placeholder

        // Replace the placeholder with the custom currency symbol
        return formatted.replace(placeholder, settings.currency).trim();

    }, [settings.currency, settings.locale]);

    return formatCurrency;
}
