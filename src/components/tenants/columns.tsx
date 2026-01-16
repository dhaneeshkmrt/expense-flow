
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Tenant } from '@/lib/types';
import { Copy, Edit, MoreHorizontal, Trash2, CheckCircle2 } from 'lucide-react';

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
import { useApp } from '@/lib/provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export const columns = (
    setSelectedTenant: (tenant: Tenant) => void,
    setDialogOpen: (open: boolean) => void
  ): ColumnDef<Tenant>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
        const tenant = row.original;
        return (
            <div className="flex items-center gap-2 font-medium">
                <span>{tenant.name}</span>
                {tenant.isRootUser && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Root User</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
        )
    },
  },
   {
    accessorKey: 'secretToken',
    header: 'Secret Token',
    cell: function Cell({ row }) {
        const { toast } = useToast();
        const token = row.getValue('secretToken') as string;

        const copyToClipboard = () => {
            navigator.clipboard.writeText(token);
            toast({ title: 'Copied!', description: 'Token copied to clipboard.'});
        }
        return (
            <div className="flex items-center gap-2 font-mono text-sm">
                <span>************</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        )
    }
  },
  {
    accessorKey: 'members',
    header: 'Members',
    cell: ({ row }) => {
      const members: Tenant['members'] = row.getValue('members');
      return (
        <div className="flex flex-wrap gap-1">
          {(members || []).map((member, index) => (
            <Badge key={index} variant="secondary">{member.name}</Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const tenant = row.original;
      const { deleteTenant, isRootUser } = useApp();
      
      const handleEdit = () => {
        setSelectedTenant(tenant);
        setDialogOpen(true);
      };

      if (!isRootUser) {
        return null;
      }

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Tenant
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Tenant
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the tenant <strong>{tenant.name}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTenant(tenant.id)}
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
