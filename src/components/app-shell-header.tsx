
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChevronsUpDown, Check, PlusCircle, Download } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/lib/provider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import AddTransactionSheet from './transactions/add-transaction-sheet';
import { ThemeSelector } from './theme-selector';
import Papa from 'papaparse';
import { format, parseISO, startOfMonth } from 'date-fns';

const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, 'label': 'August' }, { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' }
];

export function AppShellHeader() {
  const { 
    tenants, selectedTenantId, setSelectedTenantId, loadingTenants, isRootUser,
    selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, availableYears,
    filteredTransactions, categories
  } = useApp();
  const [tenantPopoverOpen, setTenantPopoverOpen] = useState(false);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  const handleDownloadCsv = () => {
    const firstPaidBy = selectedTenant?.paidByOptions?.[0] || '';
    
    const budgetData = categories
        .map(cat => ({
            name: cat.name,
            budget: cat.budget || 0
        }))
        .filter(cat => cat.budget > 0)
        .map(cat => ({
            'Date': format(startOfMonth(new Date(selectedYear, selectedMonth)), 'd-MMM-yy'),
            'Cate': 'Income',
            'sub': cat.name,
            'Amount': cat.budget.toFixed(2),
            'Paid by': firstPaidBy,
            'Desc': '',
            'Notes': '',
            '': '',
            ' ': '',
        }));

    const transactionData = filteredTransactions.map(t => ({
      'Date': format(parseISO(t.date), 'd-MMM-yy'),
      'Cate': t.category,
      'sub': t.subcategory,
      'Amount': t.amount.toFixed(2),
      'Paid by': t.paidBy,
      'Desc': t.description,
      'Notes': t.notes || '',
      '': '',
      ' ': '',
    }));
    
    const dataToExport = [...budgetData, ...transactionData];

    if (dataToExport.length === 0) return;

    const csv = Papa.unparse(dataToExport, { header: false });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const monthName = months.find(m => m.value === selectedMonth)?.label;
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions-${monthName}-${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b gap-4 flex-wrap">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
       <div className="flex flex-wrap items-center gap-2">
           <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Button onClick={handleDownloadCsv} variant="outline" disabled={filteredTransactions.length === 0 && !categories.some(c => c.budget)}>
            <Download className="mr-2" />
            Download
          </Button>
          <AddTransactionSheet>
            <Button disabled={!selectedTenantId}>
              <PlusCircle className="mr-2" />
              Add Transaction
            </Button>
          </AddTransactionSheet>
        </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <ThemeSelector />
        {isRootUser && (
          <Popover open={tenantPopoverOpen} onOpenChange={setTenantPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={tenantPopoverOpen}
                className="w-[200px] justify-between"
                disabled={loadingTenants}
              >
                {selectedTenant ? selectedTenant.name : "Select tenant..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search tenant..." />
                <CommandList>
                  <CommandEmpty>No tenant found.</CommandEmpty>
                  <CommandGroup>
                    {tenants.map((tenant) => (
                      <CommandItem
                        key={tenant.id}
                        value={tenant.id}
                        onSelect={(currentValue) => {
                          setSelectedTenantId(currentValue);
                          setTenantPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTenantId === tenant.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tenant.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
