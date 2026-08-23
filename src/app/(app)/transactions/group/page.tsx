'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/provider';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getYear, getMonth, subDays, addDays } from 'date-fns';
import type { Category, Transaction } from '@/lib/types';

// Safe arithmetic evaluator
const evaluateExpression = (expr: string): number | null => {
  try {
    const sanitized = expr.trim();
    if (!sanitized) return null;
    if (/[^0-9+\-*/. ]/.test(sanitized)) return null;
    const result = new Function(`return ${sanitized}`)();
    if (typeof result === 'number' && Number.isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return null;
  } catch {
    return null;
  }
};

// Indian numbering system to words
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanThousand(n: number): string {
  let result = '';
  if (n >= 100) {
    result += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    result += tens[Math.floor(n / 10)] + ' ';
    n %= 10;
  } else if (n >= 10) {
    result += teens[n - 10] + ' ';
    n = 0;
  }
  if (n > 0) {
    result += ones[n] + ' ';
  }
  return result;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees';
  if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = '';
  const numStr = integerPart.toString();

  if (numStr.length > 7) {
    const crore = parseInt(numStr.slice(0, -7), 10);
    result += convertLessThanThousand(crore) + 'Crore ';
  }
  if (numStr.length > 5) {
    const lakh = parseInt(numStr.slice(-7, -5), 10);
    if (lakh > 0) result += convertLessThanThousand(lakh) + 'Lakh ';
  }
  if (numStr.length > 3) {
    const thousand = parseInt(numStr.slice(-5, -3), 10);
    if (thousand > 0) result += convertLessThanThousand(thousand) + 'Thousand ';
  }
  const hundred = parseInt(numStr.slice(-3), 10);
  if (hundred > 0) {
    result += convertLessThanThousand(hundred);
  }

  let words = result.trim() ? result.trim() + ' Rupees' : '';
  if (decimalPart > 0) {
    const decWords = convertLessThanThousand(decimalPart).trim() + ' Paise';
    words = words ? words + ' and ' + decWords : decWords;
  }

  return words.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

interface SplitItem {
  id: string;
  rawAmount: string;
  evaluatedAmount: number;
  expression: string | null;
  description: string;
  category: string;
  subcategory: string;
  microcategory: string;
  notes: string;
}

export default function GroupTransactionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const {
    categories,
    addMultipleTransactions,
    tenants,
    selectedTenantId,
    isMonthLocked,
    settings,
  } = useApp();

  const selectedTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId);
  }, [tenants, selectedTenantId]);

  const paidByOptions = useMemo(() => {
    return selectedTenant?.paidByOptions || [];
  }, [selectedTenant]);

  // Master / Group States
  const [totalAmountInput, setTotalAmountInput] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalExpression, setTotalExpression] = useState<string | null>(null);
  const [groupDescription, setGroupDescription] = useState('');
  const [groupDate, setGroupDate] = useState<Date>(new Date());
  const [groupTime, setGroupTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [paidBy, setPaidBy] = useState<string>('');
  const [groupNotes, setGroupNotes] = useState('');

  // Items State
  const [items, setItems] = useState<SplitItem[]>([
    {
      id: 'item-1',
      rawAmount: '',
      evaluatedAmount: 0,
      expression: null,
      description: '',
      category: '',
      subcategory: '',
      microcategory: '',
      notes: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmMismatchDialog, setShowConfirmMismatchDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Set default paidBy when options load
  useEffect(() => {
    if (!paidBy && paidByOptions.length > 0) {
      const defaultOption = (settings.defaultPaidBy && settings.defaultPaidBy !== 'none')
        ? settings.defaultPaidBy
        : paidByOptions[0];
      setPaidBy(defaultOption || '');
    }
  }, [paidByOptions, settings.defaultPaidBy, paidBy]);

  // Handle total amount change with arithmetic calculation
  const handleTotalAmountChange = (val: string) => {
    setTotalAmountInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setTotalAmount(0);
      setTotalExpression(null);
      return;
    }
    const isExpr = /[+\-*/]/.test(trimmed);
    const evaluated = evaluateExpression(trimmed);
    if (evaluated !== null) {
      setTotalAmount(evaluated);
      setTotalExpression(isExpr ? trimmed : null);
    } else {
      const num = parseFloat(trimmed.replace(/,/g, ''));
      if (!isNaN(num)) {
        setTotalAmount(num);
        setTotalExpression(null);
      }
    }
  };

  // Handle item amount change
  const handleItemAmountChange = (id: string, val: string) => {
    const trimmed = val.trim();
    const isExpr = /[+\-*/]/.test(trimmed);
    const evaluated = evaluateExpression(trimmed);
    const numeric = evaluated !== null ? evaluated : (!isNaN(parseFloat(trimmed)) ? parseFloat(trimmed) : 0);

    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        rawAmount: val,
        evaluatedAmount: numeric,
        expression: isExpr && evaluated !== null ? trimmed : null,
      };
    }));
  };

  // Helper to update specific item field
  const updateItem = (id: string, updates: Partial<SplitItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };

      // If category changes and current subcategory is not in new category, reset subcategory
      if (updates.category && updates.category !== item.category) {
        const catObj = categories.find(c => c.name === updates.category);
        const hasSub = catObj?.subcategories.some(s => s.name === item.subcategory);
        if (!hasSub) {
          updated.subcategory = catObj?.subcategories[0]?.name || '';
          updated.microcategory = '';
        }
      }

      // If subcategory changes, reset microcategory if not in subcategory
      if (updates.subcategory && updates.subcategory !== item.subcategory) {
        const catObj = categories.find(c => c.name === (updates.category || item.category));
        const subObj = catObj?.subcategories.find(s => s.name === updates.subcategory);
        const hasMicro = subObj?.microcategories?.some(m => m.name === item.microcategory);
        if (!hasMicro) {
          updated.microcategory = '';
        }
      }

      return updated;
    }));
  };

  // Add a new item
  const addItem = (customAmount?: number) => {
    const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const remaining = totalAmount - totalAllocated;
    const initialAmount = customAmount !== undefined
      ? customAmount
      : (remaining > 0 ? remaining : '');

    const defaultCat = settings.defaultCategory && settings.defaultCategory !== 'none' ? settings.defaultCategory : (categories[0]?.name || '');
    const catObj = categories.find(c => c.name === defaultCat);
    const defaultSub = settings.defaultSubcategory && settings.defaultSubcategory !== 'none' ? settings.defaultSubcategory : (catObj?.subcategories[0]?.name || '');

    setItems(prev => [
      ...prev,
      {
        id: newId,
        rawAmount: initialAmount !== '' ? String(initialAmount) : '',
        evaluatedAmount: typeof initialAmount === 'number' ? initialAmount : 0,
        expression: null,
        description: '',
        category: defaultCat,
        subcategory: defaultSub,
        microcategory: '',
        notes: '',
      },
    ]);
  };

  // Duplicate an existing item
  const duplicateItem = (itemToDup: SplitItem) => {
    const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setItems(prev => [
      ...prev,
      {
        ...itemToDup,
        id: newId,
        description: itemToDup.description ? `${itemToDup.description} (Copy)` : '',
      },
    ]);
  };

  // Delete an item
  const deleteItem = (id: string) => {
    if (items.length <= 1) {
      toast({
        title: 'Cannot delete',
        description: 'At least one transaction item is required.',
        variant: 'destructive',
      });
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculation Metrics
  const totalAllocated = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number.isFinite(item.evaluatedAmount) ? item.evaluatedAmount : 0), 0);
  }, [items]);

  const remainingBalance = useMemo(() => {
    return Math.round((totalAmount - totalAllocated) * 100) / 100;
  }, [totalAmount, totalAllocated]);

  const isBalanced = useMemo(() => {
    return totalAmount > 0 && Math.abs(remainingBalance) < 0.01;
  }, [totalAmount, remainingBalance]);

  // Is selected month locked?
  const isSelectedMonthLocked = useMemo(() => {
    if (!groupDate) return false;
    const year = getYear(groupDate);
    const month = getMonth(groupDate);
    return isMonthLocked(year, month);
  }, [groupDate, isMonthLocked]);

  // Reset form
  const resetForm = () => {
    setTotalAmountInput('');
    setTotalAmount(0);
    setTotalExpression(null);
    setGroupDescription('');
    setGroupDate(new Date());
    setGroupTime(format(new Date(), 'HH:mm'));
    setGroupNotes('');
    setItems([
      {
        id: `item-${Date.now()}`,
        rawAmount: '',
        evaluatedAmount: 0,
        expression: null,
        description: '',
        category: '',
        subcategory: '',
        microcategory: '',
        notes: '',
      },
    ]);
  };

  // Build final transaction description
  // Requirement: "prefix saying top total amount rs and desc. then current trans and description."
  const buildFinalDescription = useCallback((item: SplitItem): string => {
    const topDesc = groupDescription.trim();
    const formattedTotal = totalAmount > 0 ? formatCurrency(totalAmount) : '';
    const itemDesc = item.description.trim() || item.subcategory || item.category || 'Item';
    const itemExpr = item.expression ? ` (${item.expression})` : '';

    if (topDesc && formattedTotal) {
      return `${topDesc} (${formattedTotal}) - ${itemDesc}${itemExpr}`;
    } else if (topDesc) {
      return `${topDesc} - ${itemDesc}${itemExpr}`;
    } else if (formattedTotal) {
      return `Group ${formattedTotal} - ${itemDesc}${itemExpr}`;
    } else {
      return `${itemDesc}${itemExpr}`;
    }
  }, [groupDescription, totalAmount, formatCurrency]);

  // Prepare submission data and save
  const executeSave = async () => {
    if (isSelectedMonthLocked) {
      toast({
        title: 'Month Locked',
        description: 'The selected month is locked. Transactions cannot be added.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTenantId) {
      toast({
        title: 'No Tenant Selected',
        description: 'Please select a household/tenant first.',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.evaluatedAmount || item.evaluatedAmount <= 0) {
        toast({
          title: `Item #${i + 1} Missing Amount`,
          description: 'Each item must have an amount greater than zero.',
          variant: 'destructive',
        });
        return;
      }
      if (!item.category) {
        toast({
          title: `Item #${i + 1} Missing Category`,
          description: 'Please select a category for each item.',
          variant: 'destructive',
        });
        return;
      }
      if (!item.subcategory) {
        toast({
          title: `Item #${i + 1} Missing Subcategory`,
          description: 'Please select a subcategory for each item.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const dateStr = format(groupDate, 'yyyy-MM-dd');
      const timeStr = groupTime || format(new Date(), 'HH:mm');
      const chosenPaidBy = paidBy || paidByOptions[0] || 'Cash';

      const transactionsToCreate: Omit<Transaction, 'id' | 'tenantId' | 'userId'>[] = items.map(item => {
        const catObj = categories.find(c => c.name === item.category);
        const subObj = catObj?.subcategories.find(s => s.name === item.subcategory);
        const microObj = subObj?.microcategories?.find(m => m.name === item.microcategory);

        const finalDesc = buildFinalDescription(item);
        const combinedNotes = [
          groupNotes.trim() ? `Group: ${groupNotes.trim()}` : null,
          item.notes.trim() ? item.notes.trim() : null,
        ].filter(Boolean).join(' | ');

        return {
          date: dateStr,
          time: timeStr,
          description: finalDesc,
          amount: item.evaluatedAmount,
          categoryId: catObj?.id || '',
          subcategoryId: subObj?.id || '',
          microcategoryId: microObj?.id || '',
          category: item.category,
          subcategory: item.subcategory,
          microcategory: item.microcategory || '',
          paidBy: chosenPaidBy,
          notes: combinedNotes,
        };
      });

      await addMultipleTransactions(transactionsToCreate);

      toast({
        title: 'Group Transactions Saved!',
        description: `Successfully created ${transactionsToCreate.length} transactions totaling ${formatCurrency(totalAllocated)}.`,
      });

      router.push('/transactions');
    } catch (error: any) {
      console.error('Error saving group transactions:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save group transactions.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmMismatchDialog(false);
    }
  };

  const handleSaveClick = () => {
    // If total amount was entered and there is a mismatch, prompt confirmation
    if (totalAmount > 0 && Math.abs(remainingBalance) >= 0.01) {
      setShowConfirmMismatchDialog(true);
      return;
    }
    executeSave();
  };

  const chipRadioClasses = "cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground";

  return (
    <div className="flex flex-col gap-6 pb-28 sm:pb-20 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={() => router.push('/transactions')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Group Transactions</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Enter a bulk purchase amount and split it across multiple categories with smart descriptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowResetDialog(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* MASTER / TOP SECTION: Total Amount & Group Info */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Group Purchase Details</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Step 1: Total & Store Info
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Enter the total bill amount and store/merchant description.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Top Amount & Description Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Amount Input with Calculator */}
            <div className="space-y-1.5">
              <Label htmlFor="totalAmount" className="text-sm font-semibold flex items-center justify-between">
                <span>Total Bill Amount ({settings.currency})</span>
                {totalExpression && (
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                    = {formatCurrency(totalAmount)}
                  </Badge>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="totalAmount"
                  type="text"
                  inputMode="text"
                  placeholder="e.g. 1000 or 500+250+250"
                  value={totalAmountInput}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  className="text-lg sm:text-xl font-bold h-11 tracking-tight"
                />
              </div>
              {totalAmount > 0 && (
                <p className="text-[11px] text-muted-foreground italic truncate">
                  {numberToWords(totalAmount)}
                </p>
              )}
            </div>

            {/* Store / Merchant / Group Description */}
            <div className="space-y-1.5">
              <Label htmlFor="groupDescription" className="text-sm font-semibold">
                Store / Purchase Description
              </Label>
              <Input
                id="groupDescription"
                placeholder="e.g. DMart Supermarket, Monthly Groceries, Amazon"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">
                Will prefix each item (e.g. <span className="font-medium text-foreground">{groupDescription ? `${groupDescription} (${totalAmount > 0 ? formatCurrency(totalAmount) : '₹Total'}) - Milk` : 'DMart (₹1,000) - Milk'}</span>)
              </p>
            </div>
          </div>

          {/* Date, Time, and Paid By Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Date Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Date</Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setGroupDate(prev => subDays(prev, 1))}
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 px-2.5 text-xs font-normal justify-between"
                    >
                      <span>{format(groupDate, 'MMM dd, yyyy')}</span>
                      <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={groupDate}
                      onSelect={(d) => d && setGroupDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setGroupDate(prev => addDays(prev, 1))}
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Time Picker */}
            <div className="space-y-1.5">
              <Label htmlFor="groupTime" className="text-xs font-medium text-muted-foreground">Time</Label>
              <Input
                id="groupTime"
                type="time"
                value={groupTime}
                onChange={(e) => setGroupTime(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Paid By Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Paid By</Label>
              <RadioGroup
                value={paidBy}
                onValueChange={setPaidBy}
                className="flex flex-wrap gap-1.5 pt-0.5"
              >
                {paidByOptions.map((option) => (
                  <div key={option}>
                    <RadioGroupItem value={option} id={`group-paidby-${option}`} className="sr-only peer" />
                    <Label
                      htmlFor={`group-paidby-${option}`}
                      className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs uppercase font-medium transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LIVE ALLOCATION SUMMARY BAR */}
      <Card className={cn(
        "border shadow-sm transition-colors",
        isBalanced ? "border-emerald-500/40 bg-emerald-500/5" :
        remainingBalance > 0 ? "border-amber-500/40 bg-amber-500/5" :
        "border-rose-500/40 bg-rose-500/5"
      )}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : remainingBalance > 0 ? (
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {isBalanced ? 'Fully Balanced' : remainingBalance > 0 ? 'Unallocated Amount' : 'Overallocated Amount'}
                  </span>
                  <Badge
                    variant={isBalanced ? "default" : remainingBalance > 0 ? "secondary" : "destructive"}
                    className={cn(
                      "text-xs font-semibold",
                      isBalanced && "bg-emerald-600 hover:bg-emerald-600 text-white"
                    )}
                  >
                    {isBalanced ? '✓ 100% Split' : `${formatCurrency(Math.abs(remainingBalance))} ${remainingBalance > 0 ? 'left' : 'over'}`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total Bill: <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span> &bull;
                  Allocated: <span className="font-semibold text-foreground">{formatCurrency(totalAllocated)}</span> across {items.length} item{items.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {remainingBalance > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addItem(remainingBalance)}
                  className="text-xs border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Remaining ({formatCurrency(remainingBalance)})
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => addItem()}
                className="text-xs"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ITEMS SECTION: SPLIT TRANSACTIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Split Items ({items.length})</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem()}
            className="text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>

        {items.map((item, index) => {
          const catObj = categories.find(c => c.name === item.category);
          const subcategories = catObj?.subcategories || [];
          const subObj = subcategories.find(s => s.name === item.subcategory);
          const microcategories = subObj?.microcategories || [];
          const previewDesc = buildFinalDescription(item);

          return (
            <Card key={item.id} className="relative overflow-hidden border shadow-sm transition-all hover:border-primary/40">
              {/* Item Header */}
              <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
                    #{index + 1}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    {item.description || item.subcategory || item.category || 'New Item'}
                  </span>
                  {item.evaluatedAmount > 0 && (
                    <Badge variant="secondary" className="font-semibold text-xs text-primary">
                      {formatCurrency(item.evaluatedAmount)}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => duplicateItem(item)}
                    title="Duplicate Item"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteItem(item.id)}
                    disabled={items.length <= 1}
                    title="Delete Item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Amount and Description Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Item Amount Input */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Item Amount ({settings.currency})</span>
                      {item.expression && (
                        <span className="text-[10px] font-mono text-primary">
                          = {formatCurrency(item.evaluatedAmount)}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="text"
                        placeholder="e.g. 60 or 100+50+240"
                        value={item.rawAmount}
                        onChange={(e) => handleItemAmountChange(item.id, e.target.value)}
                        className="font-bold text-base h-10 tracking-tight"
                      />
                    </div>
                    {item.evaluatedAmount > 0 && (
                      <p className="text-[10px] text-muted-foreground italic truncate">
                        {numberToWords(item.evaluatedAmount)}
                      </p>
                    )}
                  </div>

                  {/* Item Description / Name */}
                  <div className="sm:col-span-8 space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Item Name / Specific Description
                    </Label>
                    <Input
                      placeholder="e.g. Milk, Fruits, Nonveg, Cleaning supplies..."
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Category Selection Chips */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    1. Select Category
                  </Label>
                  <RadioGroup
                    value={item.category}
                    onValueChange={(val) => updateItem(item.id, { category: val })}
                    className="flex flex-wrap gap-1.5"
                  >
                    {categories.map((cat) => (
                      <div key={cat.id}>
                        <RadioGroupItem value={cat.name} id={`cat-${item.id}-${cat.id}`} className="sr-only peer" />
                        <Label htmlFor={`cat-${item.id}-${cat.id}`} className={chipRadioClasses}>
                          {cat.name}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Subcategory Selection Chips */}
                {item.category && subcategories.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      2. Select Subcategory ({item.category})
                    </Label>
                    <RadioGroup
                      value={item.subcategory}
                      onValueChange={(val) => updateItem(item.id, { subcategory: val })}
                      className="flex flex-wrap gap-1.5"
                    >
                      {subcategories.map((sub) => (
                        <div key={sub.id}>
                          <RadioGroupItem value={sub.name} id={`sub-${item.id}-${sub.id}`} className="sr-only peer" />
                          <Label htmlFor={`sub-${item.id}-${sub.id}`} className={chipRadioClasses}>
                            {sub.name}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Microcategory Selection Chips (if any) */}
                {item.subcategory && microcategories.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      3. Select Micro Category (Optional)
                    </Label>
                    <RadioGroup
                      value={item.microcategory}
                      onValueChange={(val) => updateItem(item.id, { microcategory: val })}
                      className="flex flex-wrap gap-1.5"
                    >
                      <div>
                        <RadioGroupItem value="" id={`micro-${item.id}-none`} className="sr-only peer" />
                        <Label htmlFor={`micro-${item.id}-none`} className={chipRadioClasses}>
                          None
                        </Label>
                      </div>
                      {microcategories.map((micro) => (
                        <div key={micro.id}>
                          <RadioGroupItem value={micro.name} id={`micro-${item.id}-${micro.id}`} className="sr-only peer" />
                          <Label htmlFor={`micro-${item.id}-${micro.id}`} className={chipRadioClasses}>
                            {micro.name}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Final Description Live Preview */}
                <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-muted/20 p-2.5 rounded-md">
                  <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <span className="font-semibold text-foreground/80 shrink-0">Saved as:</span>
                    <span className="font-mono text-primary font-medium truncate">{previewDesc}</span>
                  </div>
                  <div className="shrink-0 text-muted-foreground text-[11px]">
                    {item.category}{item.subcategory ? ` › ${item.subcategory}` : ''}{item.microcategory ? ` › ${item.microcategory}` : ''}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add Another Item Button Bottom */}
        <Button
          type="button"
          variant="outline"
          onClick={() => addItem()}
          className="w-full py-5 border-dashed border-2 hover:border-primary text-sm font-medium gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Another Split Item
        </Button>
      </div>

      {/* STICKY BOTTOM ACTION BAR (OPTIMIZED FOR MOBILE & DESKTOP) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Total Split:</span>
              <span className="text-sm sm:text-base font-bold text-foreground">
                {formatCurrency(totalAllocated)}
              </span>
              {totalAmount > 0 && (
                <span className="text-xs text-muted-foreground">
                  / {formatCurrency(totalAmount)}
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''} &bull;{' '}
              {isBalanced ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Balanced</span>
              ) : remainingBalance > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(remainingBalance)} remaining</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(Math.abs(remainingBalance))} over</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex text-xs cursor-pointer"
              onClick={() => router.push('/transactions')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveClick}
              disabled={isSubmitting || isSelectedMonthLocked || items.length === 0}
              className="px-4 sm:px-6 font-semibold text-xs sm:text-sm h-10 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save Group (${items.length})`
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm Mismatch Alert Dialog */}
      <AlertDialog open={showConfirmMismatchDialog} onOpenChange={setShowConfirmMismatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Allocation Mismatch
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                The total bill amount is <strong>{formatCurrency(totalAmount)}</strong>, but the sum of your {items.length} split items is <strong>{formatCurrency(totalAllocated)}</strong>.
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                Difference: {formatCurrency(Math.abs(remainingBalance))} {remainingBalance > 0 ? 'unallocated' : 'overallocated'}.
              </p>
              <p>
                Do you want to proceed and save these {items.length} transactions as they are?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back & Adjust</AlertDialogCancel>
            <AlertDialogAction onClick={executeSave}>
              Save Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Reset Alert Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Group Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all entered amounts, store descriptions, and split items. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { resetForm(); setShowResetDialog(false); }}>
              Reset Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
