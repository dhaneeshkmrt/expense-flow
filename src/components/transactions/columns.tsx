
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Transaction } from '@/lib/types';
import { ArrowUpDown, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '../ui/badge';
import AddTransactionSheet from './add-transaction-sheet';
import { useApp } from '@/lib/provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';


export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('date'));
      const utcDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
      return <span>{format(utcDate, 'PPP')}</span>;
    },
    filterFn: (row, id, value) => {
      const date = new Date(row.getValue(id));
      const { from, to } = value as DateRange;
      const fromDate = from ? new Date(from.setHours(0, 0, 0, 0)) : undefined;
      const toDate = to ? new Date(to.setHours(23, 59, 59, 999)) : undefined;

      if (fromDate && !toDate) {
        return date >= fromDate;
      } else if (!fromDate && toDate) {
        return date <= toDate;
      } else if (fromDate && toDate) {
        return date >= fromDate && date <= toDate;
      }
      return true;
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => <div className="font-medium">{row.getValue('description')}</div>,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: function AmountCell({ row }) {
      const formatCurrency = useCurrencyFormatter();
      const amount = parseFloat(row.getValue('amount'));
      
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
    },
    filterFn: (row, id, value) => {
      const amount = row.getValue(id) as number;
      const [min, max] = value as [number | undefined, number | undefined];
      
      if (min !== undefined && max !== undefined) {
        return amount >= min && amount <= max;
      }
      if (min !== undefined) {
        return amount >= min;
      }
      if (max !== undefined) {
        return amount <= max;
      }
      return true;
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('category')}</Badge>,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'subcategory',
    header: 'Subcategory',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('subcategory')}</Badge>,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
    {
    accessorKey: 'microcategory',
    header: 'Micro-Subcategory',
    cell: ({ row }) => {
        const microcategory = row.getValue('microcategory') as string;
        return microcategory ? <Badge variant="outline">{microcategory}</Badge> : null;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'paidBy',
    header: 'Paid By',
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const transaction = row.original;
      const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
      const { deleteTransaction } = useApp();

      return (
        <>
          <AddTransactionSheet
            open={isEditSheetOpen}
            setOpen={setIsEditSheetOpen}
            transaction={transaction}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsEditSheetOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Transaction
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Transaction
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this transaction.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTransaction(transaction.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
  },
];
