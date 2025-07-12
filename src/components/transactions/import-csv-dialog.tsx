
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/lib/provider';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Loader2, UploadCloud } from 'lucide-react';
import { format } from 'date-fns';

type CsvRow = {
  'Date': string;
  'Category': string;
  'Sub Category': string;
  'Amount': string;
  'Paid by': string;
  'Desc': string;
  'Notes'?: string;
};

export default function ImportCsvDialog({ children }: { children: React.ReactNode }) {
  const { addMultipleTransactions, categories, selectedTenantId } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<Omit<Transaction, 'id' | 'tenantId' | 'userId'>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, { subcategories: Map<string, boolean> }>();
    categories.forEach(cat => {
      const subMap = new Map<string, boolean>();
      cat.subcategories.forEach(sub => subMap.set(sub.name.toLowerCase(), true));
      map.set(cat.name.toLowerCase(), { subcategories: subMap });
    });
    return map;
  }, [categories]);

  const parseAmount = (amountStr: string): number => {
    if (!amountStr) return 0;
    // Remove currency symbols (like ??), commas, and whitespace then parse as float
    const cleaned = amountStr.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const parseDate = (dateStr: string): string => {
      // Assuming date is in 'd-MMM-yy' format e.g., '2-Nov-24'
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // Fallback for different parsing if needed
            return format(new Date(), 'yyyy-MM-dd');
        }
        return format(date, 'yyyy-MM-dd');
      } catch {
        return format(new Date(), 'yyyy-MM-dd');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setParsedTransactions([]);
      parseCsv(selectedFile);
    }
  };

  const parseCsv = (csvFile: File) => {
    setIsParsing(true);
    Papa.parse<CsvRow>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validTransactions: Omit<Transaction, 'id' | 'tenantId' | 'userId'>[] = [];
        let importError: string | null = null;

        for (const row of results.data) {
          const categoryName = row['Category']?.trim();
          const subcategoryName = row['Sub Category']?.trim();

          if (!categoryName) {
            continue; // Skip rows without category
          }
          
          validTransactions.push({
            date: parseDate(row['Date']),
            time: '00:00', // Default time
            description: row['Desc'] || 'Imported Transaction',
            amount: parseAmount(row['Amount']),
            category: categoryName,
            subcategory: subcategoryName || 'N/A',
            microcategory: '', // Keep microcategory empty as it's not in the CSV
            paidBy: row['Paid by']?.trim() || 'N/A',
            notes: row['Notes'] || '',
          });
        }
        
        if (importError) {
          setError(importError);
          setParsedTransactions([]);
        } else {
          setParsedTransactions(validTransactions);
        }
        setIsParsing(false);
      },
      error: (err) => {
        setError(`CSV parsing failed: ${err.message}`);
        setIsParsing(false);
      }
    });
  };

  const handleImport = async () => {
    if (!selectedTenantId || parsedTransactions.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      await addMultipleTransactions(parsedTransactions);
      toast({
        title: 'Import Successful',
        description: `${parsedTransactions.length} transactions have been imported.`,
      });
      handleClose();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Import failed: ${errorMessage}`);
      toast({
        title: 'Import Failed',
        description: `An error occurred during the import. ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setParsedTransactions([]);
    setError(null);
    setIsParsing(false);
    setIsImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your transaction data. The format should be: Date, Category, Sub Category, Amount, Paid by, Desc, Notes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isImporting} />
          {isParsing && (
            <div className="flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Parsing file...</span>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Import Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {parsedTransactions.length > 0 && !error && (
            <Alert>
                <UploadCloud className="h-4 w-4" />
                <AlertTitle>Ready to Import</AlertTitle>
                <AlertDescription>
                  Found {parsedTransactions.length} valid transactions. Click the import button to add them.
                </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>Cancel</Button>
          <Button onClick={handleImport} disabled={isImporting || isParsing || parsedTransactions.length === 0 || !!error}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Transactions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
