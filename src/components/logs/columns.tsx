
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AuditLog } from '@/lib/types';
import { ArrowUpDown, Edit, MoreHorizontal, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import LogDetailsDialog from './log-details-dialog';

export const columns: ColumnDef<AuditLog>[] = [
    {
        accessorKey: 'timestamp',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="px-2">
                Timestamp
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="font-medium">
                {format(parseISO(row.getValue('timestamp')), 'dd MMM yyyy, hh:mm:ss a')}
            </div>
        )
    },
    {
        accessorKey: 'userId',
        header: 'User',
        cell: ({ row }) => row.getValue('userId'),
    },
    {
        accessorKey: 'operationType',
        header: 'Operation',
        cell: ({ row }) => {
            const opType = row.getValue('operationType') as string;
            let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
            if (opType === 'CREATE') variant = 'default';
            if (opType === 'DELETE') variant = 'destructive';
            return <Badge variant={variant}>{opType}</Badge>
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
            <div className="text-sm">
                {row.getValue('description')}
            </div>
        ),
    },
    {
        id: 'actions',
        cell: function Actions({ row }) {
            const log = row.original;
            const [dialogOpen, setDialogOpen] = useState(false);

            return (
                <>
                    <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                        <Eye className="mr-2 h-4 w-4"/>
                        Details
                    </Button>
                    <LogDetailsDialog open={dialogOpen} setOpen={setDialogOpen} log={log} />
                </>
            )
        }
    }
];
