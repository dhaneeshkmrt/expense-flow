
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { addDays, format } from 'date-fns';

import { useApp } from '@/lib/provider';
import type { DateRange } from 'react-day-picker';
import { RankingInfo, rankItem } from '@tanstack/match-sorter-utils';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

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

const MOBILE_TABLE_BREAKPOINT = 768; // pixels

export function DataTable<TData extends { id: string, date: string, amount: number }, TValue>({ columns, data, showFilters = false }: DataTableProps<TData, TValue>) {
  const { categories, tenants, selectedTenantId } = useApp();
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const isMobile = width < MOBILE_TABLE_BREAKPOINT;
  
  const [sorting, setSorting] = React.useState<SortingState>(
    showFilters ? [{ id: 'date', desc: true }] : []
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    subcategory: false,
    microcategory: false,
    paidBy: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const [categoryFilter, setCategoryFilter] = React.useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState<string>('');
  const [microcategoryFilter, setMicrocategoryFilter] = React.useState<string>('');
  const [paidByFilter, setPaidByFilter] = React.useState<string[]>([]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [amountFilter, setAmountFilter] = React.useState('');
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [duplicateIds, setDuplicateIds] = React.useState<Set<string>>(new Set());
  
  const selectedTenant = React.useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId);
  }, [tenants, selectedTenantId]);

  const paidByOptions = React.useMemo(() => {
    return selectedTenant?.paidByOptions || [];
  }, [selectedTenant]);


  React.useEffect(() => {
    if (isMobile) {
      setColumnVisibility({
        subcategory: false,
        microcategory: false,
        paidBy: false,
        categorization: true, // Keep this visible
      });
    } else {
      setColumnVisibility({
        subcategory: false, // hidden column
        microcategory: false, // hidden column
        paidBy: false, // hidden column, as it's now in the amount column
      });
    }
  }, [isMobile]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
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
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },
  });

  React.useEffect(() => {
    if (showDuplicates) {
      const potentialDuplicates = new Map<string, TData[]>();
      table.getRowModel().rows.forEach(row => {
        const key = `${row.original.date}_${row.original.amount.toFixed(2)}`;
        if (!potentialDuplicates.has(key)) {
          potentialDuplicates.set(key, []);
        }
        potentialDuplicates.get(key)!.push(row.original);
      });

      const newDuplicateIds = new Set<string>();
      potentialDuplicates.forEach(group => {
        if (group.length > 1) {
          group.forEach(item => newDuplicateIds.add(item.id));
        }
      });
      setDuplicateIds(newDuplicateIds);
    } else {
      setDuplicateIds(new Set());
    }
  }, [showDuplicates, table.getRowModel().rows]);


  React.useEffect(() => {
    table.getColumn('categorization')?.setFilterValue(categoryFilter && categoryFilter.trim() ? [categoryFilter] : undefined);
  }, [categoryFilter, table]);

  React.useEffect(() => {
    table.getColumn('subcategory')?.setFilterValue(subcategoryFilter && subcategoryFilter.trim() ? [subcategoryFilter] : undefined);
  }, [subcategoryFilter, table]);
  
  React.useEffect(() => {
    table.getColumn('microcategory')?.setFilterValue(microcategoryFilter && microcategoryFilter.trim() ? [microcategoryFilter] : undefined);
  }, [microcategoryFilter, table]);

  React.useEffect(() => {
    const parts = amountFilter.split('-').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    let min: number | undefined;
    let max: number | undefined;

    if (parts.length === 1) {
        min = parts[0];
        max = parts[0];
    } else if (parts.length === 2) {
        min = Math.min(parts[0], parts[1]);
        max = Math.max(parts[0], parts[1]);
    }
    
    table.getColumn('amount')?.setFilterValue((min !== undefined || max !== undefined) ? [min, max] : undefined);
  }, [amountFilter, table]);
  
  React.useEffect(() => {
      table.getColumn('paidBy')?.setFilterValue(paidByFilter.length > 0 ? paidByFilter : undefined);
  }, [paidByFilter, table]);

  React.useEffect(() => {
      table.getColumn('date')?.setFilterValue(dateRange ? dateRange : undefined);
  }, [dateRange, table]);

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
    <div ref={ref}>
       {showFilters && (
        <div className="flex flex-wrap items-center gap-2 py-4">
            <Input
            placeholder="Search all fields..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-xs"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                      Paid By
                      {paidByFilter.length > 0 && <Badge variant="secondary" className="ml-2">{paidByFilter.length}</Badge>}
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by Payer</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {paidByOptions.map(p => (
                      <DropdownMenuCheckboxItem
                          key={p}
                          checked={paidByFilter.includes(p)}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={(checked) => {
                            return checked
                              ? setPaidByFilter((prev) => [...prev, p])
                              : setPaidByFilter((prev) => prev.filter((value) => value !== p))
                          }}
                      >
                          {p.toUpperCase()}
                      </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
                placeholder="e.g. 50 or 50-100"
                value={amountFilter}
                onChange={(event) => setAmountFilter(event.target.value)}
                className="w-48"
            />
            <div className="flex items-center space-x-2">
              <Switch id="duplicates-mode" checked={showDuplicates} onCheckedChange={setShowDuplicates}/>
              <Label htmlFor="duplicates-mode">Find Duplicates</Label>
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
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && 'selected'}
                  data-duplicate={showDuplicates && duplicateIds.has(row.original.id)}
                  className="data-[duplicate=true]:bg-destructive/10"
                >
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
            value={table.getState().pagination.pageSize >= 1000 ? 'all' : `${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
                if (value === 'all') {
                    table.setPageSize(Math.max(table.getFilteredRowModel().rows.length, 1000))
                } else {
                    table.setPageSize(Number(value))
                }
            }}
            >
            <SelectTrigger className="h-8 w-[80px]">
                <SelectValue>
                    {table.getState().pagination.pageSize >= 1000 ? 'Show All' : table.getState().pagination.pageSize}
                </SelectValue>
            </SelectTrigger>
            <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                </SelectItem>
                ))}
                <SelectItem value="all">
                    Show All
                </SelectItem>
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
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            >
            First
            </Button>
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
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            >
            Last
            </Button>
        </div>
      </div>
    </div>
  );
}

    