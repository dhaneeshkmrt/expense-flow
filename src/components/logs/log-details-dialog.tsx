
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AuditLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface LogDetailsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  log: AuditLog;
}

const JsonViewer = ({ title, data }: { title: string, data?: string }) => {
    if (!data) return null;
    let parsedData;
    try {
        parsedData = JSON.stringify(JSON.parse(data), null, 2);
    } catch {
        parsedData = "Invalid JSON data";
    }

    return (
        <div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
                {parsedData}
            </pre>
        </div>
    )
}

export default function LogDetailsDialog({ open, setOpen, log }: LogDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Log Details</DialogTitle>
          <DialogDescription>
            {log.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">User:</span> {log.userId}</div>
            <div><span className="font-semibold">Timestamp:</span> {format(parseISO(log.timestamp), 'PPP, p')}</div>
            <div><span className="font-semibold">Operation:</span> {log.operationType}</div>
            <div><span className="font-semibold">Collection:</span> {log.collectionName}</div>
            <div className="col-span-2"><span className="font-semibold">Document ID:</span> {log.docId}</div>
        </div>
        <ScrollArea className="h-96 w-full mt-4">
            <div className="space-y-4">
                <JsonViewer title="Old Data" data={log.oldData} />
                <JsonViewer title="New Data" data={log.newData} />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
