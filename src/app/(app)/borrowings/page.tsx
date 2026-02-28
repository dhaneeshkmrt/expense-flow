'use client';

import { useApp } from '@/lib/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, HandCoins, TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle, Trash2, Edit, ArrowUpCircle, ArrowDownCircle, Info } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format, parseISO } from 'date-fns';
import { BorrowingDialog } from '@/components/borrowings/borrowing-dialog';
import { RepaymentDialog } from '@/components/borrowings/repayment-dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Borrowing } from '@/lib/types';

export default function BorrowingsPage() {
  const { borrowings, repayments, getBorrowingStatus, deleteBorrowing, loadingBorrowings } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const [borrowingDialogOpen, setBorrowingDialogOpen] = useState(false);
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);
  const [selectedBorrowingId, setSelectedBorrowingId] = useState<string | null>(null);
  const [editingBorrowing, setEditingBorrowing] = useState<Borrowing | null>(null);

  const stats = useMemo(() => {
    // Logic: Total Lent excludes "Written Off" records as they are technically losses
    const totalLent = borrowings
      .filter(b => b.type === 'Lent' && !b.isClosed && getBorrowingStatus(b) !== 'Written Off')
      .reduce((sum, b) => sum + b.balance, 0);
      
    const totalBorrowed = borrowings.filter(b => b.type === 'Borrowed' && !b.isClosed).reduce((sum, b) => sum + b.balance, 0);
    const activeLentCount = borrowings.filter(b => b.type === 'Lent' && !b.isClosed && getBorrowingStatus(b) !== 'Written Off').length;
    const activeBorrowedCount = borrowings.filter(b => b.type === 'Borrowed' && !b.isClosed).length;
    
    return { totalLent, totalBorrowed, activeLentCount, activeBorrowedCount };
  }, [borrowings, getBorrowingStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Settled': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Active': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Overdue': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Sub-Standard': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'NPA': return 'bg-red-500/10 text-red-500 border-red-500/20 font-bold';
      case 'Written Off': return 'bg-gray-500/10 text-gray-500 border-gray-500/20 grayscale';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleLogRepayment = (id: string) => {
    setSelectedBorrowingId(id);
    setRepaymentDialogOpen(true);
  };

  const handleEditBorrowing = (borrowing: Borrowing) => {
    setEditingBorrowing(borrowing);
    setBorrowingDialogOpen(true);
  };

  if (loadingBorrowings) return <div className="p-8 text-center">Loading borrowings...</div>;

  const lentRecords = borrowings.filter(b => b.type === 'Lent' && getBorrowingStatus(b) !== 'Written Off');
  const borrowedRecords = borrowings.filter(b => b.type === 'Borrowed');
  const writtenOffRecords = borrowings.filter(b => b.type === 'Lent' && getBorrowingStatus(b) === 'Written Off');

  const renderTable = (records: Borrowing[], emptyMessage: string) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((borrowing) => {
              const status = getBorrowingStatus(borrowing);
              const paidPercent = Math.round(((borrowing.amount - borrowing.balance) / borrowing.amount) * 100);
              
              return (
                <TableRow key={borrowing.id} className={cn(borrowing.isClosed && "opacity-60", status === 'Written Off' && "opacity-50 grayscale bg-muted/20")}>
                  <TableCell>
                    <div className="font-medium">{borrowing.contactName}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(borrowing.startDate), 'dd MMM yyyy')}</div>
                  </TableCell>
                  <TableCell>{formatCurrency(borrowing.amount)}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-primary">{formatCurrency(borrowing.balance)}</div>
                    <div className="w-24 mt-1">
                      <Progress value={paidPercent} className="h-1" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn("text-sm", !borrowing.isClosed && !['Active', 'Settled'].includes(status) && "text-destructive font-semibold")}>
                      {format(parseISO(borrowing.dueDate), 'dd MMM yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(status)}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEditBorrowing(borrowing)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!borrowing.isClosed && status !== 'Written Off' && (
                      <Button size="sm" variant="outline" onClick={() => handleLogRepayment(borrowing.id)}>
                        Log Pay
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteBorrowing(borrowing.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="h-8 w-8 opacity-20" />
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Borrowings Dashboard</h1>
          <p className="text-muted-foreground">Track money lent to and borrowed from your network.</p>
        </div>
        <Button onClick={() => { setEditingBorrowing(null); setBorrowingDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Debt
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Receivables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(stats.totalLent)}</div>
            <p className="text-xs text-muted-foreground">Excludes written off losses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Payables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalBorrowed)}</div>
            <p className="text-xs text-muted-foreground">To {stats.activeBorrowedCount} active borrow records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              NPA / Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {formatCurrency(borrowings.filter(b => b.type === 'Lent' && ['NPA', 'Overdue'].includes(getBorrowingStatus(b))).reduce((s, b) => s + b.balance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              Recovery Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLent > 0 ? Math.round(((stats.totalLent - borrowings.filter(b => b.type === 'Lent' && getBorrowingStatus(b) === 'NPA').reduce((s, b) => s + b.balance, 0)) / stats.totalLent) * 100) : 100}%
            </div>
            <Progress value={85} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lent" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="lent">Money Lent</TabsTrigger>
          <TabsTrigger value="borrowed">Money Borrowed</TabsTrigger>
          <TabsTrigger value="writtenoff" className="relative">
            Written Off
            {writtenOffRecords.length > 0 && (
              <Badge className="ml-2 bg-destructive text-destructive-foreground hover:bg-destructive h-4 px-1 min-w-[1rem] flex items-center justify-center text-[10px]">
                {writtenOffRecords.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="lent">
          {renderTable(lentRecords, "No active lending records found.")}
        </TabsContent>

        <TabsContent value="borrowed">
          {renderTable(borrowedRecords, "No borrowing records found.")}
        </TabsContent>

        <TabsContent value="writtenoff">
          <div className="mb-4">
            <AlertCircle className="inline-block mr-2 h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground italic">
              These are debts older than 180 days past due date and are considered non-recoverable losses.
            </span>
          </div>
          {renderTable(writtenOffRecords, "No written-off records found.")}
        </TabsContent>
      </Tabs>

      <BorrowingDialog 
        open={borrowingDialogOpen} 
        setOpen={setBorrowingDialogOpen} 
        borrowing={editingBorrowing} 
      />
      <RepaymentDialog 
        open={repaymentDialogOpen} 
        setOpen={setRepaymentDialogOpen} 
        borrowingId={selectedBorrowingId} 
      />
    </div>
  );
}
