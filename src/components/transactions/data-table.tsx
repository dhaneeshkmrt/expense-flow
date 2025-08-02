
'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFacetedRowModel,
  getFacetedUniqueValues,
  FilterFn,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useApp } from '@/lib/provider';
import type { DateRange } from 'react-day-picker';
import { RankingInfo, rankItem } from '@tanstack/match-sorter-utils';
import { useCurrencyInput } from '@/hooks/useCurrencyInput';

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  showFilters?: boolean;
}

export function DataTable<TData, TValue>({ columns, data, showFilters = false }: DataTableProps<TData, TValue>) {
  const { categories } = useApp();
  const [sorting, setSorting] = React.useState<SortingState>(
    showFilters ? [{ id: 'date', desc: true }] : []
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('')

  const [categoryFilter, setCategoryFilter] = React.useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState<string>('');
  const [microcategoryFilter, setMicrocategoryFilter] = React.useState<string>('');
  
  const { formattedValue: minAmount, handleInputChange: handleMinAmountChange, numericValue: minAmountNumeric } = useCurrencyInput({});
  const { formattedValue: maxAmount, handleInputChange: handleMaxAmountChange, numericValue: maxAmountNumeric } = useCurrencyInput({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  React.useEffect(() => {
    // Reset all filters when data changes (e.g., global month/year changes)
    table.resetColumnFilters();
    table.setGlobalFilter('');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setMicrocategoryFilter('');
    handleMinAmountChange('');
    handleMaxAmountChange('');
  }, [data, table]);

  React.useEffect(() => {
    if(showFilters) {
      table.getColumn('category')?.setFilterValue(categoryFilter ? [categoryFilter] : undefined);
    }
  }, [categoryFilter, table, showFilters]);

  React.useEffect(() => {
    if(showFilters) {
      table.getColumn('subcategory')?.setFilterValue(subcategoryFilter ? [subcategoryFilter] : undefined);
    }
  }, [subcategoryFilter, table, showFilters]);

  React.useEffect(() => {
    if(showFilters) {
      table.getColumn('microcategory')?.setFilterValue(microcategoryFilter ? [microcategoryFilter] : undefined);
    }
  }, [microcategoryFilter, table, showFilters]);

  React.useEffect(() => {
    const amountColumn = table.getColumn('amount');
    if (amountColumn) {
      const min = minAmountNumeric !== null ? minAmountNumeric : undefined;
      const max = maxAmountNumeric !== null ? maxAmountNumeric : undefined;
      amountColumn.setFilterValue((min !== undefined || max !== undefined) ? [min, max] : undefined);
    }
  }, [minAmountNumeric, maxAmountNumeric, table]);
  
  const subcategories = React.useMemo(() => {
    if (!categoryFilter) return [];
    const category = categories.find((c) => c.name === categoryFilter);
    return category ? category.subcategories : [];
  }, [categoryFilter, categories]);

  const microcategories = React.useMemo(() => {
    if(!subcategoryFilter) return [];
    const subcategory = subcategories.find(s => s.name === subcategoryFilter);
    return subcategory ? (subcategory.microcategories || []) : [];
  }, [subcategoryFilter, subcategories]);

  return (
    <div>
       {showFilters && (
        <div className="flex flex-wrap items-center gap-2 py-4">
            <Input
            placeholder="Search all fields..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-xs"
            />
            <Select value={categoryFilter} onValueChange={(value) => {
            setCategoryFilter(value === 'all' ? '' : value);
            setSubcategoryFilter('');
            setMicrocategoryFilter('');
            }}>
            <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
            <Select value={subcategoryFilter} onValueChange={(value) => {
                setSubcategoryFilter(value === 'all' ? '' : value);
                setMicrocategoryFilter('');
            }} disabled={!categoryFilter}>
            <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Subcategory" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {subcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
            <Select value={microcategoryFilter} onValueChange={(value) => setMicrocategoryFilter(value === 'all' ? '' : value)} disabled={!subcategoryFilter}>
            <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Micro-Sub" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Micros</SelectItem>
                {microcategories.map((micro) => (
                <SelectItem key={micro.id} value={micro.name}>{micro.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
             <div className="flex items-center gap-2">
                <Input
                    type="text"
                    placeholder="Min amount"
                    value={minAmount}
                    onChange={(e) => handleMinAmountChange(e.target.value)}
                    className="w-28"
                />
                <Input
                    type="text"
                    placeholder="Max amount"
                    value={maxAmount}
                    onChange={(e) => handleMaxAmountChange(e.target.value)}
                    className="w-28"
                />
            </div>
        </div>
       )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s) found.
        </div>
        <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
                table.setPageSize(Number(value))
            }}
            >
            <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            >
            Previous
            </Button>
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            >
            Next
            </Button>
        </div>
      </div>
    </div>
  );
}
